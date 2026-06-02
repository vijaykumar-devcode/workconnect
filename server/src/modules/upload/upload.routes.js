const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const uploadMiddleware = require('../../middleware/uploadMiddleware');
const uploadController = require('./upload.controller');

// Upload endpoint
router.post('/', protect, uploadMiddleware.single('file'), uploadController.uploadFile);

module.exports = router;
