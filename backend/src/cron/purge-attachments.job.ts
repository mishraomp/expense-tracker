import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleDriveProvider } from '../modules/attachments/providers/google-drive.provider';

const ATTACHMENT_STATUS = { REMOVED: 'REMOVED' } as const;

/**
 * PurgeAttachmentsJob - Scheduled job to permanently delete soft-deleted attachments
 * that have exceeded their retention period.
 *
 * Runs daily at 2 AM to:
 * 1. Find attachments with status=REMOVED and retentionExpiresAt < now
 * 2. Delete files from Google Drive
 * 3. Delete attachment records from database
 *
 * Schedule: Daily at 2:00 AM (adjustable via CRON_PURGE_SCHEDULE env var)
 */
@Injectable()
export class PurgeAttachmentsJob {
  private readonly logger = new Logger(PurgeAttachmentsJob.name);

  constructor(
    private prisma: PrismaService,
    private googleDrive: GoogleDriveProvider,
  ) {}

  // Run daily at 2 AM (or configure via env: process.env.CRON_PURGE_SCHEDULE)
  @Cron(process.env.CRON_PURGE_SCHEDULE || CronExpression.EVERY_DAY_AT_2AM)
  async handlePurge() {
    const startTime = Date.now();
    this.logger.log('Starting attachment purge job...');

    try {
      // Find expired attachments
      const expiredAttachments = await this.prisma.attachments.findMany({
        where: {
          status: ATTACHMENT_STATUS.REMOVED,
          retention_expires_at: {
            lt: new Date(), // Less than current time
          },
        },
        select: {
          id: true,
          drive_file_id: true,
          original_filename: true,
          uploaded_by_user_id: true,
        },
      });

      this.logger.log(`Found ${expiredAttachments.length} expired attachments to purge`);

      if (expiredAttachments.length === 0) {
        this.logger.log('No attachments to purge. Job complete.');
        return;
      }

      let successCount = 0;
      let driveErrorCount = 0;
      let dbErrorCount = 0;

      for (const attachment of expiredAttachments) {
        try {
          // Step 1: Delete from Google Drive
          try {
            await this.googleDrive.deleteFile(
              attachment.uploaded_by_user_id,
              attachment.drive_file_id,
            );
            this.logger.debug(
              `Deleted Drive file: ${attachment.drive_file_id} (${attachment.original_filename})`,
            );
          } catch (driveError) {
            this.logger.error(
              `Failed to delete Drive file ${attachment.drive_file_id}: ${driveError.message}`,
              driveError.stack,
            );
            driveErrorCount++;
            // Continue to delete DB record even if Drive deletion fails
          }

          // Step 2: Delete from database
          try {
            await this.prisma.attachments.delete({
              where: { id: attachment.id },
            });
            this.logger.debug(`Deleted attachment record: ${attachment.id}`);
            successCount++;
          } catch (dbError) {
            this.logger.error(
              `Failed to delete attachment record ${attachment.id}: ${dbError.message}`,
              dbError.stack,
            );
            dbErrorCount++;
          }
        } catch (error) {
          this.logger.error(
            `Unexpected error purging attachment ${attachment.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Purge job complete in ${duration}ms: ` +
          `${successCount} purged, ${driveErrorCount} Drive errors, ${dbErrorCount} DB errors`,
      );
    } catch (error) {
      this.logger.error(`Purge job failed: ${error.message}`, error.stack);
    }
  }
}
