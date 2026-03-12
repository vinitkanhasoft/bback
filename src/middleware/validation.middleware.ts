import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../types/api.types';
import { ApiResponseHelper } from '../utils/apiResponse';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = schema.parse(req.body);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => err.message);
        
        ApiResponseHelper.badRequest(
          res,
          'Validation failed',
          errorMessages
        );
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = schema.parse(req.query);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => err.message);
        
        ApiResponseHelper.badRequest(
          res,
          'Query validation failed',
          errorMessages
        );
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request parameters
      if (req.params && Object.keys(req.params).length > 0) {
        req.params = schema.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => err.message);
        
        ApiResponseHelper.badRequest(
          res,
          'Parameter validation failed',
          errorMessages
        );
      } else {
        ApiResponseHelper.serverError(res);
      }
    }
  };
};
