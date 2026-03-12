import { Router } from 'express';
import { userController } from './user.controller';
import { authenticateToken, authorizeRoles } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import RouteProtection from '../../middleware/routeProtection';
import { Role } from '../../enums/role.enum';
import { 
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  userIdSchema,
  listUsersSchema
} from './user.validation';

const router = Router();

// Apply security headers to all routes
router.use(RouteProtection.securityHeaders());

// ADMIN-ONLY ROUTES (Private routes requiring admin role)
// These routes can only be accessed by administrators

router.post('/', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  validateRequest(createUserSchema), 
  userController.createUser.bind(userController)
);

router.get('/', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  validateRequest(listUsersSchema), 
  userController.listUsers.bind(userController)
);

router.get('/stats', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  userController.getUserStats.bind(userController)
);

router.get('/role/:role', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  userController.getUsersByRole.bind(userController)
);

router.get('/active', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  userController.getActiveUsers.bind(userController)
);

router.get('/inactive', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  userController.getInactiveUsers.bind(userController)
);

router.put('/:userId', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  validateRequest(updateUserSchema), 
  userController.updateUser.bind(userController)
);

router.delete('/:userId', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  validateRequest(userIdSchema), 
  userController.deleteUser.bind(userController)
);

router.post('/:userId/activate', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  validateRequest(userIdSchema), 
  userController.activateUser.bind(userController)
);

router.post('/:userId/deactivate', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  validateRequest(userIdSchema), 
  userController.deactivateUser.bind(userController)
);

// PROTECTED ROUTES (Authentication required)
// These routes require valid authentication but are role-agnostic

// Get user by ID (users can access their own profile, admins can access any)
router.get('/:userId', 
  RouteProtection.logAccess('protected'),
  RouteProtection.checkAccess({ authenticated: true, ownerOnly: true }),
  validateRequest(userIdSchema), 
  userController.getUserById.bind(userController)
);

// Update user profile (users can update their own profile, admins can update any)
router.put('/profile', 
  RouteProtection.logAccess('protected'),
  RouteProtection.checkAccess({ authenticated: true }),
  RouteProtection.checkAccountStatus(),
  validateRequest(updateProfileSchema), 
  userController.updateProfile.bind(userController)
);

// Avatar management routes
router.post('/avatar', 
  RouteProtection.logAccess('protected'),
  RouteProtection.checkAccess({ authenticated: true }),
  RouteProtection.checkAccountStatus(),
  userController.updateAvatar.bind(userController)
);

router.delete('/avatar', 
  RouteProtection.logAccess('protected'),
  RouteProtection.checkAccess({ authenticated: true }),
  RouteProtection.checkAccountStatus(),
  userController.removeAvatar.bind(userController)
);

// Cleanup orphaned images (admin only)
router.post('/cleanup/:folder', 
  RouteProtection.logAccess('admin'),
  RouteProtection.checkAccess({ authenticated: true, roles: [Role.ADMIN] }),
  userController.cleanupOrphanedImages.bind(userController)
);

export default router;
