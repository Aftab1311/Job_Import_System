import { ImportLog, IImportLog } from '../models/ImportLog';
import { JobData } from './JobFetchService';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { Job } from '../models/Job';

const IMPORT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

export interface ImportResult {
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: number;
  errors: Array<{ jobId?: string; error: string }>;
}

export class JobImportService {
  async importJobs(
    jobs: JobData[],
    sourceFeed: string,
    importLogId: string
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      totalFetched: jobs.length,
      totalImported: 0,
      newJobs: 0,
      updatedJobs: 0,
      failedJobs: 0,
      errors: []
    };

    try {
      for (const jobData of jobs) {
        // Check for timeout during processing
        if (Date.now() - startTime > IMPORT_TIMEOUT_MS) {
          throw new Error(`Import timed out after ${IMPORT_TIMEOUT_MS / 1000} seconds`);
        }

        try {
          await this.processJob(jobData, sourceFeed, result);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          result.failedJobs++;
          result.errors.push({
            jobId: jobData.externalId,
            error: errorMessage
          });
          logger.error(`Failed to process job ${jobData.externalId}:`, error);
        }
      }

      result.totalImported = result.newJobs + result.updatedJobs;

      await this.updateImportLog(importLogId, result);

      logger.info(`Import completed: ${JSON.stringify(result)}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Update import log with failure status
      await ImportLog.findByIdAndUpdate(importLogId, {
        status: 'failed',
        endTime: new Date(),
        errorDetails: [{
          error: errorMessage,
          timestamp: new Date()
        }]
      });

      logger.error('Import failed:', error);
      throw error;
    }

    return result;
  }

  private async processJob(
    jobData: JobData,
    sourceFeed: string,
    result: ImportResult
  ): Promise<void> {
    // Remove session parameter - use direct operations
    const existingJob = await Job.findOne({
      externalId: jobData.externalId,
      sourceFeed
    });

    if (existingJob) {
      // Update existing job
      const updated = await Job.findOneAndUpdate(
        { externalId: jobData.externalId, sourceFeed },
        {
          ...jobData,
          sourceFeed,
          updatedAt: new Date()
        },
        { new: true, upsert: false }
      );

      if (updated) {
        result.updatedJobs++;
        logger.debug(`Updated job: ${jobData.externalId}`);
      }
    } else {
      // Create new job
      const newJob = new Job({
        ...jobData,
        sourceFeed
      });

      await newJob.save();
      result.newJobs++;
      logger.debug(`Created new job: ${jobData.externalId}`);
    }
  }

  private async updateImportLog(
    importLogId: string,
    result: ImportResult
  ): Promise<void> {
    const startTime = Date.now();
    
    await ImportLog.findByIdAndUpdate(importLogId, {
      totalFetched: result.totalFetched,
      totalImported: result.totalImported,
      newJobs: result.newJobs,
      updatedJobs: result.updatedJobs,
      failedJobs: result.failedJobs,
      errorDetails: result.errors.map(err => ({
        jobId: err.jobId,
        error: err.error,
        timestamp: new Date()
      })),
      endTime: new Date(),
      processingTimeMs: Date.now() - startTime,
      status: result.failedJobs === result.totalFetched ? 'failed' : 'completed'
    });
  }

  async createImportLog(fileName: string): Promise<string> {
    const importLog = new ImportLog({
      fileName,
      startTime: new Date(),
      status: 'running'
    });

    const saved = await importLog.save();
    return saved.id;
  }
}
