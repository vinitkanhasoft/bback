import { authRepository } from './auth.repository';
import logger from '../../utils/logger';
import { TokenGenerator } from '../../utils/generateToken';
import { EmailSender } from '../../utils/emailSender';
import { MESSAGES } from '../../constants/messages.constant';
import { DEFAULT_ROLE } from '../../constants/roles.constant';
import { Role } from '../../enums/role.enum';
import { UserModel } from '../user/user.model';
import { cacheService } from '../../utils/cache.service';
import { 
  RegisterRequest, 
  LoginRequest, 
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  AuthResponse,
  ChangePasswordInput
} from '../../types/auth.types';
import { UserCreateInput, UserDocument, UserResponse } from '../../types/user.types';

export class AuthService {
  // Test log to verify nodemon restart
  constructor() {
    logger.info('🔄 AuthService initialized - nodemon restart detected!');
  }
  
  async register(userData: RegisterRequest): Promise<{ message: string }> {
    const { email, role = DEFAULT_ROLE } = userData;
    
    logger.info(`User registration attempt: ${email}`);
    
    try {
      // Check if user already exists
      const existingUser = await authRepository.findByEmail(email);
      if (existingUser) {
        logger.warn(`Registration failed - email already exists: ${email}`);
        throw new Error(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
      }
      
      // Create user (password will be hashed by Mongoose pre-save hook)
      const userCreateData: UserCreateInput = {
        ...userData,
        role
      };
      
      const user = await authRepository.create(userCreateData);
      logger.info(`User registered successfully: ${email} (ID: ${user._id})`);
      
      // Generate email verification token
      const verificationToken = TokenGenerator.generateEmailVerificationToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });
      
      // Set verification token and expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await authRepository.setEmailVerificationToken(user._id.toString(), verificationToken, expiresAt);
      
      // Send verification email
      await EmailSender.sendTemplateEmail('verification', user.email, 'Verify Your Email Address', {
        firstName: user.firstName,
        email: user.email,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
        supportUrl: `${process.env.FRONTEND_URL}/support`
      });
      logger.info(`Verification email sent to: ${email}`);
      
      return { message: MESSAGES.AUTH.REGISTER_SUCCESS };
    } catch (error) {
      logger.error(`Registration error for ${email}:`, error);
      throw error;
    }
  }
  
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email } = loginData;
    
    logger.info(`Login attempt for user: ${email}`);
    
    try {
      // Find user by email (active user only)
      const user = await authRepository.findActiveUserByEmail(email);
      
      if (!user) {
        logger.warn(`Login failed - user not found or inactive: ${email}`);
        throw new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
      }
      
      // Check password
      const isPasswordValid = await user.comparePassword(loginData.password);
      
      if (!isPasswordValid) {
        logger.warn(`Login failed - invalid password for user: ${email}`);
        throw new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
      }
      
      logger.info(`Login successful for user: ${email} (ID: ${user._id})`);
      
      // Generate tokens
      const tokenPair = TokenGenerator.generateTokenPair({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });
      
      // Update refresh token and last login
      await Promise.all([
        authRepository.updateRefreshToken(user._id.toString(), tokenPair.refreshToken),
        authRepository.updateLastLogin(user._id.toString())
      ]);
      
      // Clear cached user data to force fresh data on next request
      await cacheService.invalidateUser(user._id.toString());
    
      // Prepare user response (without sensitive data)
      const userResponse: UserResponse = {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      return {
        user: userResponse,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      };
    } catch (error) {
      logger.error(`Login error for user ${email}:`, error);
      throw error;
    }
  }
  
  async refreshToken(refreshData: RefreshTokenRequest): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshData;
    
    logger.info('Token refresh attempt');
    logger.debug(`Refresh token received: ${refreshToken?.substring(0, 20)}...`);
    
    try {
      if (!refreshToken) {
        logger.warn('Token refresh failed - no refresh token provided');
        throw new Error(MESSAGES.AUTH.INVALID_TOKEN);
      }
      
      // Verify refresh token
      let payload;
      try {
        payload = TokenGenerator.verifyRefreshToken(refreshToken);
        logger.debug(`Refresh token verified for user ID: ${payload.userId}`);
      } catch (error) {
        logger.warn('Token refresh failed - invalid refresh token:', error);
        throw new Error(MESSAGES.AUTH.INVALID_TOKEN);
      }
      
      // Find user with refresh token
      const user = await authRepository.findById(payload.userId);
      if (!user) {
        logger.warn(`Token refresh failed - user not found: ${payload.userId}`);
        throw new Error(MESSAGES.AUTH.USER_NOT_FOUND);
      }
      
      // Get user with refresh token field
      const userWithRefreshToken = await UserModel.findById(payload.userId).select('+refreshToken');
      if (!userWithRefreshToken) {
        logger.warn(`Token refresh failed - user not found when fetching refresh token: ${payload.userId}`);
        throw new Error(MESSAGES.AUTH.USER_NOT_FOUND);
      }
      
      if (!userWithRefreshToken.isActive) {
        logger.warn(`Token refresh failed - user inactive: ${userWithRefreshToken.email}`);
        throw new Error(MESSAGES.AUTH.USER_NOT_FOUND);
      }
      
      logger.debug(`User found: ${userWithRefreshToken.email}, stored refresh token exists: ${!!userWithRefreshToken.refreshToken}`);
      
      // Check if refresh token matches stored token
      if (!userWithRefreshToken.refreshToken || userWithRefreshToken.refreshToken !== refreshToken) {
        logger.warn(`Token refresh failed - refresh token mismatch for user: ${userWithRefreshToken.email}`);
        logger.debug(`Expected: ${userWithRefreshToken.refreshToken?.substring(0, 20)}...`);
        logger.debug(`Received: ${refreshToken?.substring(0, 20)}...`);
        throw new Error(MESSAGES.AUTH.INVALID_TOKEN);
      }
      
      // Generate new tokens
      const newTokenPair = TokenGenerator.generateTokenPair({
        userId: userWithRefreshToken._id.toString(),
        email: userWithRefreshToken.email,
        role: userWithRefreshToken.role
      });
      
      // Update refresh token
      await authRepository.updateRefreshToken(userWithRefreshToken._id.toString(), newTokenPair.refreshToken);
      
      // Clear cached user data
      await cacheService.invalidateUser(userWithRefreshToken._id.toString());
      
      logger.info(`Token refreshed successfully for user: ${userWithRefreshToken.email}`);
      
      return {
        accessToken: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }
  
  async verifyEmail(verifyData: VerifyEmailRequest): Promise<{ message: string }> {
    const { token } = verifyData;
    
    logger.info('Email verification attempt');
    
    try {
      // Verify token
      let payload;
      try {
        payload = TokenGenerator.verifyEmailVerificationToken(token);
      } catch (error) {
        logger.warn('Email verification failed - invalid token');
        throw new Error(MESSAGES.AUTH.INVALID_TOKEN);
      }
      
      // Find user by verification token
      const user = await authRepository.findByVerificationToken(token);
      if (!user) {
        logger.warn('Email verification failed - token not found or expired');
        throw new Error(MESSAGES.AUTH.INVALID_TOKEN);
      }
      
      // Verify email
      await authRepository.verifyEmail(user._id.toString());
      
      // Clear cached user data to reflect verification status
      await cacheService.invalidateUser(user._id.toString());
      
      // Send welcome email
      await EmailSender.sendWelcomeEmail(user.email, user.firstName);
      
      logger.info(`Email verified successfully for user: ${user.email}`);
      
      return { message: MESSAGES.AUTH.EMAIL_VERIFIED };
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }
  
  async forgotPassword(forgotData: ForgotPasswordRequest): Promise<{ message: string }> {
    const { email } = forgotData;
    
    logger.info(`Password reset request for: ${email}`);
    
    try {
      // Find user
      const user = await authRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return { message: MESSAGES.AUTH.PASSWORD_RESET_SENT };
      }
      
      // Generate reset token
      const resetToken = TokenGenerator.generatePasswordResetToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });
      
      // Set reset token and expiry
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await authRepository.setPasswordResetToken(user._id.toString(), resetToken, expiresAt);
      
      // Send password reset email
      await EmailSender.sendTemplateEmail('password-reset', user.email, 'Reset Your Password', {
        firstName: user.firstName,
        email: user.email,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        supportUrl: `${process.env.FRONTEND_URL}/support`
      });
      logger.info(`Password reset email sent to: ${email}`);
      
      return { message: MESSAGES.AUTH.PASSWORD_RESET_SENT };
    } catch (error) {
      logger.error(`Password reset error for ${email}:`, error);
      throw error;
    }
  }
  
  async resetPassword(resetData: ResetPasswordRequest): Promise<{ message: string }> {
    const { token, newPassword } = resetData;
    
    logger.info('Password reset attempt');
    
    try {
      // Verify token
      let payload;
      try {
        payload = TokenGenerator.verifyPasswordResetToken(token);
      } catch (error) {
        logger.warn('Password reset failed - invalid token');
        throw new Error(MESSAGES.AUTH.INVALID_RESET_TOKEN);
      }
      
      // Find user by reset token
      const user = await authRepository.findByResetToken(token);
      if (!user) {
        logger.warn('Password reset failed - token not found or expired');
        throw new Error(MESSAGES.AUTH.INVALID_RESET_TOKEN);
      }
      
      // Reset password (will be hashed by Mongoose pre-save hook)
      await authRepository.resetPassword(user._id.toString(), newPassword);
      
      // Clear cached user data
      await cacheService.invalidateUser(user._id.toString());
      
      logger.info(`Password reset successful for user: ${user.email}`);
      
      return { message: MESSAGES.AUTH.PASSWORD_RESET_SUCCESS };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }
  
  async changePassword(userId: string, changeData: ChangePasswordInput): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changeData;
    
    logger.info(`Password change attempt for user ID: ${userId}`);
    
    try {
      // Find user
      const user = await authRepository.findByEmail((await authRepository.findById(userId))?.email || '');
      if (!user) {
        logger.warn(`Password change failed - user not found: ${userId}`);
        throw new Error(MESSAGES.AUTH.USER_NOT_FOUND);
      }
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        logger.warn(`Password change failed - invalid current password for user: ${user.email}`);
        throw new Error('Current password is incorrect');
      }
      
      // Update password (will be hashed by Mongoose pre-save hook)
      await authRepository.changePassword(userId, newPassword);
      
      // Clear cached user data
      await cacheService.invalidateUser(userId);
      
      logger.info(`Password changed successfully for user: ${user.email}`);
      
      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error(`Password change error for user ${userId}:`, error);
      throw error;
    }
  }
  
  async logout(userId: string): Promise<{ message: string }> {
    logger.info(`Logout attempt for user ID: ${userId}`);
    
    try {
      // Clear refresh token
      await authRepository.updateRefreshToken(userId, undefined);
      
      // Clear cached user data
      await cacheService.invalidateUser(userId);
      
      logger.info(`User logged out successfully: ${userId}`);
      
      return { message: MESSAGES.AUTH.LOGOUT_SUCCESS };
    } catch (error) {
      logger.error(`Logout error for user ${userId}:`, error);
      throw error;
    }
  }
  
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    logger.info(`Resend verification email request for: ${email}`);
    
    try {
      // Find user
      const user = await authRepository.findByEmail(email);
      if (!user) {
        logger.warn(`Resend verification failed - user not found: ${email}`);
        throw new Error(MESSAGES.AUTH.USER_NOT_FOUND);
      }
      
      if (user.isEmailVerified) {
        logger.warn(`Resend verification failed - email already verified: ${email}`);
        throw new Error(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED);
      }
      
      // Generate new verification token
      const verificationToken = TokenGenerator.generateEmailVerificationToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });
      
      // Set verification token and expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await authRepository.setEmailVerificationToken(user._id.toString(), verificationToken, expiresAt);
      
      // Send verification email
      await EmailSender.sendVerificationEmail(user.email, verificationToken);
      logger.info(`Verification email resent to: ${email}`);
      
      return { message: 'Verification email sent successfully' };
    } catch (error) {
      logger.error(`Resend verification error for ${email}:`, error);
      throw error;
    }
  }
}

export const authService = new AuthService();
