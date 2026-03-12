import { HttpStatus } from '../enums/status.enum';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[] | null;
  statusCode: HttpStatus;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError extends Error {
  statusCode: HttpStatus;
  isOperational: boolean;
}

export interface RequestWithUser extends Request {
  user?: any;
}
