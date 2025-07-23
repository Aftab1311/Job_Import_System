import { schedule } from 'node-cron';
import { jobImportQueue } from '../config/redis';
import { JobImportService } from '../services/JobImportService';
import { logger } from '../utils/logger';

export class CronScheduler {
  private jobImportService = new JobImportService();

  start(): void {
    const schedulePattern = process.env.CRON_SCHEDULE || '0 */1 * * *'; // Every hour
    
    schedule(schedulePattern, async () => {
      try {
        logger.info('Starting scheduled job import');
        
        // Create import log for scheduled run
        const importLogId = await this.jobImportService.createImportLog('scheduled-import');
        
        // Queue import job
        await jobImportQueue.add(
          'scheduled-import',
          { importLogId },
          {
            priority: 10, // Higher priority for scheduled jobs
            jobId: `scheduled-${Date.now()}`, // Prevent duplicate scheduling
          }
        );
        
        logger.info('Scheduled job import queued successfully');
      } catch (error) {
        logger.error('Failed to schedule job import:', error);
      }
    }, {
      timezone: 'UTC'
    });

    logger.info(`Cron scheduler started with schedule: ${schedulePattern}`);
  }
}
