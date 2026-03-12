import { Router } from 'express';
import { authenticateToken, authorizeRoles, optionalAuth } from '../middleware/auth.middleware';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.config';
import { Role } from '../enums/role.enum';

// Import route modules
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/user/user.routes';

const router = Router();

// Rate limiters for different route types
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const protectedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window for authenticated users
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Routes (No authentication required)
// These routes are accessible to anyone
router.use('/public', publicLimiter, (req, res, next) => {
  req.routeType = 'public';
  next();
});

// Health check (public)
router.get('/public/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Authentication Routes (Public but rate-limited)
// These routes handle authentication but don't require prior authentication
router.use('/auth', authLimiter, authRoutes);

// Protected Routes (Authentication required)
// These routes require valid authentication token
router.use('/protected', authenticateToken, protectedLimiter, (req, res, next) => {
  req.routeType = 'protected';
  next();
});

// User profile routes (authenticated users can access their own data)
router.use('/protected/profile', userRoutes);

// Optional Auth Routes (Authentication optional)
// These routes work with or without authentication
router.use('/optional', optionalAuth, (req, res, next) => {
  req.routeType = 'optional';
  next();
});

// Private Routes (Specific roles required)
// These routes require specific role-based permissions

// Admin-only routes
router.use('/admin', 
  authenticateToken, 
  authorizeRoles(Role.ADMIN), 
  protectedLimiter,
  (req, res, next) => {
    req.routeType = 'admin';
    next();
  }
);

// Manager and Admin routes
router.use('/management', 
  authenticateToken, 
  authorizeRoles(Role.ADMIN, Role.MANAGER), 
  protectedLimiter,
  (req, res, next) => {
    req.routeType = 'management';
    next();
  }
);

// Sales team routes (Sales, Manager, Admin)
router.use('/sales', 
  authenticateToken, 
  authorizeRoles(Role.ADMIN, Role.MANAGER, Role.SALES), 
  protectedLimiter,
  (req, res, next) => {
    req.routeType = 'sales';
    next();
  }
);

// Support team routes (Support, Manager, Admin)
router.use('/support', 
  authenticateToken, 
  authorizeRoles(Role.ADMIN, Role.MANAGER, Role.SUPPORT), 
  protectedLimiter,
  (req, res, next) => {
    req.routeType = 'support';
    next();
  }
);

// API Documentation (public)
router.get('/public/docs', (req, res) => {
  res.json({
    title: 'CRM API Documentation',
    version: '1.0.0',
    description: 'API documentation for CRM System',
    routes: {
      public: {
        description: 'Routes accessible without authentication',
        endpoints: [
          'GET /public/health - Health check',
          'POST /auth/register - User registration',
          'POST /auth/login - User login',
          'POST /auth/refresh-token - Refresh access token',
          'POST /auth/verify-email - Verify email address',
          'POST /auth/forgot-password - Request password reset',
          'POST /auth/reset-password - Reset password',
          'POST /auth/resend-verification - Resend verification email'
        ]
      },
      protected: {
        description: 'Routes requiring authentication',
        endpoints: [
          'GET /protected/profile - Get user profile',
          'PUT /protected/profile - Update user profile',
          'POST /protected/avatar - Upload avatar',
          'DELETE /protected/avatar - Remove avatar',
          'POST /auth/logout - Logout user',
          'POST /auth/change-password - Change password'
        ]
      },
      admin: {
        description: 'Admin-only routes',
        endpoints: [
          'GET /admin/users - List all users',
          'POST /admin/users - Create new user',
          'PUT /admin/users/:id - Update user',
          'DELETE /admin/users/:id - Delete user',
          'GET /admin/stats - Get user statistics'
        ]
      },
      management: {
        description: 'Manager and Admin routes',
        endpoints: [
          'GET /management/reports - Get reports',
          'GET /management/analytics - Get analytics'
        ]
      },
      sales: {
        description: 'Sales team routes',
        endpoints: [
          'GET /sales/leads - Get leads',
          'POST /sales/leads - Create lead',
          'PUT /sales/leads/:id - Update lead'
        ]
      },
      support: {
        description: 'Support team routes',
        endpoints: [
          'GET /support/tickets - Get support tickets',
          'POST /support/tickets - Create support ticket'
        ]
      }
    }
  });
});

// Route information endpoint
router.get('/public/routes', (req, res) => {
  const user = req.user;
  
  res.json({
    message: 'Available routes based on your authentication level',
    authenticated: !!user,
    userRole: user?.role || 'guest',
    availableRoutes: {
      public: [
        'GET /public/health',
        'GET /public/docs',
        'GET /public/routes',
        'POST /auth/* (authentication routes)'
      ],
      ...(user && {
        protected: [
          'GET /protected/profile',
          'PUT /protected/profile',
          'POST /protected/avatar',
          'DELETE /protected/avatar'
        ]
      }),
      ...(user?.role === Role.ADMIN && {
        admin: [
          'GET /admin/users',
          'POST /admin/users',
          'PUT /admin/users/:id',
          'DELETE /admin/users/:id'
        ]
      }),
      ...(user?.role && [Role.ADMIN, Role.MANAGER].includes(user.role) && {
        management: [
          'GET /management/reports',
          'GET /management/analytics'
        ]
      })
    }
  });
});

export default router;
