import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';
import { FuelType, Transmission, SellerType, DriveType, InsuranceType, CarStatus, BodyType } from '../../enums/car.enum';
import { FEATURE_KEYS, SPECIFICATION_KEYS } from '../../constants/car.constant';
import { ICarDetails, ICarFeature, ICarSpecification } from '../../types/car.types';

// Create a proper Document type that extends mongoose.Document
interface CarDetailsDocument extends ICarDetails, Omit<mongoose.Document, 'model'> {}
interface CarFeatureDocument extends ICarFeature, mongoose.Document {}
interface CarSpecificationDocument extends ICarSpecification, mongoose.Document {}

// Pricing Sub-schema
const pricingSchema = new Schema({
  regularPrice: {
    type: Number,
    required: [true, 'Regular price is required'],
    min: [0, 'Price must be a positive number']
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price must be a positive number']
  },
  onRoadPrice: {
    type: Number,
    min: [0, 'On-road price must be a positive number']
  },
  emiStartingFrom: {
    type: Number,
    min: [0, 'EMI must be a positive number']
  }
}, { _id: false });

// Technical Sub-schema
const technicalSchema = new Schema({
  km: {
    type: Number,
    required: [true, 'Kilometers is required'],
    min: [0, 'Kilometers must be a positive number']
  },
  fuelType: {
    type: String,
    enum: Object.values(FuelType),
    required: [true, 'Fuel type is required']
  },
  transmission: {
    type: String,
    enum: Object.values(Transmission),
    required: [true, 'Transmission type is required']
  },
  engine: {
    type: String,
    required: [true, 'Engine details are required'],
    trim: true,
    maxlength: [100, 'Engine details cannot exceed 100 characters']
  },
  mileage: {
    type: Number,
    min: [0, 'Mileage must be a positive number']
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'Seats must be at least 1'],
    max: [20, 'Seats cannot exceed 20']
  },
  ownership: {
    type: Number,
    required: [true, 'Ownership count is required'],
    min: [1, 'Ownership must be at least 1'],
    max: [10, 'Ownership cannot exceed 10']
  },
  driveType: {
    type: String,
    enum: Object.values(DriveType),
    required: [true, 'Drive type is required']
  },
  sellerType: {
    type: String,
    enum: Object.values(SellerType),
    required: [true, 'Seller type is required']
  }
}, { _id: false });

// Location Sub-schema
const locationSchema = new Schema({
  registrationCity: {
    type: String,
    required: [true, 'Registration city is required'],
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  registrationState: {
    type: String,
    required: [true, 'Registration state is required'],
    trim: true,
    maxlength: [50, 'State name cannot exceed 50 characters']
  }
}, { _id: false });

// Insurance Sub-schema
const insuranceSchema = new Schema({
  type: {
    type: String,
    enum: Object.values(InsuranceType),
    required: [true, 'Insurance type is required']
  },
  expiryDate: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        return !value || value > new Date();
      },
      message: 'Insurance expiry date must be in the future'
    }
  },
  policyNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Policy number cannot exceed 50 characters']
  }
}, { _id: false });

