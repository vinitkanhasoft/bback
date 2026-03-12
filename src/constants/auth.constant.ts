import { TokenType } from '../enums/token.enum';

export const AUTH_CONSTANTS = {
  TOKEN_TYPES: {
    ACCESS: TokenType.ACCESS,
    REFRESH: TokenType.REFRESH,
    EMAIL_VERIFICATION: TokenType.EMAIL_VERIFICATION,
    PASSWORD_RESET: TokenType.PASSWORD_RESET
  },
  
  TOKEN_EXPIRY: {
    ACCESS: '15m',
    REFRESH: '7d',
    EMAIL_VERIFICATION: '24h',
    PASSWORD_RESET: '1h'
  },
  
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true
  }
};
