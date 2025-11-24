import { google } from 'googleapis';
import { DriveProvider, UploadResult } from './drive.provider';
import { GOOGLE_DRIVE_ROOT_FOLDER_NAME } from '../attachment.constants';
import { Logger, BadRequestException, Injectable } from '@nestjs/common';
import { OAuthService } from '../oauth.service';

/**
 * GoogleDriveProvider (Per-User OAuth variant)
 * Uses each user's own Google Drive via stored refresh token.
 * Files are placed in a per-user root application folder named GOOGLE_DRIVE_ROOT_FOLDER_NAME.
 */
@Injectable()
export class GoogleDriveProvider implements DriveProvider {
  private readonly logger = new Logger(GoogleDriveProvider.name);
  private rootFolderCache = new Map<string, string>(); // per-user root folder id

  constructor(private readonly oauth: OAuthService) {}

  /**
   * Build authenticated Drive client using service account credentials in env vars.
   * Required env:
   *   GOOGLE_DRIVE_SA_EMAIL
   *   GOOGLE_DRIVE_SA_PRIVATE_KEY (use literal \n for newlines; we normalize)
   * Scope: drive.file (restricted to files created by this app)
   */
  /**
   * For per-user OAuth each user has their own Drive; create a root app folder per user.
   */
  private async ensureUserRootFolder(userId: string) {
    if (this.rootFolderCache.has(userId)) return this.rootFolderCache.get(userId)!;
    const authClient = await this.oauth.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth: authClient });
    const q = `name = '${GOOGLE_DRIVE_ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({ q, fields: 'files(id,name)' });
    const existing = res.data.files?.[0];
    if (existing?.id) {
      this.rootFolderCache.set(userId, existing.id);
      return existing.id;
    }
    const createRes = await drive.files.create({
      requestBody: {
        name: GOOGLE_DRIVE_ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    if (!createRes.data.id) throw new BadRequestException('Failed to create Drive root folder');
    this.rootFolderCache.set(userId, createRes.data.id);
    this.logger.log(`Created Drive root folder for user ${userId} (${createRes.data.id})`);
    return createRes.data.id;
  }

  async createUserFolderIfMissing(userId: string): Promise<void> {
    // Backwards compatibility: no subfolder layer needed; root folder acts as user container.
    await this.ensureUserRootFolder(userId);
  }

  async uploadFile(args: {
    userId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    recordType: 'expense' | 'income';
    recordId: string;
    checksum?: string;
  }): Promise<UploadResult> {
    const { userId, buffer, filename, mimeType } = args;
    const authClient = await this.oauth.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderId = await this.ensureUserRootFolder(userId);
    try {
      const res = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: bufferToStream(buffer),
        },
        fields: 'id,name,mimeType,size,webViewLink',
      });
      if (!res.data.id) throw new Error('Upload failed: no file id');
      return {
        driveFileId: res.data.id,
        webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
        mimeType: res.data.mimeType || mimeType,
        sizeBytes: res.data.size ? Number(res.data.size) : buffer.length,
        originalFilename: res.data.name || filename,
      };
    } catch (err) {
      this.logger.error(`Drive upload failed for ${filename}: ${(err as Error).message}`);
      throw err;
    }
  }

  async replaceFile(args: {
    userId: string;
    oldDriveFileId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    checksum?: string;
  }): Promise<UploadResult> {
    // Simplest implementation: upload new file; caller handles marking old one REMOVED / retention
    return this.uploadFile({
      userId: args.userId,
      buffer: args.buffer,
      filename: args.filename,
      mimeType: args.mimeType,
      recordType: 'expense',
      recordId: 'replace',
      checksum: args.checksum,
    });
  }

  async deleteFile(userId: string, driveFileId: string): Promise<void> {
    void userId; // userId reserved for permission checks later
    const authClient = await this.oauth.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth: authClient });
    try {
      await drive.files.delete({ fileId: driveFileId });
    } catch (err) {
      this.logger.error(`Drive delete failed for ${driveFileId}: ${(err as Error).message}`);
      throw err;
    }
  }

  async listUserFiles(
    userId: string,
  ): Promise<
    Array<{ driveFileId: string; filename: string; sizeBytes: number; mimeType: string }>
  > {
    const authClient = await this.oauth.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderId = await this.ensureUserRootFolder(userId);
    const q = `'${folderId}' in parents and trashed = false`;
    const res = await drive.files.list({ q, fields: 'files(id,name,size,mimeType)' });
    return (
      res.data.files?.map((f) => ({
        driveFileId: f.id!,
        filename: f.name || 'unknown',
        sizeBytes: f.size ? Number(f.size) : 0,
        mimeType: f.mimeType || 'application/octet-stream',
      })) || []
    );
  }

  async listAllFiles(): Promise<
    Array<{
      id: string;
      name: string;
      size?: string;
      mimeType?: string;
      md5Checksum?: string;
      webViewLink?: string;
    }>
  > {
    // Not supported under per-user OAuth (would require iterating all users).
    return [];
  }
}

// Helper: convert Buffer to readable stream for googleapis client
function bufferToStream(buffer: Buffer) {
  const { Readable } = require('stream');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
