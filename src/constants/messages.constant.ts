export const MESSAGES = {
  // Auth Messages
  AUTH: {
    REGISTER_SUCCESS: 'User registered successfully. Please check your email for verification.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET_SENT: 'Password reset link sent to your email',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token has expired',
    EMAIL_ALREADY_VERIFIED: 'Email is already verified',
    EMAIL_NOT_VERIFIED: 'Please verify your email first',
    ACCOUNT_INACTIVE: 'Account is inactive. Please contact administrator.',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
    INVALID_RESET_TOKEN: 'Invalid or expired reset token'
  },
  
  // User Messages
  USER: {
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
    RETRIEVED: 'User retrieved successfully',
    LIST_RETRIEVED: 'Users list retrieved successfully',
    
    NOT_FOUND: 'User not found',
    UNAUTHORIZED: 'Unauthorized to access this user',
    FORBIDDEN: 'Forbidden to perform this action'
  },
  
  // Validation Messages
  VALIDATION: {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid phone number',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
    PASSWORD_WEAK: 'Password must contain uppercase, lowercase, numbers and special characters',
    INVALID_ROLE: 'Invalid role specified'
  },
  
  // General Messages
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    ERROR: 'An error occurred',
    SERVER_ERROR: 'Internal server error',
    BAD_REQUEST: 'Bad request',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource conflict',
    VALIDATION_FAILED: 'Validation failed',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later'
  },
  
  // Email Messages
  EMAIL: {
    VERIFICATION_SUBJECT: 'Verify Your Email Address',
    PASSWORD_RESET_SUBJECT: 'Reset Your Password',
    WELCOME_SUBJECT: 'Welcome to CRM System'
  }
};
