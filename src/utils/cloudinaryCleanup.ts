import { cloudinary } from '../config/cloudinary.config';
import logger from './logger';
import { CloudinaryUploadResult } from './cloudinaryUpload';

export interface ImageMetadata {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  uploadedAt: Date;
}

export class CloudinaryCleanupUtil {
  /**
   * Extract public ID from Cloudinary URL
   */
  static extractPublicIdFromUrl(url: string): string | null {
    try {
      // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
      const urlParts = url.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      
      if (uploadIndex === -1) return null;
      
      // Get everything after 'upload' including version and folder
      const pathParts = urlParts.slice(uploadIndex + 1);
      
      // Remove version if present (starts with 'v' followed by numbers)
      if (pathParts[0] && /^v\d+/.test(pathParts[0])) {
        pathParts.shift();
      }
      
      // Join remaining parts and remove file extension
      const pathWithoutExtension = pathParts.join('/').replace(/\.[^/.]+$/, '');
      
      return pathWithoutExtension || null;
    } catch (error) {
      logger.error('❌ Error extracting public ID from URL:', error);
      return null;
    }
  }

  /**
   * Delete image by URL (extracts public ID first)
   */
  static async deleteImageByUrl(url: string): Promise<boolean> {
    try {
      const publicId = this.extractPublicIdFromUrl(url);
      
      if (!publicId) {
        logger.warn(`⚠️ Could not extract public ID from URL: ${url}`);
        return false;
      }
      
      await this.deleteImageByPublicId(publicId);
      return true;
    } catch (error) {
      logger.error(`❌ Error deleting image by URL ${url}:`, error);
      return false;
    }
  }

  /**
   * Delete image by public ID
   */
  static async deleteImageByPublicId(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        logger.info(`✅ Image deleted successfully: ${publicId}`);
      } else if (result.result === 'not found') {
        logger.warn(`⚠️ Image not found on Cloudinary: ${publicId}`);
      } else {
        throw new Error(`Failed to delete image: ${result.result}`);
      }
    } catch (error) {
      logger.error(`❌ Error deleting image ${publicId}:`, error);
      throw new Error(`Failed to delete image: ${publicId}`);
    }
  }

  /**
   * Delete multiple images by URLs
   */
  static async deleteMultipleImagesByUrl(urls: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [], failed: [] } as { success: string[], failed: string[] };
    
    for (const url of urls) {
      try {
        const success = await this.deleteImageByUrl(url);
        if (success) {
          results.success.push(url);
        } else {
          results.failed.push(url);
        }
      } catch (error) {
        results.failed.push(url);
      }
    }
    
    logger.info(`🗑️ Batch delete completed: ${results.success.length} success, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Delete multiple images by public IDs
   */
  static async deleteMultipleImagesByPublicId(publicIds: string[]): Promise<{ success: string[], failed: string[] }> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      
      const deleted = result.deleted || {};
      const success = Object.keys(deleted).filter(id => deleted[id] === 'deleted');
      const failed = Object.keys(deleted).filter(id => deleted[id] !== 'deleted');
      
      logger.info(`🗑️ Batch delete completed: ${success.length} success, ${failed.length} failed`);
      
      return { success, failed };
    } catch (error) {
      logger.error('❌ Error in batch delete:', error);
      throw new Error('Failed to delete multiple images');
    }
  }

  /**
   * Replace image: delete old one and upload new one
   */
  static async replaceImage(
    oldImageUrl: string | null,
    newFile: Express.Multer.File,
    folder: string = 'crm-uploads',
    transformation?: any
  ): Promise<CloudinaryUploadResult> {
    try {
      // Delete old image if it exists
      if (oldImageUrl) {
        await this.deleteImageByUrl(oldImageUrl);
      }
      
      // Upload new image
      const { CloudinaryUpload } = await import('./cloudinaryUpload');
      const result = await CloudinaryUpload.uploadImage(newFile, folder, transformation);
      
      logger.info(`🔄 Image replaced successfully: ${oldImageUrl} → ${result.publicId}`);
      return result;
    } catch (error) {
      logger.error('❌ Error replacing image:', error);
      throw new Error('Failed to replace image');
    }
  }

  /**
   * Replace avatar with specific avatar settings
   */
  static async replaceAvatar(
    oldAvatarUrl: string | null,
    newFile: Express.Multer.File
  ): Promise<CloudinaryUploadResult> {
    const transformation = [
      { width: 200, height: 200, gravity: 'face', crop: 'fill' },
      { quality: 'auto:good' }
    ];
    
    return this.replaceImage(oldAvatarUrl, newFile, 'crm-avatars', transformation);
  }

  /**
   * Check if image exists on Cloudinary
   */
  static async imageExists(publicId: string): Promise<boolean> {
    try {
      await cloudinary.api.resource(publicId);
      return true;
    } catch (error: any) {
      if (error.http_code === 404) {
        return false;
      }
      logger.error(`❌ Error checking if image exists ${publicId}:`, error);
      throw error;
    }
  }

  /**
   * Get image metadata
   */
  static async getImageMetadata(publicId: string): Promise<ImageMetadata | null> {
    try {
      const resource = await cloudinary.api.resource(publicId);
      
      return {
        url: resource.secure_url,
        publicId: resource.public_id,
        resourceType: resource.resource_type,
        format: resource.format,
        bytes: resource.bytes,
        uploadedAt: new Date(resource.created_at * 1000)
      };
    } catch (error) {
      logger.error(`❌ Error getting image metadata ${publicId}:`, error);
      return null;
    }
  }

  /**
   * Cleanup orphaned images (images in Cloudinary but not in database)
   */
  static async cleanupOrphanedImages(
    cloudinaryFolder: string,
    databasePublicIds: string[]
  ): Promise<{ cleaned: string[], orphaned: string[] }> {
    try {
      // Get all images from Cloudinary folder
      const resources = await cloudinary.api.resources({
        type: 'upload',
        prefix: cloudinaryFolder,
        max_results: 500
      });
      
      const cloudinaryPublicIds = resources.resources.map((r: any) => r.public_id as string);
      const orphanedIds = cloudinaryPublicIds.filter((id: string) => !databasePublicIds.includes(id));
      
      if (orphanedIds.length === 0) {
        logger.info(`✅ No orphaned images found in folder: ${cloudinaryFolder}`);
        return { cleaned: [], orphaned: [] };
      }
      
      // Delete orphaned images
      const deleteResult = await this.deleteMultipleImagesByPublicId(orphanedIds);
      
      logger.info(`🧹 Cleanup completed for ${cloudinaryFolder}: ${deleteResult.success.length} deleted`);
      
      return {
        cleaned: deleteResult.success,
        orphaned: deleteResult.failed
      };
    } catch (error) {
      logger.error(`❌ Error cleaning up orphaned images in ${cloudinaryFolder}:`, error);
      throw new Error('Failed to cleanup orphaned images');
    }
  }

  /**
   * Generate image URL with transformations
   */
  static generateTransformedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      gravity?: string;
    } = {}
  ): string {
    const transformation = {
      width: options.width,
      height: options.height,
      crop: options.crop,
      quality: options.quality || 'auto:good',
      gravity: options.gravity
    };
    
    // Remove undefined values
    Object.keys(transformation).forEach(key => {
      if (transformation[key as keyof typeof transformation] === undefined) {
        delete transformation[key as keyof typeof transformation];
      }
    });
    
    return cloudinary.url(publicId, { transformation });
  }
}

export const CloudinaryCleanup = CloudinaryCleanupUtil;
