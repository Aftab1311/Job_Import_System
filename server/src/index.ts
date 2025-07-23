import dotenv from 'dotenv';
dotenv.config();

import { createApp, connectDatabase } from './app';
import { JobImportWorker } from './workers/jobImportWorker';
import { CronScheduler } from './scheduler/cronScheduler';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = createApp();

    // Start worker processes
    const worker = new JobImportWorker();
    logger.info('Job import worker started');

    // Start cron scheduler
    const scheduler = new CronScheduler();
    scheduler.start();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await worker.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
