import { Types } from 'mongoose';
import { FuelType, Transmission, SellerType, DriveType, InsuranceType, CarStatus, BodyType } from '../enums/car.enum';

// Base interface for timestamps (mongoose.Document provides _id)
export interface BaseDocument {
  createdAt: Date;
  updatedAt: Date;
}

// Car Feature Interface
export interface ICarFeature extends BaseDocument {
  name: string;
  key: typeof import('../constants/car.constant').FEATURE_KEYS[number];
  carId: Types.ObjectId;
}

// Car Specification Interface
export interface ICarSpecification extends BaseDocument {
  name: string;
  key: typeof import('../constants/car.constant').SPECIFICATION_KEYS[number];
  carId: Types.ObjectId;
}

// Pricing Interface
export interface ICarPricing {
  regularPrice: number;
  salePrice?: number;
  onRoadPrice?: number;
  emiStartingFrom?: number;
}

// Technical Interface
export interface ICarTechnical {
  km: number;
  fuelType: FuelType;
  transmission: Transmission;
  engine: string;
  mileage?: number;
  seats: number;
  ownership: number;
  driveType: DriveType;
  sellerType: SellerType;
}

// Location Interface
export interface ICarLocation {
  registrationCity: string;
  registrationState: string;
}

// Insurance Interface
export interface ICarInsurance {
  type: InsuranceType;
  expiryDate?: Date;
  policyNumber?: string;
}

// Car Details Interface
export interface ICarDetails extends BaseDocument {
  // Basic Info
  title: string;
  brand: string;
  model: string;
  year: number;
  variant?: string;
  bodyType: BodyType;
  color: string;
  description?: string;

  // Pricing
  pricing: ICarPricing;

  // Technical
  technical: ICarTechnical;

  // Location
  location: ICarLocation;

  // Insurance
  insurance: ICarInsurance;

  // Status and Featured
  status: CarStatus;
  isFeatured: boolean;

  // SEO and Media
  slug: string;
  primaryImage: string;
  images: string[];

  // Relations
  featureIds: Types.ObjectId[];
  specificationIds: Types.ObjectId[];
}

// Create Car Input Interface (for validation)
export interface ICreateCarInput {
  title: string;
  brand: string;
  model: string;
  year: number;
  variant?: string;
  bodyType: BodyType;
  color: string;
  description?: string;
  pricing: ICarPricing;
  technical: ICarTechnical;
  location: ICarLocation;
  insurance: ICarInsurance;
  status?: CarStatus;
  isFeatured?: boolean;
  primaryImage: string;
  images: string[];
  featureIds?: string[];
  specificationIds?: string[];
}

// Create Feature Input Interface
export interface ICreateFeatureInput {
  name: string;
  key: typeof import('../constants/car.constant').FEATURE_KEYS[number];
  carId: string;
}

// Create Specification Input Interface
export interface ICreateSpecificationInput {
  name: string;
  key: typeof import('../constants/car.constant').SPECIFICATION_KEYS[number];
  carId: string;
}

// Car Query Options Interface
export interface ICarQueryOptions {
  page?: number;
  limit?: number;
  brand?: string;
  model?: string;
  year?: number;
  fuelType?: FuelType;
  transmission?: Transmission;
  sellerType?: SellerType;
  bodyType?: BodyType;
  status?: CarStatus;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minKm?: number;
  maxKm?: number;
  sortBy?: 'createdAt' | 'price' | 'km' | 'year';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
