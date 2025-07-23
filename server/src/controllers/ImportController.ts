import { Request, Response } from 'express';
import { jobImportQueue } from '../config/redis';
import { ImportLog } from '../models/ImportLog';
import { JobImportService } from '../services/JobImportService';
import { logger } from '../utils/logger';
import { SortOrder } from 'mongoose';
import { checkForStalledImports } from '../utils/importTimeoutChecker';


export class ImportController {
  private jobImportService = new JobImportService();

  async triggerImport(req: Request, res: Response): Promise<void> {
    try {
      const { feedUrl } = req.body;
      
      // Create import log
      const importLogId = await this.jobImportService.createImportLog(
        feedUrl || 'all-feeds'
      );

      // Add job to queue
      const job = await jobImportQueue.add(
        'import-jobs',
        { feedUrl, importLogId },
        {
          priority: 1,
          delay: 0,
        }
      );

      logger.info(`Import job queued: ${job.id}`, { feedUrl, importLogId });

      res.status(202).json({
        success: true,
        message: 'Import job queued successfully',
        data: {
          jobId: job.id,
          importLogId,
          status: 'queued'
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to trigger import:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger import',
        error: errorMessage
      });
    }
  }

  async getImportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      // Check for stalled imports before returning results
      await checkForStalledImports();
      
      const filter: any = {};
      if (status) {
        filter.status = status;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Fix: Properly type the sort object
      const sortOptions: { [key: string]: SortOrder } = { createdAt: -1 };

      const importLogs = await ImportLog.find(filter)
        .sort(sortOptions)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .exec();

      const total = await ImportLog.countDocuments(filter);

      res.json({
        success: true,
        data: {
          imports: importLogs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to get import history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get import history',
        error: errorMessage
      });
    }
  }

  async getImportById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const importLog = await ImportLog.findById(id);
      if (!importLog) {
        res.status(404).json({
          success: false,
          message: 'Import log not found'
        });
        return;
      }

      res.json({
        success: true,
        data: importLog
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to get import by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get import',
        error: errorMessage
      });
    }
  }

  async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      // Check for stalled imports before returning queue status
      await checkForStalledImports();

      const waiting = await jobImportQueue.getWaiting();
      const active = await jobImportQueue.getActive();
      const completed = await jobImportQueue.getCompleted();
      const failed = await jobImportQueue.getFailed();

      res.json({
        success: true,
        data: {
          queue: {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
          },
          jobs: {
            waiting: waiting.slice(0, 10),
            active: active.slice(0, 10),
            failed: failed.slice(0, 10)
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to get queue status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue status',
        error: errorMessage
      });
    }
  }
}
