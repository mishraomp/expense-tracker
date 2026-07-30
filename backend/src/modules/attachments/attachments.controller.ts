import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  HttpCode,
  Put,
  Delete,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { AttachmentsService } from './attachments.service';
import { OrphanScanService } from './orphan-scan.service';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'attachments' })
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(
    private service: AttachmentsService,
    private orphanService: OrphanScanService,
  ) {}

  /**
   * Uploads a file to the caller's own Google Drive and links it to an expense or income record.
   * Limited to 5MB (env-configurable) and MIME types PDF/PNG/JPEG/XLSX/DOCX only. Max 5 attachments
   * per record (env-configurable).
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  async upload(@Body() dto: UploadAttachmentDto, @UploadedFile() file: Express.Multer.File) {
    const attachment = await this.service.uploadAttachment({
      recordType: dto.recordType,
      recordId: dto.recordId,
      file,
    });
    return {
      id: attachment.id,
      filename: attachment.original_filename,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes,
      webViewLink: attachment.web_view_link,
      status: attachment.status,
      createdAt: attachment.created_at,
      retentionExpiresAt: attachment.retention_expires_at ?? null,
    };
  }

  /**
   * Lists ACTIVE attachments for a record (oldest first) — removed attachments are hidden.
   * Response shape (originalFilename field, no retentionExpiresAt) differs from upload/replace/remove
   * responses (filename field, includes retentionExpiresAt).
   */
  @Get('/records/:type/:id/attachments')
  @ApiParam({ name: 'type', enum: ['expense', 'income'] })
  @HttpCode(200)
  async list(@Param('type') type: 'expense' | 'income', @Param('id') id: string) {
    return this.service.listAttachments(type, id);
  }

  /**
   * Uploads a new file to Drive and marks the old attachment REMOVED with a 90-day retention
   * window — the old Drive file itself is not deleted immediately.
   */
  @Put(':id')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @HttpCode(200)
  async replace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('checksum') checksum?: string,
  ) {
    const attachment = await this.service.replaceAttachment(id, file, checksum);
    return {
      id: attachment.id,
      filename: attachment.original_filename,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes,
      webViewLink: attachment.web_view_link,
      status: attachment.status,
      createdAt: attachment.created_at,
      retentionExpiresAt: attachment.retention_expires_at ?? null,
    };
  }

  /**
   * Soft-delete: marks the attachment REMOVED and schedules Drive deletion after a 90-day
   * retention window. Not an immediate delete.
   */
  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    const attachment = await this.service.removeAttachment(id);
    return {
      id: attachment.id,
      filename: attachment.original_filename,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes,
      webViewLink: attachment.web_view_link,
      status: attachment.status,
      createdAt: attachment.created_at,
      retentionExpiresAt: attachment.retention_expires_at,
    };
  }

  /**
   * IMPORTANT — always returns an empty list today. Orphan scanning requires iterating all
   * users' Drive files, which isn't supported under the current per-user OAuth model
   * (GoogleDriveProvider.listAllFiles() is hard-stubbed to return []). This is a known
   * limitation, not a sign there are no orphans.
   */
  @Get('orphans')
  @HttpCode(200)
  async listOrphans() {
    const startTime = Date.now();
    this.logger.log('GET /api/attachments/orphans');

    const orphans = await this.orphanService.scanOrphans();

    const duration = Date.now() - startTime;
    this.logger.log(`Orphan scan completed in ${duration}ms: ${orphans.length} orphans found`);

    return {
      success: true,
      data: {
        orphans,
        count: orphans.length,
      },
    };
  }
}
