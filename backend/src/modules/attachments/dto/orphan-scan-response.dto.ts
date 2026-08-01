import { ApiProperty } from '@nestjs/swagger';

/** One Google Drive file with no matching Attachment record in the database. */
export class OrphanFileResponseDto {
  @ApiProperty({ description: 'Google Drive file ID.' })
  driveFileId!: string;

  @ApiProperty({ description: 'Filename as stored in Drive.' })
  originalFilename!: string;

  @ApiProperty({ description: 'File size in bytes, as reported by Drive.' })
  sizeBytes!: number;

  @ApiProperty({ description: 'When this scan run detected the file as orphaned.' })
  detectedAt!: Date;
}

export class OrphanScanDataDto {
  @ApiProperty({
    type: [OrphanFileResponseDto],
    description:
      'Always empty today — see AttachmentsController.listOrphans() for why (per-user OAuth model does not support the cross-user Drive listing this scan would need).',
  })
  orphans!: OrphanFileResponseDto[];

  @ApiProperty({ description: 'orphans.length, provided for convenience.' })
  count!: number;
}

export class OrphanScanResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: OrphanScanDataDto })
  data!: OrphanScanDataDto;
}
