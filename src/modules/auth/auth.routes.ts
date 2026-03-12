import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import RouteProtection from '../../middleware/routeProtection';
import logger from '../../utils/logger';
import { 
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema
} from './auth.validation';

const router = Router();

// Apply security headers to all routes
router.use(RouteProtection.securityHeaders());

// PUBLIC ROUTES (No authentication required)
// These routes are accessible to anyone but have rate limiting

// User registration
router.post('/register', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  validateRequest(registerSchema), 
  authController.register.bind(authController)
);

// User login
router.post('/login', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  RouteProtection.userRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: 'Too many login attempts, please try again later.'
  }),
  validateRequest(loginSchema), 
  authController.login.bind(authController)
);

// Refresh access token
router.post('/refresh-token', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  validateRequest(refreshTokenSchema), 
  authController.refreshToken.bind(authController)
);

// Email verification
router.post('/verify-email', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  validateRequest(verifyEmailSchema), 
  authController.verifyEmail.bind(authController)
);

// Forgot password
router.post('/forgot-password', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  RouteProtection.userRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: 'Too many password reset attempts, please try again later.'
  }),
  validateRequest(forgotPasswordSchema), 
  authController.forgotPassword.bind(authController)
);

// Reset password
router.post('/reset-password', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  validateRequest(resetPasswordSchema), 
  authController.resetPassword.bind(authController)
);

// Resend verification email
router.post('/resend-verification', 
  RouteProtection.logAccess('public'),
  RouteProtection.checkAccess({ public: true }),
  RouteProtection.userRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 resend attempts per hour
    message: 'Too many verification requests, please try again later.'
  }),
  authController.resendVerificationEmail.bind(authController)
);

// PROTECTED ROUTES (Authentication required)
// These routes require valid authentication token

// User logout
router.post('/logout', 
  RouteProtection.logAccess('protected'),
  authenticateToken,
  RouteProtection.checkAccess({ authenticated: true }),
  RouteProtection.checkAccountStatus(),
  authController.logout.bind(authController)
);

// Change password
router.post('/change-password', 
  RouteProtection.logAccess('protected'),
  authenticateToken,
  RouteProtection.checkAccess({ authenticated: true }),
  RouteProtection.checkAccountStatus(),
  validateRequest(changePasswordSchema), 
  authController.changePassword.bind(authController)
);

// Get user profile
router.get('/profile', 
  RouteProtection.logAccess('protected'),
  authenticateToken,
  RouteProtection.checkAccess({ authenticated: true }),
  RouteProtection.checkAccountStatus(),
  authController.getProfile.bind(authController)
);

export default router;
