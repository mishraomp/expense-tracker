import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentsService } from './attachments.service';

const BULK_STATUS = {
  running: 'running',
  completed: 'completed',
  pending: 'pending',
  canceled: 'canceled',
} as const;

interface BulkUploadFile {
  file: Express.Multer.File;
  recordType: 'expense' | 'income';
  recordId?: string; // Optional: for suggested mapping
}

@Injectable()
export class BulkService {
  private readonly logger = new Logger(BulkService.name);
  private readonly CONCURRENCY_LIMIT = 3;

  constructor(
    private prisma: PrismaService,
    private attachmentsService: AttachmentsService,
  ) {}

  async startBulkImport(userId: string, files: BulkUploadFile[]) {
    this.logger.log(`Starting bulk import: ${files.length} files for user:${userId}`);

    // Create bulk job record
    const job = await this.prisma.bulk_import_jobs.create({
      data: {
        initiated_by_user_id: userId,
        total_files: files.length,
        status: BULK_STATUS.running,
        started_at: new Date(),
      },
    });

    // Process files asynchronously (fire and forget)
    this.processBulkFiles(job.id, files).catch((err) => {
      this.logger.error(`Bulk job ${job.id} failed: ${err.message}`);
    });

    return { jobId: job.id, status: job.status, totalFiles: files.length };
  }

  private async processBulkFiles(jobId: string, files: BulkUploadFile[]) {
    this.logger.log(`Processing bulk job ${jobId}: ${files.length} files`);
    const checksumCache = new Map<string, boolean>();
    let uploadedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process in batches with concurrency limit
    for (let i = 0; i < files.length; i += this.CONCURRENCY_LIMIT) {
      const batch = files.slice(i, i + this.CONCURRENCY_LIMIT);
      this.logger.log(
        `Bulk job ${jobId}: Processing batch ${Math.floor(i / this.CONCURRENCY_LIMIT) + 1}`,
      );

      const results = await Promise.allSettled(
        batch.map(async ({ file, recordType, recordId }) => {
          // Check for duplicates by checksum
          const checksum = await this.computeChecksum(file);
          if (checksumCache.has(checksum)) {
            this.logger.debug(`Bulk job ${jobId}: Duplicate file detected: ${file.originalname}`);
            duplicateCount++;
            return { status: 'duplicate' };
          }
          checksumCache.set(checksum, true);

          // Skip if no recordId provided and no auto-match
          if (!recordId) {
            this.logger.debug(
              `Bulk job ${jobId}: Skipped file (no recordId): ${file.originalname}`,
            );
            skippedCount++;
            return { status: 'skipped' };
          }

          // Upload attachment
          this.logger.debug(
            `Bulk job ${jobId}: Uploading file: ${file.originalname} -> ${recordType}:${recordId}`,
          );
          await this.attachmentsService.uploadAttachment({
            recordType,
            recordId,
            file,
            checksum,
          });

          uploadedCount++;
          this.logger.debug(`Bulk job ${jobId}: Successfully uploaded: ${file.originalname}`);
          return { status: 'uploaded' };
        }),
      );

      // Count errors
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          errorCount++;
          this.logger.error(
            `Bulk job ${jobId}: Error uploading file: ${batch[idx].file.originalname}`,
            result.reason,
          );
        }
      });

      // Update progress
      await this.updateJobProgress(jobId, {
        uploadedCount,
        duplicateCount,
        errorCount,
        skippedCount,
      });
      this.logger.log(
        `Bulk job ${jobId}: Progress - uploaded:${uploadedCount}, duplicates:${duplicateCount}, errors:${errorCount}, skipped:${skippedCount}`,
      );
    }

    // Mark job complete
    await this.prisma.bulk_import_jobs.update({
      where: { id: jobId },
      data: {
        status: BULK_STATUS.completed,
        uploaded_count: uploadedCount,
        duplicate_count: duplicateCount,
        error_count: errorCount,
        skipped_count: skippedCount,
      },
    });

    this.logger.log(
      `Bulk job ${jobId} completed: ${uploadedCount} uploaded, ${duplicateCount} duplicates, ${errorCount} errors, ${skippedCount} skipped`,
    );
  }

  private async updateJobProgress(
    jobId: string,
    counts: {
      uploadedCount: number;
      duplicateCount: number;
      errorCount: number;
      skippedCount: number;
    },
  ) {
    await this.prisma.bulk_import_jobs.update({
      where: { id: jobId },
      data: counts,
    });
  }

  async getJobStatus(jobId: string) {
    const job = await this.prisma.bulk_import_jobs.findUnique({
      where: { id: jobId },
    });

    return job;
  }

  async cancelJob(jobId: string) {
    const job = await this.prisma.bulk_import_jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    // Only allow canceling pending or running jobs
    if (job.status !== BULK_STATUS.pending && job.status !== BULK_STATUS.running) {
      return job; // Already completed/canceled/failed
    }

    const updatedJob = await this.prisma.bulk_import_jobs.update({
      where: { id: jobId },
      data: {
        status: BULK_STATUS.canceled,
      },
    });

    this.logger.log(`Bulk job ${jobId} canceled`);

    return updatedJob;
  }

  private async computeChecksum(file: Express.Multer.File): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(file.buffer).digest('hex');
  }
}
