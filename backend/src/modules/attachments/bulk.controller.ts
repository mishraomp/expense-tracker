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
import { BulkService } from './bulk.service';

interface BulkUploadDto {
  recordType: 'expense' | 'income';
  recordIds?: string[]; // Optional mapping
}

@Controller({ version: '1', path: 'attachments/bulk' })
export class BulkController {
  private readonly logger = new Logger(BulkController.name);

  constructor(private readonly bulkService: BulkService) {}

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
