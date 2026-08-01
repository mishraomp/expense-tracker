import { ApiProperty } from '@nestjs/swagger';

/** Shape returned by upload, replace, and remove — one attachment record. */
export class AttachmentResponseDto {
  @ApiProperty({ description: 'Attachment UUID.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Original filename as uploaded.' })
  filename!: string;

  @ApiProperty({ description: 'MIME type detected/stored for the file.' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes.' })
  sizeBytes!: number;

  @ApiProperty({ description: "Google Drive 'view' link for the stored file." })
  webViewLink!: string;

  @ApiProperty({ description: 'ACTIVE or REMOVED.', enum: ['ACTIVE', 'REMOVED'] })
  status!: string;

  @ApiProperty({ description: 'When this attachment record was created.' })
  createdAt!: Date;

  @ApiProperty({
    description:
      'When the 90-day retention window for a REMOVED attachment ends (the underlying Drive file is deleted after this). Null while the attachment is ACTIVE.',
    nullable: true,
  })
  retentionExpiresAt!: Date | null;
}

/**
 * Shape returned by GET /attachments/records/{type}/{id}/attachments. Deliberately different
 * from AttachmentResponseDto — originalFilename instead of filename, and no retentionExpiresAt
 * (this list only ever contains ACTIVE attachments). See AttachmentsController.list().
 */
export class AttachmentListItemResponseDto {
  @ApiProperty({ description: 'Attachment UUID.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Original filename as uploaded.' })
  originalFilename!: string;

  @ApiProperty({ description: 'MIME type detected/stored for the file.' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes.' })
  sizeBytes!: number;

  @ApiProperty({ description: "Google Drive 'view' link for the stored file." })
  webViewLink!: string;

  @ApiProperty({
    description: 'Always ACTIVE — this endpoint hides removed attachments.',
    enum: ['ACTIVE'],
  })
  status!: string;

  @ApiProperty({ description: 'When this attachment record was created.' })
  createdAt!: Date;
}
