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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { AttachmentsService } from './attachments.service';
import { OrphanScanService } from './orphan-scan.service';
import {
  AttachmentListItemResponseDto,
  AttachmentResponseDto,
} from './dto/attachment-response.dto';
import { OrphanScanResponseDto } from './dto/orphan-scan-response.dto';

@ApiBearerAuth('bearer')
@ApiTags('Attachments')
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
  @ApiOperation({
    summary: 'Upload an attachment',
    description:
      "Uploads a file to the caller's own Google Drive and links it to an expense or income " +
      'record. Limited to 5MB (env-configurable) and MIME types PDF/PNG/JPEG/XLSX/DOCX only. ' +
      'Max 5 attachments per record (env-configurable). Fails with 400 if the record does not exist.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'recordType', 'recordId'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'The file to upload.' },
        recordType: {
          type: 'string',
          enum: ['expense', 'income'],
          description: 'Which kind of record recordId refers to.',
        },
        recordId: {
          type: 'string',
          description:
            'ID of an existing expense or income record. Upload fails with 400 if it does not exist.',
        },
        checksum: { type: 'string', description: 'Optional SHA-256 checksum.' },
      },
    },
  })
  @HttpCode(200)
  @ApiOkResponse({ description: 'Attachment uploaded successfully.', type: AttachmentResponseDto })
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
  @ApiOperation({
    summary: 'List active attachments for a record',
    description:
      'Lists ACTIVE attachments for a record (oldest first) — removed attachments are hidden. ' +
      'Response shape (originalFilename field, no retentionExpiresAt) differs from the ' +
      'upload/replace/remove responses (filename field, includes retentionExpiresAt).',
  })
  @ApiParam({
    name: 'type',
    enum: ['expense', 'income'],
    description: 'Which kind of record id refers to.',
  })
  @ApiParam({ name: 'id', description: 'Expense or income UUID.' })
  @ApiOkResponse({
    description: 'Active attachments for the record.',
    type: [AttachmentListItemResponseDto],
  })
  @HttpCode(200)
  async list(@Param('type') type: 'expense' | 'income', @Param('id') id: string) {
    return this.service.listAttachments(type, id);
  }

  /**
   * Uploads a new file to Drive and marks the old attachment REMOVED with a 90-day retention
   * window — the old Drive file itself is not deleted immediately.
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Replace an attachment',
    description:
      'Uploads a new file to Drive and marks the old attachment REMOVED with a 90-day retention ' +
      'window — the old Drive file itself is not deleted immediately. Fails with 404 if the ' +
      'attachment does not exist, or 400 if it is already REMOVED.',
  })
  @ApiParam({ name: 'id', description: 'Attachment UUID.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'The replacement file.' },
        checksum: { type: 'string', description: 'Optional SHA-256 checksum.' },
      },
    },
  })
  @ApiOkResponse({ description: 'Attachment replaced successfully.', type: AttachmentResponseDto })
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
  @ApiOperation({
    summary: 'Remove an attachment',
    description:
      'Soft-delete: marks the attachment REMOVED and schedules Drive deletion after a 90-day ' +
      'retention window. Not an immediate delete — the Drive file still exists until the ' +
      'retention window elapses. Fails with 404 if the attachment does not exist.',
  })
  @ApiParam({ name: 'id', description: 'Attachment UUID.' })
  @ApiOkResponse({ description: 'Attachment marked as removed.', type: AttachmentResponseDto })
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
  @ApiOperation({
    summary: 'Scan for orphaned attachments',
    description:
      'IMPORTANT — always returns an empty list today. Orphan scanning requires iterating all ' +
      "users' Drive files, which isn't supported under the current per-user OAuth model. This " +
      'is a known limitation, not a sign there are no orphans.',
  })
  @ApiOkResponse({ description: 'Orphan scan result.', type: OrphanScanResponseDto })
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
