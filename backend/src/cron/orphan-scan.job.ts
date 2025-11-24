import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrphanScanService } from '../modules/attachments/orphan-scan.service';

/**
 * OrphanScanJob - Scheduled job to detect orphaned Google Drive files.
 *
 * Runs weekly on Sundays at 3 AM to:
 * 1. Scan Google Drive for files not linked to any database record
 * 2. Log orphan count for monitoring/alerting
 * 3. (Optional) Trigger notifications or automated cleanup based on policy
 *
 * Schedule: Weekly on Sunday at 3:00 AM (adjustable via CRON_ORPHAN_SCAN_SCHEDULE env var)
 */
@Injectable()
export class OrphanScanJob {
  private readonly logger = new Logger(OrphanScanJob.name);

  constructor(private orphanScanService: OrphanScanService) {}

  // Run weekly on Sunday at 3 AM (or configure via env: process.env.CRON_ORPHAN_SCAN_SCHEDULE)
  @Cron(process.env.CRON_ORPHAN_SCAN_SCHEDULE || CronExpression.EVERY_WEEK)
  async handleScan() {
    const startTime = Date.now();
    this.logger.log('Starting scheduled orphan scan...');

    try {
      const orphans = await this.orphanScanService.scanOrphans();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Orphan scan complete in ${duration}ms: Found ${orphans.length} orphan file(s)`,
      );

      if (orphans.length > 0) {
        this.logger.warn(
          `Orphaned files detected: ${orphans.map((o) => o.originalFilename).join(', ')}`,
        );
        // TODO: Trigger notifications or alerts for ops team
        // TODO: Optionally delete orphans after threshold (e.g., >30 days old)
      }
    } catch (error) {
      this.logger.error(`Orphan scan job failed: ${error.message}`, error.stack);
    }
  }
}
