import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';
import { env } from './env.config';

export class RedisConnection {
  private static instance: RedisConnection;
  private client: RedisClientType;

  private constructor() {
    this.client = createClient({
      socket: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      },
      password: env.REDIS_PASSWORD || undefined,
      database: env.REDIS_DB,
    });

    this.client.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
    });

    this.client.on('connect', () => {
      logger.info('✅ Redis connecting...');
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis ready and connected');
    });

    this.client.on('end', () => {
      logger.warn('⚠️ Redis connection ended');
    });

    this.client.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('✅ Redis disconnected successfully');
    } catch (error) {
      logger.error('❌ Error disconnecting from Redis:', error);
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  // Cache utility methods
  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  public async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  public async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  public async flushAll(): Promise<string> {
    return await this.client.flushAll();
  }

  // Hash operations
  public async hSet(key: string, field: string, value: string): Promise<number> {
    return await this.client.hSet(key, field, value);
  }

  public async hGet(key: string, field: string): Promise<string | null> {
    return await this.client.hGet(key, field);
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  public async hDel(key: string, field: string): Promise<number> {
    return await this.client.hDel(key, field);
  }

  // JSON operations (if using RedisJSON module)
  public async jsonSet(key: string, path: string, value: any): Promise<string | null> {
    return await this.client.json.set(key, path, value);
  }

  public async jsonGet(key: string, path?: string): Promise<any> {
    return await this.client.json.get(key, { path });
  }
}

export const redisClient = RedisConnection.getInstance();
