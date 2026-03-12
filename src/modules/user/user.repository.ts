import { UserModel, type UserDocument } from './user.model';
import { UserCreateInput, UserQuery, UserUpdateInput, PaginationQuery, UserListResult } from '../../types/user.types';
import { Role } from '../../enums/role.enum';

export class UserRepository {
  async findById(userId: string): Promise<UserDocument | null> {
    return UserModel.findById(userId);
  }
  
  async findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email });
  }
  
  async create(userData: UserCreateInput): Promise<UserDocument> {
    const user = new UserModel(userData);
    return user.save();
  }
  
  async updateById(userId: string, updateData: UserUpdateInput): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
  }
  
  async deleteById(userId: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(userId);
    return !!result;
  }
  
  async findMany(query: UserQuery = {}, pagination: PaginationQuery = {}): Promise<UserListResult> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination;
    
    const skip = (page - 1) * limit;
    const sort: { [key: string]: 1 | -1 } = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const [users, total] = await Promise.all([
      UserModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(query)
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      users: users.map(user => ({
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      page,
      limit,
      total,
      pages,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }
  
  async searchUsers(searchTerm: string, pagination: PaginationQuery = {}): Promise<UserListResult> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination;
    
    const skip = (page - 1) * limit;
    const sort: { [key: string]: 1 | -1 } = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchQuery = {
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    };
    
    const [users, total] = await Promise.all([
      UserModel.find(searchQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(searchQuery)
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      users: users.map(user => ({
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      page,
      limit,
      total,
      pages,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }
  
  async findByRole(role: Role, pagination: PaginationQuery = {}): Promise<UserListResult> {
    return this.findMany({ role }, pagination);
  }
  
  async findActiveUsers(pagination: PaginationQuery = {}): Promise<UserListResult> {
    return this.findMany({ isActive: true }, pagination);
  }
  
  async findInactiveUsers(pagination: PaginationQuery = {}): Promise<UserListResult> {
    return this.findMany({ isActive: false }, pagination);
  }
  
  async findVerifiedUsers(pagination: PaginationQuery = {}): Promise<UserListResult> {
    return this.findMany({ isEmailVerified: true }, pagination);
  }
  
  async findUnverifiedUsers(pagination: PaginationQuery = {}): Promise<UserListResult> {
    return this.findMany({ isEmailVerified: false }, pagination);
  }
  
  async updateLastLogin(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      lastLogin: new Date()
    });
  }
  
  async activateUser(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      isActive: true
    });
  }
  
  async deactivateUser(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      isActive: false,
      refreshToken: undefined
    });
  }
  
  async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      avatar: avatarUrl
    });
  }
  
  async countUsers(query: UserQuery = {}): Promise<number> {
    return UserModel.countDocuments(query);
  }
  
  async countByRole(role: Role): Promise<number> {
    return this.countUsers({ role });
  }
  
  async countActiveUsers(): Promise<number> {
    return this.countUsers({ isActive: true });
  }
  
  async countInactiveUsers(): Promise<number> {
    return this.countUsers({ isActive: false });
  }
  
  async countVerifiedUsers(): Promise<number> {
    return this.countUsers({ isEmailVerified: true });
  }
  
  async countUnverifiedUsers(): Promise<number> {
    return this.countUsers({ isEmailVerified: false });
  }
  
  async exists(userId: string): Promise<boolean> {
    const user = await UserModel.findById(userId);
    return !!user;
  }
  
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const query: any = { email };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    const user = await UserModel.findOne(query);
    return !!user;
  }
  
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
    byRole: { [key in Role]: number };
  }> {
    const [
      total,
      active,
      inactive,
      verified,
      unverified,
      adminCount,
      salesCount,
      callerCount,
      managerCount,
      supportCount,
      userCount
    ] = await Promise.all([
      this.countUsers(),
      this.countActiveUsers(),
      this.countInactiveUsers(),
      this.countVerifiedUsers(),
      this.countUnverifiedUsers(),
      this.countByRole(Role.ADMIN),
      this.countByRole(Role.SALES),
      this.countByRole(Role.CALLER),
      this.countByRole(Role.MANAGER),
      this.countByRole(Role.SUPPORT),
      this.countByRole(Role.USER)
    ]);
    
    return {
      total,
      active,
      inactive,
      verified,
      unverified,
      byRole: {
        [Role.ADMIN]: adminCount,
        [Role.SALES]: salesCount,
        [Role.CALLER]: callerCount,
        [Role.MANAGER]: managerCount,
        [Role.SUPPORT]: supportCount,
        [Role.USER]: userCount
      }
    };
  }
}

export const userRepository = new UserRepository();
