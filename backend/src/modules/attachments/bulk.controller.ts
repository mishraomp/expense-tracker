import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BulkService } from './bulk.service';
import { BulkUploadDto } from './dto/bulk-upload.dto';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'attachments/bulk' })
export class BulkController {
  private readonly logger = new Logger(BulkController.name);

  constructor(private readonly bulkService: BulkService) {}

  /**
   * Accepts up to 50 files. Processing is asynchronous / fire-and-forget — returns 202 with
   * just a jobId; poll GET /attachments/bulk/{jobId} for status.
   *
   * KNOWN LIMITATION: unlike the single-upload endpoint, file size/MIME validation
   * (FileValidationInterceptor) is NOT applied here — any file type/size is currently
   * accepted at this layer.
   *
   * KNOWN LIMITATION: initiated_by_user_id is currently hardcoded to the literal string
   * 'system-user' rather than the authenticated caller (see the TODO in the handler).
   *
   * Files with no matching recordId are silently skipped, not auto-matched (the
   * auto-matching utility BulkMappingUtil exists in the codebase but is not currently wired
   * up anywhere).
   *
   * Duplicate detection (by SHA-256) only catches duplicates within the same request batch,
   * not against attachments already stored from earlier uploads.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FilesInterceptor('files', 50)) // Max 50 files
  async startBulkUpload(@UploadedFiles() files: Express.Multer.File[], @Body() dto: BulkUploadDto) {
    const startTime = Date.now();
    this.logger.log(`POST /api/attachments/bulk: ${files.length} files`);

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (!dto.recordType || !['expense', 'income'].includes(dto.recordType)) {
      throw new BadRequestException('Invalid recordType');
    }

    // Validate recordIds length matches files if provided
    if (dto.recordIds && dto.recordIds.length !== files.length) {
      throw new BadRequestException(
        `recordIds length (${dto.recordIds.length}) must match files count (${files.length})`,
      );
    }

    // Map files with optional recordIds
    const mappedFiles = files.map((file, index) => ({
      file,
      recordType: dto.recordType,
      recordId: dto.recordIds?.[index], // undefined if not provided
    }));

    // TODO: Extract userId from JWT token when auth is integrated
    const userId = 'system-user';

    const result = await this.bulkService.startBulkImport(userId, mappedFiles);

    const duration = Date.now() - startTime;
    this.logger.log(`Bulk job ${result.jobId} started in ${duration}ms`);

    return {
      success: true,
      data: result,
    };
  }

  /** Gets the status of a bulk upload job. */
  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    this.logger.log(`GET /api/attachments/bulk/${jobId}`);

    const job = await this.bulkService.getJobStatus(jobId);

    if (!job) {
      throw new NotFoundException(`Bulk job ${jobId} not found`);
    }

    return {
      success: true,
      data: job,
    };
  }

  /**
   * Cancels a pending or running job. Calling this on an already completed/canceled/failed
   * job is a silent no-op — it still returns 200 with the job unchanged, not an error.
   */
  @Patch(':jobId')
  async cancelJob(@Param('jobId') jobId: string) {
    this.logger.log(`PATCH /api/attachments/bulk/${jobId} (cancel)`);

    const job = await this.bulkService.cancelJob(jobId);

    if (!job) {
      throw new NotFoundException(`Bulk job ${jobId} not found`);
    }

    return {
      success: true,
      data: job,
    };
  }
}
