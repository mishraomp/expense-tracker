export const driveProviderMock = {
  createUserFolderIfMissing: async () => {},
  uploadFile: async () => ({
    driveFileId: 'mock-file-id',
    webViewLink: 'https://drive.mock/file/mock-file-id',
    mimeType: 'application/pdf',
    sizeBytes: 123,
    originalFilename: 'mock.pdf',
  }),
  replaceFile: async () => ({
    driveFileId: 'mock-file-id-replaced',
    webViewLink: 'https://drive.mock/file/mock-file-id-replaced',
    mimeType: 'application/pdf',
    sizeBytes: 125,
    originalFilename: 'mock.pdf',
  }),
  deleteFile: async () => {},
  listUserFiles: async () => [],
};
