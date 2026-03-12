import { cloudinary } from '../config/cloudinary.config';
import logger from './logger';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export class CloudinaryUploadUtil {
  static async uploadImage(
    file: Express.Multer.File,
    folder: string = 'crm-uploads',
    transformation?: any
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false
      };
      
      if (transformation) {
        uploadOptions.transformation = transformation;
      }
      
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'));
            return;
          }
          
          const uploadResult: CloudinaryUploadResult = {
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height
          };
          
          resolve(uploadResult);
        }
      ).end(file.buffer);
    });
  }
  
  static async uploadAvatar(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    const transformation = [
      { width: 200, height: 200, gravity: 'face', crop: 'fill' },
      { quality: 'auto:good' }
    ];
    
    return this.uploadImage(file, 'crm-avatars', transformation);
  }
  
  static async uploadDocument(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, 'crm-documents');
  }
  
  static async deleteFile(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok') {
        throw new Error(`Failed to delete file: ${result.result}`);
      }
      logger.info(`✅ File deleted successfully: ${publicId}`);
    } catch (error) {
      logger.error('❌ Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }
  
  static async deleteFiles(publicIds: string[]): Promise<void> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      logger.info(`✅ Files deleted successfully:`, result.deleted);
    } catch (error) {
      logger.error('❌ Error deleting files:', error);
      throw new Error('Failed to delete files');
    }
  }
  
  static async getFileInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      logger.error('❌ Error getting file info:', error);
      throw new Error('Failed to get file info');
    }
  }
  
  static generateImageUrl(publicId: string, transformation?: any): string {
    let url = cloudinary.url(publicId);
    
    if (transformation) {
      const transformationString = cloudinary.url(publicId, { transformation }).split('/').slice(-2).join('/');
      url = cloudinary.url(publicId, { transformation });
    }
    
    return url;
  }
  
  static generateAvatarUrl(publicId: string): string {
    const transformation = {
      width: 200,
      height: 200,
      gravity: 'face',
      crop: 'fill',
      quality: 'auto:good'
    };
    
    return cloudinary.url(publicId, transformation);
  }
  
  static generateThumbnailUrl(publicId: string, width: number = 150, height: number = 150): string {
    const transformation = {
      width,
      height,
      crop: 'fill',
      quality: 'auto:good'
    };
    
    return cloudinary.url(publicId, transformation);
  }
}

export const CloudinaryUpload = CloudinaryUploadUtil;
