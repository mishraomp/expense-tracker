import { IsEnum, IsString, Length, IsOptional, Matches } from 'class-validator';

enum UploadRecordType {
  expense = 'expense',
  income = 'income',
}

export class UploadAttachmentDto {
  /** Which record type this attachment links to. */
  @IsEnum(UploadRecordType)
  recordType!: UploadRecordType;

  /** ID of an existing expense or income record. Upload fails with 400 if it doesn't exist. */
  @IsString()
  @Length(1, 100)
  recordId!: string;

  /**
   * Optional SHA-256 hex checksum (64 chars). NOT verified against the uploaded bytes — a
   * caller-supplied value is trusted and stored as-is rather than recomputed server-side.
   * Also plays no role in duplicate detection on this endpoint (checksum-based dedup only
   * happens within a single bulk-upload batch).
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: 'checksum must be 64 hex chars (sha256)' })
  checksum?: string;
}
