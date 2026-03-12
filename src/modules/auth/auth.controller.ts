import { Request, Response } from 'express';
import { authService } from './auth.service';
import logger from '../../utils/logger';
import { ApiResponse } from '../../types/api.types';
import { ApiResponseHelper } from '../../utils/apiResponse';
import { AUTH_CONSTANTS } from '../../constants/auth.constant';
import { 
  RegisterInput, 
  LoginInput, 
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ChangePasswordInput
} from './auth.validation';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterInput = req.body;
      const result = await authService.register(userData);
      
      ApiResponseHelper.created(res, result.message);
    } catch (error) {
      logger.error('Registration controller error:', error);
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          ApiResponseHelper.conflict(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginInput = req.body;
      const result = await authService.login(loginData);
      
      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, AUTH_CONSTANTS.COOKIE_OPTIONS);
      
      ApiResponseHelper.success(res, 'Login successful', {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      logger.error('Login controller error:', error);
      if (error instanceof Error) {
        ApiResponseHelper.unauthorized(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshData: RefreshTokenInput = req.body;
      const result = await authService.refreshToken(refreshData);
      
      // Update refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, AUTH_CONSTANTS.COOKIE_OPTIONS);
      
      ApiResponseHelper.success(res, 'Token refreshed successfully', {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      if (error instanceof Error) {
        ApiResponseHelper.unauthorized(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const verifyData: VerifyEmailInput = req.body;
      const result = await authService.verifyEmail(verifyData);
      
      ApiResponseHelper.success(res, result.message);
    } catch (error) {
      if (error instanceof Error) {
        ApiResponseHelper.badRequest(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const forgotData: ForgotPasswordInput = req.body;
      const result = await authService.forgotPassword(forgotData);
      
      ApiResponseHelper.success(res, result.message);
    } catch (error) {
      if (error instanceof Error) {
        ApiResponseHelper.badRequest(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const resetData: ResetPasswordInput = req.body;
      const result = await authService.resetPassword(resetData);
      
      ApiResponseHelper.success(res, result.message);
    } catch (error) {
      if (error instanceof Error) {
        ApiResponseHelper.badRequest(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ApiResponseHelper.unauthorized(res, 'User not authenticated');
        return;
      }
      
      const changeData: ChangePasswordInput = req.body;
      const result = await authService.changePassword(userId, changeData);
      
      ApiResponseHelper.success(res, result.message);
    } catch (error) {
      if (error instanceof Error) {
        ApiResponseHelper.badRequest(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await authService.logout(userId);
      }
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      ApiResponseHelper.success(res, 'Logout successful');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponseHelper.serverError(res, error.message);
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.resendVerificationEmail(email);
      
      ApiResponseHelper.success(res, result.message);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else if (error.message.includes('already verified')) {
          ApiResponseHelper.badRequest(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ApiResponseHelper.unauthorized(res, 'User not authenticated');
        return;
      }
      
      // User data is already attached to request by auth middleware
      const user = req.user!;
      
      ApiResponseHelper.success(res, 'Profile retrieved successfully', {
        _id: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      });
    } catch (error) {
      ApiResponseHelper.serverError(res);
    }
  }
}

export const authController = new AuthController();
