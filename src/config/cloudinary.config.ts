import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger';
import { env } from './env.config';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

export class CloudinaryConfig {
  static getInstance() {
    return cloudinary;
  }
  
  static async testConnection(): Promise<boolean> {
    try {
      const result = await cloudinary.api.ping();
      logger.info('✅ Cloudinary connected successfully');
      return true;
    } catch (error) {
      logger.error('❌ Failed to connect to Cloudinary:', error);
      return false;
    }
  }
}

export { cloudinary };
