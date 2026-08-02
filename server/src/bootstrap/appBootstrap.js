const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { corsOriginDelegate } = require('../utils/origins');

const { globalLimiter } = require('../middleware/rateLimiter');
const { errorHandler } = require('../middleware/errorHandler');

const registerRoutes = (app) => {
  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));
  app.use(compression());
  app.use(cors({
    origin: corsOriginDelegate,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
  });

  app.use('/api', globalLimiter);

  app.use('/uploads', express.static(require('path').join(__dirname, '..', '..', 'uploads')));

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to WorkConnect Recruitment Platform REST API',
    });
  });

  app.use('/api/auth', require('../modules/auth/auth.routes'));
  app.use('/api/upload', require('../modules/upload/upload.routes'));
  app.use('/api/companies', require('../modules/companies/company.routes'));
  app.use('/api/jobs', require('../modules/jobs/job.routes'));
  app.use('/api/applications', require('../modules/applications/application.routes'));
  app.use('/api/interviews', require('../modules/interviews/interview.routes'));
  app.use('/api/offers', require('../modules/offers/offer.routes'));
  app.use('/api/notifications', require('../modules/notifications/notification.routes'));
  app.use('/api/support', require('../modules/support/support.routes'));
  app.use('/api/analytics', require('../modules/analytics/analytics.routes'));
  app.use('/api/audit', require('../modules/audit/audit.routes'));

  app.all('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Can't find ${req.originalUrl} on this server!`,
    });
  });

  app.use(errorHandler);
};

module.exports = {
  registerRoutes,
};