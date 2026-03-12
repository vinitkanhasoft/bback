import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { Role } from '../enums/role.enum';

// Extend Request interface to include route metadata
declare global {
  namespace Express {
    interface Request {
      routeType?: string;
      accessLevel?: 'public' | 'protected' | 'private' | 'admin';
    }
  }
}

export interface RoutePermissions {
  public?: boolean;
  authenticated?: boolean;
  roles?: Role[];
  permissions?: string[];
  ownerOnly?: boolean; // Only resource owner can access
}

export class RouteProtection {
  /**
   * Middleware to check route access based on permissions
   */
  static checkAccess(permissions: RoutePermissions) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Public routes - always accessible
        if (permissions.public) {
          return next();
        }

        // Check if user is authenticated
        if (!req.user) {
          if (permissions.authenticated) {
            return res.status(401).json({
              success: false,
              message: 'Authentication required',
              code: 'AUTH_REQUIRED'
            });
          }
          return next();
        }

        // Check role-based access
        if (permissions.roles && permissions.roles.length > 0) {
          if (!permissions.roles.includes(req.user.role)) {
            logger.warn(`Access denied for user ${req.user.userId} (role: ${req.user.role}) to route requiring roles: ${permissions.roles.join(', ')}`);
            return res.status(403).json({
              success: false,
              message: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              required: permissions.roles,
              current: req.user.role
            });
          }
        }

        // Check owner-only access (user can only access their own resources)
        if (permissions.ownerOnly) {
          const resourceUserId = req.params.userId || req.params.id;
          if (resourceUserId && resourceUserId !== req.user.userId) {
            logger.warn(`Access denied for user ${req.user.userId} attempting to access resource of user ${resourceUserId}`);
            return res.status(403).json({
              success: false,
              message: 'Access denied: You can only access your own resources',
              code: 'OWNER_ACCESS_ONLY'
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Route protection error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          code: 'PROTECTION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware to log route access
   */
  static logAccess(level: 'public' | 'protected' | 'private' | 'admin') {
    return (req: Request, res: Response, next: NextFunction) => {
      req.accessLevel = level;
      
      const logData = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        accessLevel: level,
        userId: req.user?.userId || 'anonymous',
        userRole: req.user?.role || 'guest'
      };

      if (level === 'admin' || level === 'private') {
        logger.info(`🔒 ${level.toUpperCase()} ACCESS:`, logData);
      } else {
        logger.debug(`📝 ${level.toUpperCase()} ACCESS:`, logData);
      }

      next();
    };
  }

  /**
   * Middleware to validate resource ownership
   */
  static validateOwnership(resourceField: string = 'userId') {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin can access any resource
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceField] || req.body[resourceField];
      if (resourceUserId && resourceUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own resources',
          code: 'OWNER_ACCESS_ONLY'
        });
      }

      next();
    };
  }

  /**
   * Middleware to check specific permissions
   */
  static requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin has all permissions
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      // Check user permissions (this would come from user's permissions array in database)
      const userPermissions = (req.user as any).permissions || [];
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission required: ${permission}`,
          code: 'PERMISSION_REQUIRED',
          required: permission
        });
      }

      return next();
    };
  }

  /**
   * Middleware to rate limit by user
   */
  static userRateLimit(options: {
    windowMs: number;
    max: number;
    message?: string;
  }) {
    const userRequests = new Map();

    return (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user?.userId || req.ip;
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Get user's request history
      const requests = userRequests.get(userId) || [];
      
      // Filter requests within the window
      const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
      
      // Check if limit exceeded
      if (recentRequests.length >= options.max) {
        return res.status(429).json({
          success: false,
          message: options.message || 'Too many requests, please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: options.max,
          windowMs: options.windowMs
        });
      }

      // Add current request timestamp
      recentRequests.push(now);
      userRequests.set(userId, recentRequests);

      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance to clean up
        for (const [uid, timestamps] of userRequests.entries()) {
          const filtered = timestamps.filter((t: number) => t > windowStart);
          if (filtered.length === 0) {
            userRequests.delete(uid);
          } else {
            userRequests.set(uid, filtered);
          }
        }
      }

      return next();
    };
  }

  /**
   * Middleware to check account status
   */
  static checkAccountStatus() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(); // Skip if not authenticated
      }

      // Check if account is active
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Check if email is verified (for certain routes)
      const protectedRoutes = ['/protected/profile', '/protected/avatar'];
      const isProtectedRoute = protectedRoutes.some(route => req.originalUrl.includes(route));
      
      if (isProtectedRoute && !req.user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Email verification required',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      next();
    };
  }

  /**
   * Middleware to add security headers
   */
  static securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Add CORS headers for API
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count');

      next();
    };
  }
}

export default RouteProtection;
