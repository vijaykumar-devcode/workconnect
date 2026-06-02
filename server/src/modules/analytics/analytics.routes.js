const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { protect } = require('../../middleware/authMiddleware');

router.get('/', protect, analyticsController.getDashboardAnalytics);

module.exports = router;
