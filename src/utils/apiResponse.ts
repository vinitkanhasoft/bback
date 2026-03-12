import { Response } from 'express';
import { HttpStatus } from '../enums/status.enum';
import { ApiResponse, PaginationResponse } from '../types/api.types';

export class ApiResponseClass {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: HttpStatus = HttpStatus.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      errors: null,
      statusCode
    };
    
    return res.status(statusCode).json(response);
  }
  
  static error(
    res: Response,
    message: string,
    errors: string[] | null = null,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
      statusCode
    };
    
    return res.status(statusCode).json(response);
  }
  
  static created<T>(
    res: Response,
    message: string,
    data?: T
  ): Response {
    return this.success(res, message, data, HttpStatus.CREATED);
  }
  
  static badRequest(
    res: Response,
    message: string,
    errors: string[] | null = null
  ): Response {
    return this.error(res, message, errors, HttpStatus.BAD_REQUEST);
  }
  
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return this.error(res, message, null, HttpStatus.UNAUTHORIZED);
  }
  
  static forbidden(
    res: Response,
    message: string = 'Forbidden'
  ): Response {
    return this.error(res, message, null, HttpStatus.FORBIDDEN);
  }
  
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, null, HttpStatus.NOT_FOUND);
  }
  
  static conflict(
    res: Response,
    message: string,
    errors: string[] | null = null
  ): Response {
    return this.error(res, message, errors, HttpStatus.CONFLICT);
  }
  
  static serverError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return this.error(res, message, null, HttpStatus.INTERNAL_SERVER_ERROR);
  }
  
  static pagination<T>(
    res: Response,
    message: string,
    data: T[],
    page: number,
    limit: number,
    total: number
  ): Response {
    const pages = Math.ceil(total / limit);
    
    const paginationResponse: PaginationResponse<T> = {
      data,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
    
    return this.success(res, message, paginationResponse);
  }
}

export const ApiResponseHelper = ApiResponseClass;
export const ApiResponseUtil = ApiResponseClass;
