export const ATTACHMENT_MAX_PER_RECORD = parseInt(process.env.ATTACHMENT_MAX_PER_RECORD || '5', 10);
export const ATTACHMENT_MAX_SIZE_BYTES = parseInt(
  process.env.ATTACHMENT_MAX_SIZE_BYTES || '5242880',
  10,
); // 5MB

export const GOOGLE_DRIVE_ROOT_FOLDER_NAME =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'ExpenseTracker';

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpeg: ['image/jpeg'],
  jpg: ['image/jpeg'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export const MIME_WHITELIST = Object.values(ALLOWED_MIME_TYPES).flat();
