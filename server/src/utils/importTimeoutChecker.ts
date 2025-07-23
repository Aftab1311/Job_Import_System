import { ImportLog } from '../models/ImportLog';
import { logger } from './logger';

const TIMEOUT_MINUTES = 2;

export async function checkForStalledImports(): Promise<void> {
  try {
    const timeoutThreshold = new Date();
    timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - TIMEOUT_MINUTES);

    const stalledImports = await ImportLog.find({
      status: 'running',
      startTime: { $lt: timeoutThreshold }
    });

    for (const import_ of stalledImports) {
      logger.warn(`Import ${import_._id} timed out after ${TIMEOUT_MINUTES} minutes`);
      
      await ImportLog.findByIdAndUpdate(import_._id, {
        status: 'failed',
        endTime: new Date(),
        errorDetails: [
          ...(import_.errorDetails || []),
          {
            error: `Import timed out after ${TIMEOUT_MINUTES} minutes`,
            timestamp: new Date()
          }
        ]
      });
    }
  } catch (error) {
    logger.error('Error checking for stalled imports:', error);
  }
}