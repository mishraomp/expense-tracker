import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleDriveProvider } from './providers/google-drive.provider';

export interface OrphanFile {
  driveFileId: string;
  originalFilename: string;
  sizeBytes: number;
  detectedAt: Date;
}

/**
 * OrphanScanService detects Google Drive files that are not tracked in the database.
 * These are files uploaded to Drive but missing corresponding Attachment records.
 */
@Injectable()
export class OrphanScanService {
  private readonly logger = new Logger(OrphanScanService.name);

  constructor(
    private prisma: PrismaService,
    private googleDrive: GoogleDriveProvider,
  ) {}

  /**
   * Scans Google Drive folder for orphan files (not in database).
   * Returns list of orphaned files with metadata.
   */
  async scanOrphans(): Promise<OrphanFile[]> {
    const startTime = Date.now();
    this.logger.log('Starting orphan scan...');

    // Step 1: Get all file IDs from Google Drive
    const driveFiles = await this.googleDrive.listAllFiles();
    this.logger.log(`Found ${driveFiles.length} files in Google Drive`);

    // Step 2: Get all tracked file IDs from database
    const trackedAttachments = await this.prisma.attachments.findMany({
      select: { drive_file_id: true },
    });
    const trackedFileIds = new Set(trackedAttachments.map((a) => a.drive_file_id));
    this.logger.log(`Found ${trackedFileIds.size} tracked attachments in database`);

    // Step 3: Identify orphans (in Drive but not in DB)
    const orphans: OrphanFile[] = [];
    const detectedAt = new Date();

    for (const file of driveFiles) {
      if (!trackedFileIds.has(file.id)) {
        orphans.push({
          driveFileId: file.id,
          originalFilename: file.name,
          sizeBytes: parseInt(file.size || '0', 10),
          detectedAt,
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Orphan scan complete: found ${orphans.length} orphans in ${duration}ms`);

    return orphans;
  }

  /**
   * Deletes an orphaned file from Google Drive.
   * Use with caution - this permanently removes the file from Drive.
   */
  async deleteOrphan(driveFileId: string, userId: string = 'system'): Promise<void> {
    this.logger.log(`Deleting orphan file: ${driveFileId}`);
    await this.googleDrive.deleteFile(userId, driveFileId);
    this.logger.log(`Orphan file ${driveFileId} deleted from Drive`);
  }

  /**
   * Adopts an orphaned file by creating an Attachment record for it.
   * Useful for retroactively linking existing Drive files to records.
   */
  async adoptOrphan(
    driveFileId: string,
    recordType: 'expense' | 'income',
    recordId: string,
  ): Promise<void> {
    // Per-user OAuth model does not support cross-user orphan adoption without a user context.
    // This method is deprecated; retain signature for backward compatibility.
    throw new Error('Adopt orphan not supported under per-user Google Drive OAuth model');
  }
}
