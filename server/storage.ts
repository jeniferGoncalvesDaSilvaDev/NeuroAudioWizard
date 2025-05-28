import { processingJobs, type ProcessingJob, type InsertProcessingJob } from "@shared/schema";

export interface IStorage {
  getJob(id: number): Promise<ProcessingJob | undefined>;
  createJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  updateJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  getRecentJobs(limit?: number): Promise<ProcessingJob[]>;
  deleteJob(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private jobs: Map<number, ProcessingJob>;
  private currentId: number;

  constructor() {
    this.jobs = new Map();
    this.currentId = 1;
  }

  async getJob(id: number): Promise<ProcessingJob | undefined> {
    return this.jobs.get(id);
  }

  async createJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = this.currentId++;
    const job: ProcessingJob = {
      id,
      fileName: insertJob.fileName,
      originalName: insertJob.originalName,
      status: insertJob.status || "pending",
      frequencyCount: insertJob.frequencyCount ?? null,
      audioFileName: insertJob.audioFileName ?? null,
      pdfFileName: insertJob.pdfFileName ?? null,
      errorMessage: insertJob.errorMessage ?? null,
      frequencyMin: insertJob.frequencyMin ?? null,
      frequencyMax: insertJob.frequencyMax ?? null,
      aroma_id: insertJob.aroma_id ?? null,
      company_name: insertJob.company_name ?? null,
      createdAt: new Date(),
      completedAt: null
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    if (updates.status === "completed" || updates.status === "failed") {
      updatedJob.completedAt = new Date();
    }
    
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async getRecentJobs(limit: number = 10): Promise<ProcessingJob[]> {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }
}

export const storage = new MemStorage();
