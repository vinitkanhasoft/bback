import { z } from 'zod';
import { FuelType, Transmission, SellerType, DriveType, InsuranceType, CarStatus, BodyType } from '../../enums/car.enum';
import { FEATURE_KEYS, SPECIFICATION_KEYS } from '../../constants/car.constant';

// Pricing Schema
const pricingSchema = z.object({
  regularPrice: z.number()
    .min(0, 'Regular price must be a positive number'),
  salePrice: z.number()
    .min(0, 'Sale price must be a positive number')
    .optional(),
  onRoadPrice: z.number()
    .min(0, 'On-road price must be a positive number')
    .optional(),
  emiStartingFrom: z.number()
    .min(0, 'EMI must be a positive number')
    .optional()
});

// Technical Schema
const technicalSchema = z.object({
  km: z.number()
    .min(0, 'Kilometers must be a positive number'),
  fuelType: z.enum(Object.values(FuelType), {
    errorMap: () => ({ message: 'Invalid fuel type' })
  }),
  transmission: z.enum(Object.values(Transmission), {
    errorMap: () => ({ message: 'Invalid transmission type' })
  }),
  engine: z.string()
    .min(1, 'Engine details are required')
    .max(100, 'Engine details cannot exceed 100 characters')
    .trim(),
  mileage: z.number()
    .min(0, 'Mileage must be a positive number')
    .optional(),
  seats: z.number()
    .min(1, 'Seats must be at least 1')
    .max(20, 'Seats cannot exceed 20'),
  ownership: z.number()
    .min(1, 'Ownership must be at least 1')
    .max(10, 'Ownership cannot exceed 10'),
  driveType: z.enum(Object.values(DriveType), {
    errorMap: () => ({ message: 'Invalid drive type' })
  }),
  sellerType: z.enum(Object.values(SellerType), {
    errorMap: () => ({ message: 'Invalid seller type' })
  })
});

// Location Schema
const locationSchema = z.object({
  registrationCity: z.string()
    .min(1, 'Registration city is required')
    .max(50, 'City name cannot exceed 50 characters')
    .trim(),
  registrationState: z.string()
    .min(1, 'Registration state is required')
    .max(50, 'State name cannot exceed 50 characters')
    .trim()
});

// Insurance Schema
const insuranceSchema = z.object({
  type: z.enum(Object.values(InsuranceType), {
    errorMap: () => ({ message: 'Invalid insurance type' })
  }),
  expiryDate: z.date()
    .refine(date => date > new Date(), {
      message: 'Insurance expiry date must be in the future'
    })
    .optional(),
  policyNumber: z.string()
    .max(50, 'Policy number cannot exceed 50 characters')
    .trim()
    .optional()
});

