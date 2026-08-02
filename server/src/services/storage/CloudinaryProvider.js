const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');

class CloudinaryProvider {
  constructor() {
    // Cloudinary credentials will be read from environment variables directly by the SDK, 
    // or we can set them explicitly in constructor:
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async saveFile(file, category) {
    return new Promise((resolve, reject) => {
      const folderMap = {
        resume: 'resumes',
        avatar: 'avatars',
        company_logo: 'company_logos',
        other: 'documents',
      };
      const folderName = folderMap[category] || 'documents';

      if (file.path) {
        cloudinary.uploader.upload(file.path, {
          folder: `workconnect/${folderName}`,
          resource_type: 'auto',
        }, (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({ fileUrl: result.secure_url });
        });
      } else {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `workconnect/${folderName}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve({ fileUrl: result.secure_url });
          }
        );
        uploadStream.end(file.buffer);
      }
    });
  }

  async deleteFile(fileUrl) {
    if (!fileUrl) return;
    try {
      // Extract public_id from secure_url
      // Example: https://res.cloudinary.com/demo/image/upload/v1570975200/workconnect/company_logos/logo_abc.png
      // -> workconnect/company_logos/logo_abc
      const parts = fileUrl.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const filename = filenameWithExt.split('.')[0];
      const folderCategory = parts[parts.length - 2];
      const publicId = `workconnect/${folderCategory}/${filename}`;

      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      logger.error('Cloudinary delete error:', err);
      return false;
    }
  }
}

module.exports = CloudinaryProvider;
