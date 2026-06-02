const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.get('/', protect, authorize('ADMIN'), auditController.getLogs);

module.exports = router;
