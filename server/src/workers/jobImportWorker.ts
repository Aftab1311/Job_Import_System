import { Worker, Job as BullJob } from 'bullmq';
import { redisConnection } from '../config/redis';
import { JobFetchService } from '../services/JobFetchService';
import { JobImportService } from '../services/JobImportService';
import { logger } from '../utils/logger';
import { checkForStalledImports } from '../utils/importTimeoutChecker';

export interface JobImportData {
  feedUrl?: string;
  importLogId: string;
}

export class JobImportWorker {
  private worker: Worker;
  private jobFetchService: JobFetchService;
  private jobImportService: JobImportService;
  private timeoutChecker: NodeJS.Timeout; // Change Timer to Timeout

  constructor() {
    this.jobFetchService = new JobFetchService();
    this.jobImportService = new JobImportService();
    
    this.worker = new Worker(
      'job-import',
      this.processJob.bind(this),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.MAX_CONCURRENCY || '5'),
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );

    this.setupEventHandlers();

    // Add periodic timeout checker
    this.timeoutChecker = setInterval(() => {
      checkForStalledImports();
    }, 60000); // Check every minute
  }

  private async processJob(job: BullJob<JobImportData>): Promise<void> {
    const { feedUrl, importLogId } = job.data;
    
    logger.info(`Processing job import: ${job.id}`, { feedUrl, importLogId });

    try {
      if (feedUrl) {
        // Process single feed
        const jobs = await this.jobFetchService.fetchJobsFromFeed(feedUrl);
        await this.jobImportService.importJobs(jobs, feedUrl, importLogId);
      } else {
        // Process all feeds
        const allResults = await this.jobFetchService.fetchAllJobs();
        
        for (const { feedUrl: url, jobs } of allResults) {
          await this.jobImportService.importJobs(jobs, url, importLogId);
        }
      }
      
      logger.info(`Job import completed: ${job.id}`);
    } catch (error) {
      logger.error(`Job import failed: ${job.id}`, error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info(`Job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.id}`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job stalled: ${jobId}`);
    });
  }

  async close(): Promise<void> {
    if (this.timeoutChecker) {
      clearInterval(this.timeoutChecker);
    }
    await this.worker.close();
  }
}
