import IORedis from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxLoadingTimeout: 60000,
};

export const redisConnection = new IORedis(redisConfig);

// Job Import Queue
export const jobImportQueue = new Queue('job-import', { 
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.RETRY_DELAY || '5000'),
    },
  }
});

export const queueEvents = new QueueEvents('job-import', { connection: redisConnection });
