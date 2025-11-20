import { FileType, ImportStatus } from '@prisma/client';

export class ImportSessionResponseDto {
  id: string;
  userId: string;
  fileName: string;
  fileType: FileType;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errorDetails?: ErrorDetail[];
  status: ImportStatus;
  createdAt: Date;
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

export interface ErrorDetail {
  row: number;
  errors: string[];
}
