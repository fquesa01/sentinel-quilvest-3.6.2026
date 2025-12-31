import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { DeduplicationService } from "./deduplication-service";
import { EmailThreadingService } from "./email-threading-service";
import { DocumentFamilyService } from "./document-family-service";

export type ProcessingJobType = "deduplication" | "threading" | "family_grouping" | "full_processing";
type ProcessingJobStatusType = typeof schema.processingJobStatusEnum.enumValues[number];
type ProcessingExceptionTypeType = typeof schema.processingExceptionTypeEnum.enumValues[number];

export interface ProcessingProgress {
  jobId: string;
  status: ProcessingJobStatusType;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  percentComplete: number;
}

export interface ProcessingResult {
  success: boolean;
  jobId: string;
  summary: {
    totalDocuments: number;
    exactDuplicates?: number;
    nearDuplicateClusters?: number;
    threadsCreated?: number;
    inclusiveEmails?: number;
    familiesCreated?: number;
    attachmentsGrouped?: number;
    exceptionsCount: number;
  };
}

export class ProcessingJobsService {
  static async createJob(
    caseId: string,
    jobName: string,
    userId: string,
    totalFiles: number
  ): Promise<string> {
    const [job] = await db
      .insert(schema.processingJobs)
      .values({
        caseId,
        jobName,
        status: "pending",
        totalFiles,
        processedFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        createdBy: userId,
      })
      .returning();

    return job.id;
  }

  static async startJob(jobId: string): Promise<void> {
    await db
      .update(schema.processingJobs)
      .set({
        status: "processing",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.processingJobs.id, jobId));
  }

  static async updateJobProgress(
    jobId: string,
    processedFiles: number,
    failedFiles: number = 0,
    skippedFiles: number = 0
  ): Promise<void> {
    await db
      .update(schema.processingJobs)
      .set({
        processedFiles,
        failedFiles,
        skippedFiles,
        updatedAt: new Date(),
      })
      .where(eq(schema.processingJobs.id, jobId));
  }

  static async completeJob(
    jobId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await db
      .update(schema.processingJobs)
      .set({
        status: success ? "completed" : "failed",
        completedAt: new Date(),
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.processingJobs.id, jobId));
  }

