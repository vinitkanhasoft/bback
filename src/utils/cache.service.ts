import { redisClient } from '../config/redis.config';
import logger from './logger';

export class CacheService {
  private static instance: CacheService;
  
  private constructor() {}
  
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Generic cache methods
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.set(key, serializedValue, ttl);
    } catch (error) {
      logger.error('❌ Cache set error:', error);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('❌ Cache get error:', error);
      return null;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('❌ Cache delete error:', error);
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result > 0;
    } catch (error) {
      logger.error('❌ Cache exists error:', error);
      return false;
    }
  }

  // User caching methods
  public async cacheUser(userId: string, userData: any, ttl: number = 3600): Promise<void> {
    const key = `user:${userId}`;
    await this.set(key, userData, ttl);
  }

  public async getCachedUser(userId: string): Promise<any | null> {
    const key = `user:${userId}`;
    return await this.get(key);
  }

  public async invalidateUser(userId: string): Promise<void> {
    const key = `user:${userId}`;
    await this.del(key);
  }

  // Session caching methods
  public async cacheSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, sessionData, ttl);
  }

  public async getCachedSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  public async invalidateSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  // API response caching
  public async cacheApiResponse(key: string, data: any, ttl: number = 300): Promise<void> {
    const cacheKey = `api:${key}`;
    await this.set(cacheKey, data, ttl);
  }

  public async getCachedApiResponse(key: string): Promise<any | null> {
    const cacheKey = `api:${key}`;
    return await this.get(cacheKey);
  }

  public async invalidateApiResponse(key: string): Promise<void> {
    const cacheKey = `api:${key}`;
    await this.del(cacheKey);
  }

  // Blacklist token for logout
  public async blacklistToken(token: string, ttl: number): Promise<void> {
    const key = `blacklist:${token}`;
    await this.set(key, 'true', ttl);
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    return await this.exists(key);
  }

  // Rate limiting
  public async incrementRateLimit(identifier: string, windowMs: number): Promise<number> {
    const key = `rate_limit:${identifier}`;
    try {
      const current = await redisClient.get(key);
      if (!current) {
        await redisClient.set(key, '1', Math.ceil(windowMs / 1000));
        return 1;
      }
      
      const incremented = parseInt(current) + 1;
      await redisClient.set(key, incremented.toString(), Math.ceil(windowMs / 1000));
      return incremented;
    } catch (error) {
      logger.error('❌ Rate limit increment error:', error);
      return 0;
    }
  }

  // Cache invalidation patterns
  public async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Note: This requires Redis SCAN or KEYS command
      // For production, consider using Redis SCAN for better performance
      const client = redisClient.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      logger.error('❌ Cache pattern invalidation error:', error);
      throw error;
    }
  }

  // Clear all cache (use with caution)
  public async clearAll(): Promise<void> {
    try {
      await redisClient.flushAll();
    } catch (error) {
      logger.error('❌ Cache clear error:', error);
      throw error;
    }
  }
}

export const cacheService = CacheService.getInstance();
