import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const processingJobs = pgTable("processing_jobs", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  frequencyCount: integer("frequency_count"),
  audioFileName: text("audio_file_name"),
  pdfFileName: text("pdf_file_name"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  frequencyMin: real("frequency_min"),
  frequencyMax: real("frequency_max"),
  aroma_id: text("aroma_id"),
  company_name: text("company_name")
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true
});

export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;

// File upload validation schema
export const fileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, "Must be a file")
    .refine((file) => file.size <= 50 * 1024 * 1024, "File size must be less than 50MB")
    .refine((file) => {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      return validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    }, "File must be an Excel file (.xlsx or .xls)")
});

export type FileUpload = z.infer<typeof fileUploadSchema>;
