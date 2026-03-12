import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { cacheService } from '../utils/cache.service';
import { Role } from '../enums/role.enum';
import { UserModel } from '../modules/user/user.model';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: Role;
        firstName: string;
        lastName: string;
        phone?: string;
        avatar?: string;
        isActive: boolean;
        isEmailVerified: boolean;
        lastLogin?: Date;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await cacheService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    
    if (!decoded || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    // Try to get user from cache first
    let user = await cacheService.getCachedUser(decoded.userId);
    
    if (!user) {
      // If not in cache, fetch from database to get fresh data
      const freshUser = await UserModel.findById(decoded.userId);
      if (!freshUser) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      
      user = {
        userId: freshUser._id.toString(),
        email: freshUser.email,
        role: freshUser.role,
        firstName: freshUser.firstName,
        lastName: freshUser.lastName,
        phone: freshUser.phone,
        avatar: freshUser.avatar,
        isActive: freshUser.isActive,
        isEmailVerified: freshUser.isEmailVerified,
        lastLogin: freshUser.lastLogin
      };
      
      // Cache user data for future requests
      await cacheService.cacheUser(decoded.userId, user, 3600); // 1 hour
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else {
      logger.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Check if token is blacklisted
      const isBlacklisted = await cacheService.isTokenBlacklisted(token);
      if (!isBlacklisted) {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        
        if (decoded && decoded.userId) {
          let user = await cacheService.getCachedUser(decoded.userId);
          
          if (!user) {
            user = {
              userId: decoded.userId,
              email: decoded.email,
              role: decoded.role,
              firstName: decoded.firstName,
              lastName: decoded.lastName,
              phone: decoded.phone,
              avatar: decoded.avatar,
              isActive: decoded.isActive,
              isEmailVerified: decoded.isEmailVerified,
              lastLogin: decoded.lastLogin
            };
            
            await cacheService.cacheUser(decoded.userId, user, 3600);
          }

          if (user.isActive) {
            req.user = user;
          }
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};
