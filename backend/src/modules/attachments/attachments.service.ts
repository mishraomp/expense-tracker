import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LimitCheckService } from './services/limit-check.service';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import { sha256Hex } from '../../common/utils/checksum';

// Status constants (string values in DB)
const ATTACHMENT_STATUS = { ACTIVE: 'ACTIVE', REMOVED: 'REMOVED' } as const;
type AttachmentStatusType = (typeof ATTACHMENT_STATUS)[keyof typeof ATTACHMENT_STATUS];

interface UploadArgs {
  recordType: 'expense' | 'income';
  recordId: string;
  file: Express.Multer.File;
  checksum?: string;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private prisma: PrismaService,
    private limitCheck: LimitCheckService,
    private drive: GoogleDriveProvider,
  ) {}

  async uploadAttachment(args: UploadArgs) {
    const { recordType, recordId, file } = args;
    const startTime = Date.now();

    this.logger.log(`Starting upload: ${file.originalname} for ${recordType}:${recordId}`);

    if (!file) throw new BadRequestException('File missing');

    // Fetch associated record for required metadata
    const record = await (recordType === 'expense'
      ? this.prisma.expense.findUnique({ where: { id: recordId } })
      : this.prisma.income.findUnique({ where: { id: recordId } }));
    if (!record) {
      this.logger.warn(`Upload failed: ${recordType}:${recordId} not found`);
      throw new BadRequestException('Record not found');
    }

    // Enforce max per record
    await this.limitCheck.assertCanAttach(recordType, recordId);

    // Compute checksum
    const checksum = args.checksum || sha256Hex(file.buffer);
    this.logger.debug(`Computed checksum: ${checksum.substring(0, 8)}... for ${file.originalname}`);

    // Ensure user folder (per-user private) - userId from record
    await this.drive.createUserFolderIfMissing(record.userId);

    const uploadResult = await this.drive.uploadFile({
      userId: record.userId,
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      recordType,
      recordId,
      checksum,
    });

    // Persist metadata
    const attachment = await this.prisma.attachments.create({
      data: {
        drive_file_id: uploadResult.driveFileId,
        linked_expense_id: recordType === 'expense' ? recordId : null,
        linked_income_id: recordType === 'income' ? recordId : null,
        mime_type: uploadResult.mimeType || file.mimetype,
        size_bytes: uploadResult.sizeBytes || file.size,
        original_filename: uploadResult.originalFilename || file.originalname,
        checksum,
        web_view_link: uploadResult.webViewLink,
        uploaded_by_user_id: record.userId,
        drive_record_type: recordType === 'expense' ? 'EXPENSE' : 'INCOME',
        drive_record_date: (record as any).date,
        drive_amount_minor_units: BigInt(Math.round(Number((record as any).amount) * 100)),
        drive_category_id: recordType === 'expense' ? (record as any).categoryId : null,
        status: ATTACHMENT_STATUS.ACTIVE,
      },
    });

    const duration = Date.now() - startTime;
    this.logger.log(
      `Upload complete: ${attachment.id} (${file.originalname}, ${file.size} bytes) ` +
        `for ${recordType}:${recordId} by user:${record.userId} in ${duration}ms`,
    );

    return attachment;
  }

  async listAttachments(recordType: 'expense' | 'income', recordId: string) {
    const where =
      recordType === 'expense' ? { linked_expense_id: recordId } : { linked_income_id: recordId };
    const rows = await this.prisma.attachments.findMany({
      where: {
        ...where,
        status: 'ACTIVE', // hide removed attachments by default
      },
      orderBy: { created_at: 'asc' },
    });

    this.logger.debug(`Listed ${rows.length} attachments for ${recordType}:${recordId}`);

    return rows.map((a) => ({
      id: a.id,
      originalFilename: a.original_filename,
      mimeType: a.mime_type,
      sizeBytes: a.size_bytes,
      webViewLink: a.web_view_link,
      status: a.status as AttachmentStatusType,
      createdAt: a.created_at,
    }));
  }

  async replaceAttachment(attachmentId: string, file: Express.Multer.File, checksum?: string) {
    const startTime = Date.now();
    this.logger.log(`Starting replace: ${file.originalname} for attachment:${attachmentId}`);

    if (!file) throw new BadRequestException('File missing');

    // Find existing attachment
    const oldAttachment = await this.prisma.attachments.findUnique({
      where: { id: attachmentId },
    });

    if (!oldAttachment) {
      this.logger.warn(`Replace failed: attachment:${attachmentId} not found`);
      throw new NotFoundException('Attachment not found');
    }

    if (oldAttachment.status !== ATTACHMENT_STATUS.ACTIVE) {
      throw new BadRequestException('Cannot replace non-active attachment');
    }

    // Determine record type and get userId
    const recordType = oldAttachment.linked_expense_id ? 'expense' : 'income';
    const linkedId = oldAttachment.linked_expense_id || oldAttachment.linked_income_id;
    const record = await (recordType === 'expense'
      ? this.prisma.expense.findUnique({ where: { id: linkedId! } })
      : this.prisma.income.findUnique({ where: { id: linkedId! } }));

    if (!record) {
      throw new BadRequestException('Associated record not found');
    }

    const recordId = linkedId;

    // Compute checksum
    const newChecksum = checksum || sha256Hex(file.buffer);
    this.logger.debug(
      `Computed checksum: ${newChecksum.substring(0, 8)}... for ${file.originalname}`,
    );

    // Upload new file to Drive
    await this.drive.createUserFolderIfMissing(record.userId);

    const uploadResult = await this.drive.uploadFile({
      userId: record.userId,
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      recordType,
      recordId: recordId!,
      checksum: newChecksum,
    });

    // Create new attachment
    const newAttachment = await this.prisma.attachments.create({
      data: {
        drive_file_id: uploadResult.driveFileId,
        linked_expense_id: oldAttachment.linked_expense_id,
        linked_income_id: oldAttachment.linked_income_id,
        mime_type: uploadResult.mimeType || file.mimetype,
        size_bytes: uploadResult.sizeBytes || file.size,
        original_filename: uploadResult.originalFilename || file.originalname,
        checksum: newChecksum,
        web_view_link: uploadResult.webViewLink,
        uploaded_by_user_id: record.userId,
        drive_record_type: oldAttachment.drive_record_type,
        drive_record_date: oldAttachment.drive_record_date,
        drive_amount_minor_units: oldAttachment.drive_amount_minor_units,
        drive_category_id: oldAttachment.drive_category_id,
        status: ATTACHMENT_STATUS.ACTIVE,
      },
    });

    // Mark old attachment as removed with retention
    const retentionDays = 90;
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + retentionDays);

    await this.prisma.attachments.update({
      where: { id: attachmentId },
      data: {
        status: ATTACHMENT_STATUS.REMOVED,
        replaced_by_attachment_id: newAttachment.id,
        retention_expires_at: retentionExpiresAt,
      },
    });

    const duration = Date.now() - startTime;
    this.logger.log(
      `Replace complete: ${newAttachment.id} replaces ${attachmentId} ` +
        `(${file.originalname}, ${file.size} bytes) by user:${record.userId} in ${duration}ms`,
    );

    return newAttachment;
  }

  async removeAttachment(attachmentId: string) {
    const startTime = Date.now();
    this.logger.log(`Starting remove: attachment:${attachmentId}`);

    // Find existing attachment
    const attachment = await this.prisma.attachments.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      this.logger.warn(`Remove failed: attachment:${attachmentId} not found`);
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.status === ATTACHMENT_STATUS.REMOVED) {
      throw new BadRequestException('Attachment already removed');
    }

    // Set retention expiry (90 days from now)
    const retentionDays = 90;
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + retentionDays);

    const updated = await this.prisma.attachments.update({
      where: { id: attachmentId },
      data: {
        status: ATTACHMENT_STATUS.REMOVED,
        retention_expires_at: retentionExpiresAt,
      },
    });

    // (Optional) schedule/trigger physical deletion here OR via cron
    // For immediate UX feedback deletion from list occurs client-side by filtering ACTIVE only.

    const duration = Date.now() - startTime;
    this.logger.log(
      `Remove complete: ${attachmentId} (${attachment.original_filename}) ` +
        `marked for deletion at ${retentionExpiresAt.toISOString()} in ${duration}ms`,
    );

    return updated;
  }
}
