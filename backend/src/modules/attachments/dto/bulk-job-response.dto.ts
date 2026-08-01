import { ApiProperty } from '@nestjs/swagger';

/** Shape returned immediately when a bulk upload job is created (before any file is processed). */
export class BulkUploadStartedDto {
  @ApiProperty({
    description: 'Bulk upload job ID — poll GET /attachments/bulk/{jobId} with this.',
    format: 'uuid',
  })
  jobId!: string;

  @ApiProperty({ description: 'Always "running" at creation time.', example: 'running' })
  status!: string;

  @ApiProperty({ description: 'Number of files accepted into the job.' })
  totalFiles!: number;
}

export class BulkUploadStartedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: BulkUploadStartedDto })
  data!: BulkUploadStartedDto;
}

/**
 * The bulk_import_jobs database row, returned as-is by the job-status and cancel endpoints.
 * NOTE: unlike the rest of this API these fields are snake_case (raw column names) — they are
 * not mapped to a camelCase view model before being sent to the client.
 */
export class BulkImportJobDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Hardcoded to the literal "system-user" today — see BulkController.startBulkUpload().',
  })
  initiated_by_user_id!: string;

  @ApiProperty({ description: 'Number of files submitted in the original request.' })
  total_files!: number;

  @ApiProperty({ description: 'Files successfully uploaded so far.' })
  uploaded_count!: number;

  @ApiProperty({ description: 'Files skipped because no recordId was supplied for that slot.' })
  skipped_count!: number;

  @ApiProperty({ description: 'Files skipped as duplicates (same SHA-256 within this batch).' })
  duplicate_count!: number;

  @ApiProperty({ description: 'Files that failed to upload.' })
  error_count!: number;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'canceled'] })
  status!: string;

  @ApiProperty({ nullable: true })
  started_at!: Date | null;

  @ApiProperty({
    nullable: true,
    description:
      'Reserved for the job completion timestamp — no current code path sets this column.',
  })
  finished_at!: Date | null;
}

export class BulkImportJobResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: BulkImportJobDto })
  data!: BulkImportJobDto;
}
