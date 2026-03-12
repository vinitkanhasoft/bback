import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role } from '../../enums/role.enum';
import { UserStatus } from '../../enums/status.enum';
import { IUser, UserDocument } from '../../types/user.types';

const userSchema = new Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: Object.values(Role),
    default: Role.SALES,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  avatarPublicId: {
    type: String,
    default: null,
    select: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  verifyEmailToken: {
    type: String,
    select: false
  },
  verifyEmailExpire: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      delete ret.verifyEmailToken;
      delete ret.verifyEmailExpire;
      delete ret.avatarPublicId;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc: any, ret: any) {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      delete ret.verifyEmailToken;
      delete ret.verifyEmailExpire;
      delete ret.avatarPublicId;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isEmailVerified: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function(email: string) {
  return this.findOne({ email }).select('+password +refreshToken +resetPasswordToken +resetPasswordExpire +verifyEmailToken +verifyEmailExpire');
};

// Static method to find user by verification token
userSchema.statics.findByVerificationToken = function(token: string) {
  return this.findOne({
    verifyEmailToken: token,
    verifyEmailExpire: { $gt: new Date() }
  }).select('+verifyEmailToken +verifyEmailExpire');
};

// Static method to find user by reset token
userSchema.statics.findByResetToken = function(token: string) {
  return this.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: new Date() }
  }).select('+resetPasswordToken +resetPasswordExpire');
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for user status
userSchema.virtual('status').get(function() {
  if (!this.isActive) return UserStatus.INACTIVE;
  if (!this.isEmailVerified) return UserStatus.PENDING;
  return UserStatus.ACTIVE;
});

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
export type { UserDocument };
export default UserModel;
