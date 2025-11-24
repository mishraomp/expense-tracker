export interface UploadResult {
  driveFileId: string;
  webViewLink: string;
  mimeType: string;
  sizeBytes: number;
  originalFilename: string;
}

export interface DriveProvider {
  uploadFile(args: {
    userId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    recordType: 'expense' | 'income';
    recordId: string;
    checksum?: string;
  }): Promise<UploadResult>;

  replaceFile(args: {
    userId: string;
    oldDriveFileId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    checksum?: string;
  }): Promise<UploadResult>;

  deleteFile(userId: string, driveFileId: string): Promise<void>;

  listUserFiles(
    userId: string,
  ): Promise<Array<{ driveFileId: string; filename: string; sizeBytes: number; mimeType: string }>>;

  createUserFolderIfMissing(userId: string): Promise<void>;
}
