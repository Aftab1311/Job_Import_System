import { Request, Response } from 'express';
import { Job } from '../models/Job';
import { logger } from '../utils/logger';
import { SortOrder } from 'mongoose';

export class JobController {
  async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category, 
        jobType, 
        company, 
        location,
        search 
      } = req.query;

      const filter: any = {};
      
      if (category) filter.category = category;
      if (jobType) filter.jobType = jobType;
      if (company) filter.company = new RegExp(company as string, 'i');
      if (location) filter.location = new RegExp(location as string, 'i');
      if (search) {
        filter.$or = [
          { title: new RegExp(search as string, 'i') },
          { description: new RegExp(search as string, 'i') },
          { company: new RegExp(search as string, 'i') }
        ];
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: { publishedAt: -1 as SortOrder } // Fix: Cast -1 to SortOrder
      };

      const jobs = await Job.find(filter)
        .sort(options.sort)
        .limit(options.limit)
        .skip((options.page - 1) * options.limit)
        .exec();

      const total = await Job.countDocuments(filter);

      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: options.page,
            limit: options.limit,
            total,
            pages: Math.ceil(total / options.limit)
          }
        }
      });
    } catch (error: any) { // Fix: Type the error parameter
      logger.error('Failed to get jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get jobs',
        error: error?.message || 'Unknown error occurred'
      });
    }
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const job = await Job.findById(id);
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found'
        });
        return;
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error: any) { // Fix: Type the error parameter
      logger.error('Failed to get job by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job',
        error: error?.message || 'Unknown error occurred'
      });
    }
  }

  async getJobStats(req: Request, res: Response): Promise<void> {
    try {
      const totalJobs = await Job.countDocuments();
      const jobsByCategory = await Job.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      const jobsByType = await Job.aggregate([
        { $group: { _id: '$jobType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const recentJobs = await Job.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      res.json({
        success: true,
        data: {
          totalJobs,
          recentJobs,
          jobsByCategory,
          jobsByType
        }
      });
    } catch (error: any) { // Fix: Type the error parameter
      logger.error('Failed to get job stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job statistics',
        error: error?.message || 'Unknown error occurred'
      });
    }
  }
}
