import mongoose, { Document, Schema } from 'mongoose';

export interface IImportLog extends Document {
  fileName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: number;
  errorDetails: Array<{
    jobId?: string;
    error: string;
    timestamp: Date;
  }>;
  processingTimeMs?: number;
}

const importLogSchema = new Schema<IImportLog>({
  fileName: { type: String, required: true },
  startTime: { type: Date, required: true, default: Date.now },
  endTime: { type: Date },
  status: { 
    type: String, 
    enum: ['running', 'completed', 'failed'], 
    default: 'running' 
  },
  totalFetched: { type: Number, default: 0 },
  totalImported: { type: Number, default: 0 },
  newJobs: { type: Number, default: 0 },
  updatedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  errorDetails: [{
    jobId: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
  processingTimeMs: Number
}, {
  timestamps: true
});

export const ImportLog = mongoose.model<IImportLog>('ImportLog', importLogSchema);
