const uploadService = require('../../services/uploadService');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');

const UPLOAD_RULES = {
  resume: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  avatar: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  company_logo: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  other: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSizeBytes: 10 * 1024 * 1024,
  },
};

const ALLOWED_CATEGORIES = Object.keys(UPLOAD_RULES);

// Accept common client variants and normalize them to canonical categories
const CATEGORY_NORMALIZATION = {
  resumes: 'resume',
  resume: 'resume',
  cv: 'resume',
  avatars: 'avatar',
  avatar: 'avatar',
  logo: 'company_logo',
  companyLogo: 'company_logo',
  company_logo: 'company_logo',
  onboarding: 'other',
  other: 'other'
};

const normalizeCategory = (raw) => {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return CATEGORY_NORMALIZATION[key] || null;
};

const validateUpload = (file, category) => {
  if (!category) {
    throw new AppError('Upload category is required', 400);
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new AppError('Invalid upload category provided', 400);
  }

  const rule = UPLOAD_RULES[category];
  if (!rule.allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError('Invalid file format for the selected category', 400);
  }

  if (file.size > rule.maxSizeBytes) {
    throw new AppError('Uploaded file exceeds the allowed size for this category', 400);
  }
};

const uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  // Normalize client-provided category variants to canonical ones
  const rawCategory = req.body.category || req.query.category || req.headers['x-upload-category'];
  if (!rawCategory) {
    throw new AppError('Upload category is required', 400);
  }

  const category = normalizeCategory(rawCategory);
  if (!category) {
    throw new AppError('Invalid upload category provided', 400);
  }

  validateUpload(req.file, category);

  const result = await uploadService.handleUpload(req.file, category);

  res.status(200).json({
    success: true,
    message: '',
    data: {
      fileUrl: result.fileUrl
    }
  });
});

module.exports = {
  uploadFile,
  validateUpload,
  UPLOAD_RULES,
};
