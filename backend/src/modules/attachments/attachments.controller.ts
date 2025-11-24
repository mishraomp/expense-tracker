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
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { AttachmentsService } from './attachments.service';
import { OrphanScanService } from './orphan-scan.service';

@Controller({ version: '1', path: 'attachments' })
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(
    private service: AttachmentsService,
    private orphanService: OrphanScanService,
  ) {}

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

  @Get('/records/:type/:id/attachments')
  @HttpCode(200)
  async list(@Param('type') type: 'expense' | 'income', @Param('id') id: string) {
    return this.service.listAttachments(type, id);
  }

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