  static async recordException(
    jobId: string,
    fileName: string,
    exceptionType: ProcessingExceptionTypeType,
    exceptionMessage: string,
    communicationId?: string,
    filePath?: string,
    fileSize?: number
  ): Promise<void> {
    await db.insert(schema.processingExceptions).values({
      jobId,
      communicationId,
      fileName,
      filePath,
      fileSize: fileSize || null,
      exceptionType,
      exceptionMessage,
      resolved: false,
      retryCount: 0,
    });

    await db
      .update(schema.processingJobs)
      .set({
        failedFiles: sql`${schema.processingJobs.failedFiles} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.processingJobs.id, jobId));
  }

  static async getJobProgress(jobId: string): Promise<ProcessingProgress | null> {
    const [job] = await db
      .select()
      .from(schema.processingJobs)
      .where(eq(schema.processingJobs.id, jobId));

    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      failedFiles: job.failedFiles,
      skippedFiles: job.skippedFiles,
      percentComplete:
        job.totalFiles > 0 ? Math.round((job.processedFiles / job.totalFiles) * 100) : 0,
    };
  }

  static async getJobsForCase(caseId: string): Promise<schema.ProcessingJob[]> {
    return db
      .select()
      .from(schema.processingJobs)
      .where(eq(schema.processingJobs.caseId, caseId))
      .orderBy(desc(schema.processingJobs.createdAt));
  }

  static async getJobExceptions(jobId: string): Promise<schema.ProcessingException[]> {
    return db
      .select()
      .from(schema.processingExceptions)
      .where(eq(schema.processingExceptions.jobId, jobId))
      .orderBy(desc(schema.processingExceptions.createdAt));
  }

  static async resolveException(
    exceptionId: string,
    resolution: string,
    userId: string
  ): Promise<void> {
    await db
      .update(schema.processingExceptions)
      .set({
        resolved: true,
        resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
      })
      .where(eq(schema.processingExceptions.id, exceptionId));
  }

  static async runFullProcessing(
    caseId: string,
    userId: string,
    onProgress?: (stage: string, processed: number, total: number) => void
  ): Promise<ProcessingResult> {
    const documents = await db
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.caseId, caseId));

    const totalDocs = documents.length;
    const jobId = await this.createJob(caseId, "Full Document Processing", userId, totalDocs);
    
    try {
      await this.startJob(jobId);

      let exactDuplicates = 0;
      let nearDuplicateClusters = 0;
      let threadsCreated = 0;
      let inclusiveEmails = 0;
      let familiesCreated = 0;
      let attachmentsGrouped = 0;
      let exceptionsCount = 0;

      if (onProgress) onProgress("deduplication", 0, totalDocs);
      const dedupResult = await DeduplicationService.runCaseDeduplication(
        caseId,
        (processed, total) => {
          this.updateJobProgress(jobId, processed);
          if (onProgress) onProgress("deduplication", processed, total);
        }
      );
      exactDuplicates = dedupResult.exactDuplicates;
      nearDuplicateClusters = dedupResult.nearDuplicateClusters;

      if (onProgress) onProgress("threading", 0, totalDocs);
      const threadResult = await EmailThreadingService.runCaseThreading(
        caseId,
        (processed, total) => {
          if (onProgress) onProgress("threading", processed, total);
        }
      );
      threadsCreated = threadResult.threadsCreated;
      inclusiveEmails = threadResult.inclusiveEmails;

      if (onProgress) onProgress("family_grouping", 0, totalDocs);
      const familyResult = await DocumentFamilyService.runCaseFamilyGrouping(
        caseId,
        (processed, total) => {
          if (onProgress) onProgress("family_grouping", processed, total);
        }
      );
      familiesCreated = familyResult.familiesCreated;
      attachmentsGrouped = familyResult.attachmentsGrouped;

      const exceptions = await this.getJobExceptions(jobId);
      exceptionsCount = exceptions.length;

      await this.completeJob(jobId, true);

      return {
        success: true,
        jobId,
        summary: {
          totalDocuments: totalDocs,
          exactDuplicates,
          nearDuplicateClusters,
          threadsCreated,
          inclusiveEmails,
          familiesCreated,
          attachmentsGrouped,
          exceptionsCount,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.completeJob(jobId, false, errorMessage);
      
      return {
        success: false,
        jobId,
        summary: {
          totalDocuments: totalDocs,
          exceptionsCount: 1,
        },
      };
    }
  }

  static async getExceptionsSummary(caseId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    unresolved: number;
  }> {
    const jobs = await this.getJobsForCase(caseId);
    
    let total = 0;
    const byType: Record<string, number> = {};
    let unresolved = 0;

    for (const job of jobs) {
      const exceptions = await this.getJobExceptions(job.id);
      total += exceptions.length;
      
      for (const exception of exceptions) {
        byType[exception.exceptionType] = (byType[exception.exceptionType] || 0) + 1;
        if (!exception.resolved) {
          unresolved++;
        }
      }
    }

    return { total, byType, unresolved };
  }

  static async retryException(exceptionId: string): Promise<boolean> {
    const [exception] = await db
      .select()
      .from(schema.processingExceptions)
      .where(eq(schema.processingExceptions.id, exceptionId));

    if (!exception || exception.resolved) {
      return false;
    }

    await db
      .update(schema.processingExceptions)
      .set({
        retryCount: exception.retryCount + 1,
        lastRetryAt: new Date(),
      })
      .where(eq(schema.processingExceptions.id, exceptionId));

    return true;
  }
}

export default ProcessingJobsService;
