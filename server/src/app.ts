import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { importRoutes } from './routes/importRoutes';
import { jobRoutes } from './routes/jobRoutes';
import { logger, morganStream } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging - Use the properly typed morganStream
  app.use(morgan('combined', {
    stream: morganStream
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/imports', importRoutes);
  app.use('/api/jobs', jobRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
};

export const connectDatabase = async (): Promise<void> => {
  try {
    // Temporary hardcode for testing
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/job_importer';
    
    logger.info(`Attempting to connect to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB successfully');
  } catch (error: unknown) {
    // ... error handling
  }
};
