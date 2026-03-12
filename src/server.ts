import express from 'express';
import logger from './utils/logger';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.config';
import { db } from './config/db.config';
import { redisClient } from './config/redis.config';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import routes from './routes/index';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes with proper categorization
app.use('/api', routes);

// Legacy route support (backward compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: {
      public: [
        'GET /health',
        'GET /public/health',
        'GET /public/docs',
        'GET /public/routes',
        'POST /api/auth/* (authentication endpoints)'
      ],
      protected: [
        'GET /api/protected/profile',
        'PUT /api/protected/profile',
        'POST /api/protected/avatar',
        'DELETE /api/protected/avatar'
      ],
      admin: [
        'GET /api/admin/users',
        'POST /api/admin/users',
        'PUT /api/admin/users/:id',
        'DELETE /api/admin/users/:id'
      ]
    }
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('❌ Global error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await db.connect();
    
    // Connect to Redis
    await redisClient.connect();
    logger.info('✅ Redis connected successfully');
    
    // Start server
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${env.FRONTEND_URL}`);
      logger.info('🔐 Route Protection: Enabled');
      logger.info('📊 Route Categories: Public, Protected, Admin');
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🔄 SIGTERM received, shutting down gracefully...');
  await db.disconnect();
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🔄 SIGINT received, shutting down gracefully...');
  await db.disconnect();
  await redisClient.disconnect();
  process.exit(0);
});

startServer();

export default app;
