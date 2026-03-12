import { Request, Response } from 'express';
import { userService } from './user.service';
import logger from '../../utils/logger';
import { ApiResponse } from '../../types/api.types';
import { ApiResponseHelper } from '../../utils/apiResponse';
import { Role } from '../../enums/role.enum';
import { 
  CreateUserInput, 
  UpdateUserInput, 
  UpdateProfileInput,
  UserIdInput,
  ListUsersInput
} from './user.validation';

export class UserController {
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserInput = req.body;
      const result = await userService.createUser(userData);
      
      ApiResponseHelper.created(res, 'User created successfully', result);
    } catch (error) {
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
  
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await userService.getUserById(userId);
      
      ApiResponseHelper.success(res, 'User retrieved successfully', result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updateData: UpdateUserInput = req.body;
      const result = await userService.updateUser(userId, updateData);
      
      ApiResponseHelper.success(res, 'User updated successfully', result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else if (error.message.includes('already exists')) {
          ApiResponseHelper.conflict(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      await userService.deleteUser(userId);
      
      ApiResponseHelper.success(res, 'User deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const query: ListUsersInput = req.query as any;
      const result = await userService.listUsers(query);
      
      ApiResponseHelper.pagination(
        res,
        'Users retrieved successfully',
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      ApiResponseHelper.serverError(res);
    }
  }
  
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await userService.getUserStats();
      
      ApiResponseHelper.success(res, 'User statistics retrieved successfully', stats);
    } catch (error) {
      ApiResponseHelper.serverError(res);
    }
  }
  
  async activateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      await userService.activateUser(userId);
      
      ApiResponseHelper.success(res, 'User activated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      await userService.deactivateUser(userId);
      
      ApiResponseHelper.success(res, 'User deactivated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ApiResponseHelper.unauthorized(res, 'User not authenticated');
        return;
      }
      
      if (!req.file) {
        ApiResponseHelper.badRequest(res, 'No file uploaded');
        return;
      }
      
      const result = await userService.updateUserAvatar(userId, req.file);
      
      ApiResponseHelper.success(res, 'Avatar uploaded successfully', result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ApiResponseHelper.unauthorized(res, 'User not authenticated');
        return;
      }
      
      const updateData: UpdateProfileInput = req.body;
      const result = await userService.updateUserProfile(userId, updateData);
      
      ApiResponseHelper.success(res, 'Profile updated successfully', result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.params;
      const query = req.query as any;
      
      if (!Object.values(Role).includes(role as Role)) {
        ApiResponseHelper.badRequest(res, 'Invalid role specified');
        return;
      }
      
      const result = await userService.getUsersByRole(role as Role, query);
      
      ApiResponseHelper.pagination(
        res,
        `Users with role ${role} retrieved successfully`,
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      ApiResponseHelper.serverError(res);
    }
  }
  
  async getActiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const result = await userService.getActiveUsers(query);
      
      ApiResponseHelper.pagination(
        res,
        'Active users retrieved successfully',
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      ApiResponseHelper.serverError(res);
    }
  }
  
  async getInactiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const result = await userService.getInactiveUsers(query);
      
      ApiResponseHelper.pagination(
        res,
        'Inactive users retrieved successfully',
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      ApiResponseHelper.serverError(res);
    }
  }
  
  async updateAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ApiResponseHelper.unauthorized(res, 'User not authenticated');
        return;
      }
      
      if (!req.file) {
        ApiResponseHelper.badRequest(res, 'No file uploaded');
        return;
      }
      
      const result = await userService.updateUserAvatar(userId, req.file);
      
      ApiResponseHelper.success(res, 'Avatar updated successfully', result);
    } catch (error) {
      logger.error('Avatar update error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async removeAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ApiResponseHelper.unauthorized(res, 'User not authenticated');
        return;
      }
      
      await userService.removeUserAvatar(userId);
      
      ApiResponseHelper.success(res, 'Avatar removed successfully');
    } catch (error) {
      logger.error('Avatar removal error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ApiResponseHelper.notFound(res, error.message);
        } else if (error.message.includes('does not have an avatar')) {
          ApiResponseHelper.badRequest(res, error.message);
        } else {
          ApiResponseHelper.badRequest(res, error.message);
        }
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  }
  
  async cleanupOrphanedImages(req: Request, res: Response): Promise<void> {
    try {
      const { folder } = req.params;
      const { publicIds } = req.body;
      
      if (!folder || !publicIds || !Array.isArray(publicIds)) {
        ApiResponseHelper.badRequest(res, 'Folder and publicIds array are required');
        return;
      }
      
      const { CloudinaryCleanup } = await import('../../utils/cloudinaryCleanup');
      const result = await CloudinaryCleanup.cleanupOrphanedImages(folder, publicIds);
      
      ApiResponseHelper.success(res, 'Cleanup completed', {
        cleaned: result.cleaned.length,
        failed: result.orphaned.length,
        details: result
      });
    } catch (error) {
      logger.error('Cleanup error:', error);
      ApiResponseHelper.serverError(res);
    }
  }
}

export const userController = new UserController();
