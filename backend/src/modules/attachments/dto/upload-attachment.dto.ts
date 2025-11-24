import { IsEnum, IsString, Length, IsOptional, Matches } from 'class-validator';

enum UploadRecordType {
  expense = 'expense',
  income = 'income',
}

export class UploadAttachmentDto {
  @IsEnum(UploadRecordType)
  recordType!: UploadRecordType;

  @IsString()
  @Length(1, 100)
  recordId!: string;

  // Optional pre-computed SHA-256 checksum (64 hex chars)
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: 'checksum must be 64 hex chars (sha256)' })
  checksum?: string;
}
