import mongoose from 'mongoose';
import logger from '../utils/logger';
import { env } from './env.config';

export class Database {
  private static instance: Database;
  
  private constructor() {}
  
  private buildMongoUri(): string {
    const { MONGODB_HOST, MONGODB_USER, MONGODB_PASSWORD, MONGODB_DATABASE, MONGODB_OPTIONS } = env;
    
    // Build MongoDB URI for Atlas
    if (MONGODB_USER && MONGODB_PASSWORD) {
      return `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DATABASE}${MONGODB_OPTIONS}`;
    }
    
    // Fallback for local MongoDB
    return `mongodb://${MONGODB_HOST}/${MONGODB_DATABASE}${MONGODB_OPTIONS}`;
  }
  
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  public async connect(): Promise<void> {
    try {
      const mongoUri = this.buildMongoUri();
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      });
      
      logger.info('✅ MongoDB connected successfully');
      
      mongoose.connection.on('error', (error) => {
        logger.error('❌ MongoDB connection error:', error);
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB reconnected');
      });
      
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }
  
  public async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info('✅ MongoDB disconnected successfully');
    } catch (error) {
      logger.error('❌ Error disconnecting from MongoDB:', error);
    }
  }
  
  public getConnection(): typeof mongoose {
    return mongoose;
  }
}

export const db = Database.getInstance();
