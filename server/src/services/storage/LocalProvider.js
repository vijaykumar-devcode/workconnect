const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class LocalProvider {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');
  }

  async saveFile(file, category) {
    const folderMap = {
      resume: 'resumes',
      avatar: 'avatars',
      company_logo: 'company_logos',
      other: 'documents',
    };
    const folder = folderMap[category] || 'documents';

    const targetFolder = path.join(this.uploadDir, folder);

    // Ensure folders exist
    if (!fs.existsSync(targetFolder)) {
      await fsPromises.mkdir(targetFolder, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    const filePath = path.join(targetFolder, filename);

    // Move file asynchronously
    if (file.path) {
      await fsPromises.copyFile(file.path, filePath);
      await fsPromises.unlink(file.path);
    } else {
      await fsPromises.writeFile(filePath, file.buffer);
    }

    // Return URL relative path
    const fileUrl = `/uploads/${folder}/${filename}`;
    return { fileUrl };
  }

  async deleteFile(fileUrl) {
    if (!fileUrl) return;
    const relativePath = fileUrl.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.uploadDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  }
}

module.exports = LocalProvider;
