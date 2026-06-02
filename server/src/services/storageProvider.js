const LocalProvider = require('./storage/LocalProvider');
const CloudinaryProvider = require('./storage/CloudinaryProvider');
const logger = require('../utils/logger');

class StorageProviderFactory {
  constructor() {
    const provider = process.env.UPLOAD_PROVIDER || 'local';
    if (provider.toLowerCase() === 'cloudinary') {
      logger.info('📦 File Storage Provider Initialized: Cloudinary');
      this.activeProvider = new CloudinaryProvider();
    } else {
      logger.info('📦 File Storage Provider Initialized: Local Disk');
      this.activeProvider = new LocalProvider();
    }
  }

  async saveFile(file, category) {
    if (!file) {
      throw new Error('No file provided for upload');
    }
    return this.activeProvider.saveFile(file, category);
  }

  async deleteFile(fileUrl) {
    if (!fileUrl) return;
    return this.activeProvider.deleteFile(fileUrl);
  }
}

// Single instance exports
module.exports = new StorageProviderFactory();
