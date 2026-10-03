import fs from 'fs';
import path from 'path';
import { IStorageDriver, UploadedFileInfo } from './storage-driver.interface.js';
import { config } from '../../config/env.js';

export class LocalStorageDriver implements IStorageDriver {
  private baseDir: string;

  constructor(baseDir = config.storage.uploadDir) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, subfolder = 'general'): Promise<UploadedFileInfo> {
    const targetDir = path.join(this.baseDir, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const targetPath = path.join(targetDir, uniqueName);

    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, targetPath);
    }

    const relativePath = `${subfolder}/${uniqueName}`.replace(/\\/g, '/');
    const url = `${config.appUrl}/uploads/${relativePath}`;

    return {
      url,
      path: relativePath,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async saveBuffer(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    subfolder = 'certificates'
  ): Promise<UploadedFileInfo> {
    const targetDir = path.join(this.baseDir, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(filename) || '.pdf';
    const baseName = path.basename(filename, ext);
    const uniqueName = `${baseName}-${Date.now()}${ext}`;
    const targetPath = path.join(targetDir, uniqueName);

    fs.writeFileSync(targetPath, buffer);

    const relativePath = `${subfolder}/${uniqueName}`.replace(/\\/g, '/');
    const url = `${config.appUrl}/uploads/${relativePath}`;

    return {
      url,
      path: relativePath,
      filename: uniqueName,
      mimetype,
      size: buffer.length,
    };
  }

  async deleteFile(filepath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filepath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  getUrl(filepath: string): string {
    const clean = filepath.replace(/\\/g, '/');
    return `${config.appUrl}/uploads/${clean}`;
  }
}