// Create Car Schema
export const createCarSchema = z.object({
  title: z.string()
    .min(3, 'Car title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  
  brand: z.string()
    .min(1, 'Brand is required')
    .max(50, 'Brand cannot exceed 50 characters')
    .trim(),
  
  model: z.string()
    .min(1, 'Model is required')
    .max(50, 'Model cannot exceed 50 characters')
    .trim(),
  
  year: z.number()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be more than next year'),
  
  variant: z.string()
    .max(50, 'Variant cannot exceed 50 characters')
    .trim()
    .optional(),
  
  bodyType: z.enum(Object.values(BodyType), {
    errorMap: () => ({ message: 'Invalid body type' })
  }),
  
  color: z.string()
    .min(1, 'Color is required')
    .max(30, 'Color cannot exceed 30 characters')
    .trim(),
  
  description: z.string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim()
    .optional(),
  
  pricing: pricingSchema,
  technical: technicalSchema,
  location: locationSchema,
  insurance: insuranceSchema,
  
  status: z.enum(Object.values(CarStatus), {
    errorMap: () => ({ message: 'Invalid car status' })
  }).default(CarStatus.AVAILABLE),
  
  isFeatured: z.boolean().default(false),
  
  primaryImage: z.string()
    .min(1, 'Primary image is required')
    .url('Primary image must be a valid URL')
    .trim(),
  
  images: z.array(z.string().url('Each image must be a valid URL').trim())
    .min(1, 'At least one image is required')
    .max(20, 'Cannot exceed 20 images'),
  
  featureIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid feature ID format'))
    .max(50, 'Cannot exceed 50 features')
    .optional(),
  
  specificationIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid specification ID format'))
    .max(50, 'Cannot exceed 50 specifications')
    .optional()
});

// Update Car Schema (partial)
export const updateCarSchema = createCarSchema.partial();

// Create Feature Schema
export const createFeatureSchema = z.object({
  name: z.string()
    .min(1, 'Feature name is required')
    .max(100, 'Feature name cannot exceed 100 characters')
    .trim(),
  
  key: z.enum(FEATURE_KEYS, {
    errorMap: () => ({ message: 'Invalid feature key' })
  }),
  
  carId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid car ID format')
});

// Update Feature Schema (partial)
export const updateFeatureSchema = createFeatureSchema.partial();

// Create Specification Schema
export const createSpecificationSchema = z.object({
  name: z.string()
    .min(1, 'Specification name is required')
    .max(100, 'Specification name cannot exceed 100 characters')
    .trim(),
  
  key: z.enum(SPECIFICATION_KEYS, {
    errorMap: () => ({ message: 'Invalid specification key' })
  }),
  
  carId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid car ID format')
});

// Update Specification Schema (partial)
export const updateSpecificationSchema = createSpecificationSchema.partial();

// Car Query Schema (for search/filtering)
export const carQuerySchema = z.object({
  page: z.coerce.number()
    .min(1, 'Page must be at least 1')
    .default(1),
  
  limit: z.coerce.number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),
  
  brand: z.string()
    .trim()
    .optional(),
  
  model: z.string()
    .trim()
    .optional(),
  
  year: z.coerce.number()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be more than next year')
    .optional(),
  
  fuelType: z.enum(Object.values(FuelType), {
    errorMap: () => ({ message: 'Invalid fuel type' })
  }).optional(),
  
  transmission: z.enum(Object.values(Transmission), {
    errorMap: () => ({ message: 'Invalid transmission type' })
  }).optional(),
  
  sellerType: z.enum(Object.values(SellerType), {
    errorMap: () => ({ message: 'Invalid seller type' })
  }).optional(),
  
  bodyType: z.enum(Object.values(BodyType), {
    errorMap: () => ({ message: 'Invalid body type' })
  }).optional(),
  
  status: z.enum(Object.values(CarStatus), {
    errorMap: () => ({ message: 'Invalid car status' })
  }).optional(),
  
  isFeatured: z.coerce.boolean()
    .optional(),
  
  minPrice: z.coerce.number()
    .min(0, 'Minimum price must be positive')
    .optional(),
  
  maxPrice: z.coerce.number()
    .min(0, 'Maximum price must be positive')
    .optional(),
  
  minKm: z.coerce.number()
    .min(0, 'Minimum kilometers must be positive')
    .optional(),
  
  maxKm: z.coerce.number()
    .min(0, 'Maximum kilometers must be positive')
    .optional(),
  
  sortBy: z.enum(['createdAt', 'price', 'km', 'year'], {
    errorMap: () => ({ message: 'Invalid sort field' })
  }).default('createdAt'),
  
  sortOrder: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Invalid sort order' })
  }).default('desc'),
  
  search: z.string()
    .trim()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional()
}).refine((data) => {
  if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
    return false;
  }
  if (data.minKm && data.maxKm && data.minKm > data.maxKm) {
    return false;
  }
  return true;
}, {
  message: 'Minimum value cannot be greater than maximum value',
  path: ['minPrice']
});

// Export types for inference
export type CreateCarInput = z.infer<typeof createCarSchema>;
export type UpdateCarInput = z.infer<typeof updateCarSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type CreateSpecificationInput = z.infer<typeof createSpecificationSchema>;
export type UpdateSpecificationInput = z.infer<typeof updateSpecificationSchema>;
export type CarQueryInput = z.infer<typeof carQuerySchema>;
