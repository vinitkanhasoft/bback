import { UserModel, UserDocument } from '../user/user.model';
import { UserCreateInput, UserQuery, UserUpdateInput } from '../../types/user.types';
import logger from '../../utils/logger';

export class AuthRepository {
  async findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email }).select('+password +refreshToken +resetPasswordToken +resetPasswordExpire +verifyEmailToken +verifyEmailExpire');
  }
  
  async findById(userId: string): Promise<UserDocument | null> {
    return UserModel.findById(userId);
  }
  
  async create(userData: UserCreateInput): Promise<UserDocument> {
    const user = new UserModel(userData);
    return user.save();
  }
  
  async updateById(userId: string, updateData: UserUpdateInput): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
  }
  
  async updateRefreshToken(userId: string, refreshToken: string | undefined): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      refreshToken: refreshToken || undefined
    });
  }
  
  async updateLastLogin(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      lastLogin: new Date()
    });
  }
  
  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      verifyEmailToken: token,
      verifyEmailExpire: expiresAt
    });
  }
  
  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return UserModel.findOne({
      verifyEmailToken: token,
      verifyEmailExpire: { $gt: new Date() }
    }).select('+verifyEmailToken +verifyEmailExpire');
  }
  
  async verifyEmail(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      verifyEmailToken: undefined,
      verifyEmailExpire: undefined
    });
  }
  
  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      resetPasswordToken: token,
      resetPasswordExpire: expiresAt
    });
  }
  
  async findByResetToken(token: string): Promise<UserDocument | null> {
    return UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpire +password');
  }
  
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      password: newPassword,
      resetPasswordToken: undefined,
      resetPasswordExpire: undefined
    });
  }
  
  async changePassword(userId: string, newPassword: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      password: newPassword
    });
  }
  
  async deactivateUser(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      isActive: false,
      refreshToken: undefined
    });
  }
  
  async checkEmailExists(email: string): Promise<boolean> {
    const user = await UserModel.findOne({ email });
    return !!user;
  }
  
  async findActiveUserByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ 
      email, 
      isActive: true 
    }).select('+password +refreshToken +resetPasswordToken +resetPasswordExpire +verifyEmailToken +verifyEmailExpire');
  }
  
  async findVerifiedUserByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ 
      email, 
      isActive: true,
      isEmailVerified: true 
    }).select('+password +refreshToken +avatarPublicId');
  }
  
  async updateAvatar(userId: string, avatarUrl: string, avatarPublicId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      avatar: avatarUrl,
      avatarPublicId: avatarPublicId
    });
  }
  
  async updateAvatarWithCleanup(userId: string, oldAvatarUrl: string | null, newAvatarUrl: string, newAvatarPublicId: string): Promise<void> {
    // Get user with current avatar info
    const user = await UserModel.findById(userId).select('+avatarPublicId') as UserDocument;
    if (!user) {
      throw new Error('User not found');
    }
    
    // Delete old avatar from Cloudinary if it exists
    if (user.avatarPublicId) {
      const { CloudinaryCleanup } = await import('../../utils/cloudinaryCleanup');
      try {
        await CloudinaryCleanup.deleteImageByPublicId(user.avatarPublicId);
      } catch (error) {
        logger.warn('Failed to delete old avatar from Cloudinary:', error);
      }
    }
    
    // Update with new avatar
    await this.updateAvatar(userId, newAvatarUrl, newAvatarPublicId);
  }
  
  async clearAvatar(userId: string): Promise<void> {
    const user = await UserModel.findById(userId).select('+avatarPublicId') as UserDocument;
    if (!user) {
      throw new Error('User not found');
    }
    
    // Delete avatar from Cloudinary if it exists
    if (user.avatarPublicId) {
      const { CloudinaryCleanup } = await import('../../utils/cloudinaryCleanup');
      try {
        await CloudinaryCleanup.deleteImageByPublicId(user.avatarPublicId);
      } catch (error) {
        logger.warn('Failed to delete avatar from Cloudinary:', error);
      }
    }
    
    // Clear avatar fields
    await UserModel.findByIdAndUpdate(userId, {
      avatar: null,
      avatarPublicId: null
    });
  }
}

export const authRepository = new AuthRepository();
