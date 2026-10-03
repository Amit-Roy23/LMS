import { IStorageDriver } from './storage-driver.interface.js';
import { LocalStorageDriver } from './local-storage.driver.js';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

class StorageService {
  private driver: IStorageDriver;

  constructor() {
    // Easily pluggable: switch to S3 / Cloudinary driver based on config
    if (config.storage.driver === 's3') {
      // TODO(client-requirement): plug in AWS S3 StorageDriver implementation
      logger.info('Using S3 Storage Driver stub (falling back to Local)');
      this.driver = new LocalStorageDriver();
    } else {
      this.driver = new LocalStorageDriver();
    }
  }

  getDriver(): IStorageDriver {
    return this.driver;
  }

  async saveFile(file: Express.Multer.File, subfolder?: string) {
    return this.driver.saveFile(file, subfolder);
  }

  async saveBuffer(buffer: Buffer, filename: string, mimetype: string, subfolder?: string) {
    return this.driver.saveBuffer(buffer, filename, mimetype, subfolder);
  }

  async deleteFile(filepath: string) {
    return this.driver.deleteFile(filepath);
  }

  getUrl(filepath: string) {
    return this.driver.getUrl(filepath);
  }
}

export const storageService = new StorageService();
