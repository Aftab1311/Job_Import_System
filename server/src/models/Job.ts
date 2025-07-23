import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  title: string;
  company: string;
  location: string;
  description: string;
  jobType: string;
  category: string;
  salary?: string;
  publishedAt: Date;
  externalId: string;
  sourceUrl: string;
  sourceFeed: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>({
  title: { type: String, required: true, index: true },
  company: { type: String, required: true, index: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  jobType: { type: String, required: true },
  category: { type: String, required: true, index: true },
  salary: { type: String },
  publishedAt: { type: Date, required: true },
  externalId: { type: String, required: true, unique: true },
  sourceUrl: { type: String, required: true },
  sourceFeed: { type: String, required: true, index: true },
}, {
  timestamps: true,
});

// Compound index for efficient querying
jobSchema.index({ sourceFeed: 1, externalId: 1 }, { unique: true });

export const Job = mongoose.model<IJob>('Job', jobSchema);
