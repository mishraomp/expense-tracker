import { FileType, ImportStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportSessionResponseDto {
  /** Import session ID. */
  id: string;

  /** ID of the user who started the import. */
  userId: string;

  /** Original uploaded file name. */
  fileName: string;

  /** Detected file type (csv or xlsx). */
  @ApiProperty({ enum: FileType })
  fileType: FileType;

  /** Total number of data rows found in the file. */
  totalRows: number;

  /** Number of rows successfully inserted. */
  successfulRows: number;

  /** Number of rows that failed validation and were not inserted. */
  failedRows: number;

  /** Per-row validation failures, present when failedRows > 0. */
  @ApiPropertyOptional({ type: () => [ErrorDetail] })
  errorDetails?: ErrorDetail[];

  /**
   * Becomes 'failed' only when EVERY row failed. 'completed' can still mean partial
   * failures — check failedRows/errorDetails too, don't treat 'completed' alone as full
   * success.
   */
  @ApiProperty({ enum: ImportStatus })
  status: ImportStatus;

  /** When the session was created. */
  createdAt: Date;

  /** When the session was last updated. */
  updatedAt: Date;

  static fromEntity(entity: any): ImportSessionResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      fileName: entity.fileName,
      fileType: entity.fileType,
      totalRows: entity.totalRows,
      successfulRows: entity.successfulRows,
      failedRows: entity.failedRows,
      errorDetails: entity.errorDetails as ErrorDetail[],
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class ErrorDetail {
  /** 1-based row number in the source file (accounts for the header row). */
  row: number;

  /** Validation error messages for this row. */
  errors: string[];
}
