const storageProvider = require('./storageProvider');
const { AppError } = require('../middleware/errorHandler');

class UploadService {
  async handleUpload(file, category) {
    if (!file) {
      throw new AppError('Please provide a file to upload', 400);
    }

    const allowedCategories = ['resume', 'avatar', 'company_logo', 'other'];
    if (!allowedCategories.includes(category)) {
      throw new AppError('Invalid upload category provided', 400);
    }

    // Delegate directly to the StorageProvider interface
    const result = await storageProvider.saveFile(file, category);

    // Abstract check: must return only { fileUrl }
    return {
      fileUrl: result.fileUrl
    };
  }

  async handleDelete(fileUrl) {
    if (!fileUrl) return;
    return await storageProvider.deleteFile(fileUrl);
  }
}

module.exports = new UploadService();
