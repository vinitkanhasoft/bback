import { userRepository } from './user.repository';
import logger from '../../utils/logger';
import { authRepository } from '../auth/auth.repository';
import { CloudinaryUpload } from '../../utils/cloudinaryUpload';
import { CloudinaryCleanup } from '../../utils/cloudinaryCleanup';
import { MESSAGES } from '../../constants/messages.constant';
import { Role } from '../../enums/role.enum';
import { 
  UserCreateInput, 
  UserUpdateInput, 
  PaginationQuery,
  UserListResult,
  UserResponse
} from '../../types/user.types';
import { DEFAULT_ROLE } from '../../constants/roles.constant';

export class UserService {
  async createUser(userData: UserCreateInput): Promise<UserResponse> {
    const { email, role = DEFAULT_ROLE } = userData;
    
    // Check if email already exists
    const existingUser = await userRepository.emailExists(email);
    if (existingUser) {
      throw new Error(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }
    
    // Create user
    const user = await userRepository.create({
      ...userData,
      role
    });
    
    return this.formatUserResponse(user);
  }
  
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    return this.formatUserResponse(user);
  }
  
  async updateUser(userId: string, updateData: UserUpdateInput): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    // If updating email, check if it's already taken by another user
    if (updateData.email) {
      const emailExists = await userRepository.emailExists(updateData.email, userId);
      if (emailExists) {
        throw new Error(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
      }
    }
    
    const updatedUser = await userRepository.updateById(userId, updateData);
    if (!updatedUser) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    return this.formatUserResponse(updatedUser);
  }
  
  async deleteUser(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    // Delete user's avatar from Cloudinary if exists
    if (user.avatar) {
      try {
        await CloudinaryCleanup.deleteImageByUrl(user.avatar);
        logger.info(`✅ Deleted avatar for user ${userId}: ${user.avatar}`);
      } catch (error) {
        logger.error('Failed to delete user avatar:', error);
        // Continue with user deletion even if avatar deletion fails
      }
    }
    
    await userRepository.deleteById(userId);
    logger.info(`✅ User deleted: ${userId}`);
  }
  
  async listUsers(query: {
    page?: number;
    limit?: number;
    role?: Role;
    isActive?: boolean;
    isEmailVerified?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: UserResponse[]; pagination: any }> {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      isEmailVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;
    
    let result: UserListResult;
    
    if (search) {
      result = await userRepository.searchUsers(search, { page, limit, sortBy, sortOrder });
    } else {
      const filter: any = {};
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;
      if (isEmailVerified !== undefined) filter.isEmailVerified = isEmailVerified;
      
      result = await userRepository.findMany(filter, { page, limit, sortBy, sortOrder });
    }
    
    const users = result.users.map(user => this.formatUserResponse(user));
    
    return {
      users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    };
  }
  
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
    byRole: { [key in Role]: number };
  }> {
    return userRepository.getUserStats();
  }
  
  async activateUser(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    await userRepository.activateUser(userId);
  }
  
  async deactivateUser(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    await userRepository.deactivateUser(userId);
  }
  
  async updateUserAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    // Replace old avatar with new one (automatically deletes old)
    const uploadResult = await CloudinaryCleanup.replaceAvatar(
      user.avatar || null,
      file
    );
    
    // Update user with new avatar URL and public ID
    await authRepository.updateAvatar(userId, uploadResult.secureUrl, uploadResult.publicId);
    
    logger.info(`✅ Avatar updated for user ${userId}: ${uploadResult.publicId}`);
    
    return { avatarUrl: uploadResult.secureUrl };
  }
  
  async removeUserAvatar(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    if (!user.avatar) {
      throw new Error('User does not have an avatar');
    }
    
    // Clear avatar using repository method (handles Cloudinary deletion)
    await authRepository.clearAvatar(userId);
    
    logger.info(`✅ Avatar removed for user ${userId}`);
  }
  
  async updateUserProfile(userId: string, updateData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    const updatedUser = await userRepository.updateById(userId, updateData);
    if (!updatedUser) {
      throw new Error(MESSAGES.USER.NOT_FOUND);
    }
    
    return this.formatUserResponse(updatedUser);
  }
  
  async getUsersByRole(role: Role, pagination: PaginationQuery = {}): Promise<{ users: UserResponse[]; pagination: any }> {
    const result = await userRepository.findByRole(role, pagination);
    
    const users = result.users.map(user => this.formatUserResponse(user));
    
    return {
      users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    };
  }
  
  async getActiveUsers(pagination: PaginationQuery = {}): Promise<{ users: UserResponse[]; pagination: any }> {
    const result = await userRepository.findActiveUsers(pagination);
    
    const users = result.users.map(user => this.formatUserResponse(user));
    
    return {
      users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    };
  }
  
  async getInactiveUsers(pagination: PaginationQuery = {}): Promise<{ users: UserResponse[]; pagination: any }> {
    const result = await userRepository.findInactiveUsers(pagination);
    
    const users = result.users.map(user => this.formatUserResponse(user));
    
    return {
      users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    };
  }
  
  private formatUserResponse(user: any): UserResponse {
    return {
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
  }
  
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Extract public ID from Cloudinary URL
      // Example: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/publicId.jpg
      const matches = url.match(/\/upload\/v\d+\/(.+?)\.[a-z]+$/);
      return matches ? matches[1] : null;
    } catch (error) {
      logger.error('Error extracting public ID from URL:', error);
      return null;
    }
  }
}

export const userService = new UserService();
