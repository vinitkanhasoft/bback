import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.config';
import { JwtPayload, TokenPair } from '../types/auth.types';
import { TokenType } from '../enums/token.enum';

export class TokenUtil {
  static generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
    const options: SignOptions = { expiresIn: env.JWT_EXPIRE as any };
    return jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      env.JWT_SECRET,
      options
    );
  }
  
  static generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
    const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRE as any };
    return jwt.sign(
      { ...payload, type: TokenType.REFRESH },
      env.JWT_REFRESH_SECRET,
      options
    );
  }
  
  static generateEmailVerificationToken(payload: Omit<JwtPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: TokenType.EMAIL_VERIFICATION },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
  
  static generatePasswordResetToken(payload: Omit<JwtPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: TokenType.PASSWORD_RESET },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
  
  static generateTokenPair(payload: Omit<JwtPayload, 'type'>): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    return { accessToken, refreshToken };
  }
  
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
  
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  static verifyEmailVerificationToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid email verification token');
    }
  }
  
  static verifyPasswordResetToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid password reset token');
    }
  }
  
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }
  
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }
}

export const TokenGenerator = TokenUtil;
