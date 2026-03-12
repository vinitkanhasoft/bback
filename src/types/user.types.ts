import { Document, Types } from 'mongoose';
import { Role } from '../enums/role.enum';
import { UserStatus, EmailStatus } from '../enums/status.enum';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  avatar?: string;
  avatarPublicId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  refreshToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  verifyEmailToken?: string;
  verifyEmailExpire?: Date;
  lastLogin?: Date;
}

export interface UserCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: Role;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatarPublicId?: string;
  isActive?: boolean;
  lastLogin?: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface UserListResult {
  users: UserResponse[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserDocument extends IUser, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface UserQuery {
  _id?: Types.ObjectId;
  email?: string;
  role?: Role;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface UserResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
