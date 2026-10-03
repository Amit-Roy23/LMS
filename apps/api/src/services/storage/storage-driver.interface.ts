export interface UploadedFileInfo {
  url: string;
  path: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface IStorageDriver {
  saveFile(file: Express.Multer.File, subfolder?: string): Promise<UploadedFileInfo>;
  saveBuffer(buffer: Buffer, filename: string, mimetype: string, subfolder?: string): Promise<UploadedFileInfo>;
  deleteFile(filepath: string): Promise<boolean>;
  getUrl(filepath: string): string;
}