// Car Feature Schema
const carFeatureSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Feature name is required'],
    trim: true,
    maxlength: [100, 'Feature name cannot exceed 100 characters']
  },
  key: {
    type: String,
    enum: FEATURE_KEYS,
    required: [true, 'Feature key is required']
  },
  carId: {
    type: Schema.Types.ObjectId,
    ref: 'CarDetails',
    required: [true, 'Car ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Car Specification Schema
const carSpecificationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Specification name is required'],
    trim: true,
    maxlength: [100, 'Specification name cannot exceed 100 characters']
  },
  key: {
    type: String,
    enum: SPECIFICATION_KEYS,
    required: [true, 'Specification key is required']
  },
  carId: {
    type: Schema.Types.ObjectId,
    ref: 'CarDetails',
    required: [true, 'Car ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Car Details Schema
const carDetailsSchema = new Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Car title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand cannot exceed 50 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be more than next year']
  },
  variant: {
    type: String,
    trim: true,
    maxlength: [50, 'Variant cannot exceed 50 characters']
  },
  bodyType: {
    type: String,
    enum: Object.values(BodyType),
    required: [true, 'Body type is required']
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    trim: true,
    maxlength: [30, 'Color cannot exceed 30 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Nested Objects
  pricing: {
    type: pricingSchema,
    required: [true, 'Pricing information is required']
  },
  technical: {
    type: technicalSchema,
    required: [true, 'Technical information is required']
  },
  location: {
    type: locationSchema,
    required: [true, 'Location information is required']
  },
  insurance: {
    type: insuranceSchema,
    required: [true, 'Insurance information is required']
  },

  // Status and Featured
  status: {
    type: String,
    enum: Object.values(CarStatus),
    default: CarStatus.AVAILABLE,
    required: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },

  // SEO and Media
  slug: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  primaryImage: {
    type: String,
    required: [true, 'Primary image is required'],
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],

  // Relations
  featureIds: [{
    type: Schema.Types.ObjectId,
    ref: 'CarFeature'
  }],
  specificationIds: [{
    type: Schema.Types.ObjectId,
    ref: 'CarSpecification'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for CarDetails
carDetailsSchema.index({ slug: 1 });
carDetailsSchema.index({ brand: 1 });
carDetailsSchema.index({ model: 1 });
carDetailsSchema.index({ year: -1 });
carDetailsSchema.index({ 'technical.fuelType': 1 });
carDetailsSchema.index({ 'technical.transmission': 1 });
carDetailsSchema.index({ 'technical.sellerType': 1 });
carDetailsSchema.index({ bodyType: 1 });
carDetailsSchema.index({ status: 1 });
carDetailsSchema.index({ isFeatured: 1 });
carDetailsSchema.index({ 'pricing.regularPrice': 1 });
carDetailsSchema.index({ 'technical.km': 1 });
carDetailsSchema.index({ createdAt: -1 });
carDetailsSchema.index({ title: 'text', brand: 'text', model: 'text', description: 'text' });

// Indexes for CarFeature
carFeatureSchema.index({ carId: 1 });
carFeatureSchema.index({ key: 1 });
carFeatureSchema.index({ carId: 1, key: 1 }, { unique: true });

// Indexes for CarSpecification
carSpecificationSchema.index({ carId: 1 });
carSpecificationSchema.index({ key: 1 });
carSpecificationSchema.index({ carId: 1, key: 1 }, { unique: true });

// Pre-save middleware for slug generation
carDetailsSchema.pre('save', async function(next) {
  if (this.isModified('title') || this.isModified('brand') || this.isModified('model') || this.isModified('year')) {
    const baseSlug = slugify(`${this.brand} ${this.model} ${this.year} ${this.title}`, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure unique slug
    while (await (this.constructor as mongoose.Model<CarDetailsDocument>).findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Virtual for full car name
carDetailsSchema.virtual('fullName').get(function() {
  return `${this.brand} ${this.model} ${this.year}`;
});

// Virtual for price range
carDetailsSchema.virtual('priceRange').get(function() {
  if (this.pricing.salePrice) {
    return `${this.pricing.salePrice.toLocaleString()} - ${this.pricing.regularPrice.toLocaleString()}`;
  }
  return this.pricing.regularPrice.toLocaleString();
});

// Static method to find featured cars
carDetailsSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, status: CarStatus.AVAILABLE })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search cars
carDetailsSchema.statics.searchCars = function(query: string, filters: any = {}) {
  const searchQuery: any = {
    $and: [
      { status: CarStatus.AVAILABLE },
      filters
    ]
  };

  if (query) {
    searchQuery.$and.push({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { model: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
  }

  return this.find(searchQuery);
};

// Export models and types
export { CarDetailsDocument, CarFeatureDocument, CarSpecificationDocument };
export const CarDetailsModel = mongoose.model<CarDetailsDocument>('CarDetails', carDetailsSchema);
export const CarFeatureModel = mongoose.model<CarFeatureDocument>('CarFeature', carFeatureSchema);
export const CarSpecificationModel = mongoose.model<CarSpecificationDocument>('CarSpecification', carSpecificationSchema);

export default {
  CarDetailsModel,
  CarFeatureModel,
  CarSpecificationModel
};
