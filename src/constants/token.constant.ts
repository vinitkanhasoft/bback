export const TOKEN_NAMES = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
  EMAIL_VERIFICATION: 'verifyEmailToken',
  PASSWORD_RESET: 'resetPasswordToken'
};

export const TOKEN_SECRET_KEYS = {
  ACCESS: 'JWT_SECRET',
  REFRESH: 'JWT_REFRESH_SECRET'
};

export const TOKEN_EXPIRY_TIME = {
  ACCESS: '15m',
  REFRESH: '7d',
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h'
};

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refreshToken'
};
