const express = require('express');
const router = express.Router();
const supportController = require('./support.controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.post('/', protect, supportController.createTicket);
router.get('/my', protect, supportController.getMyTickets);
router.post('/:ticketId/respond', protect, authorize('ADMIN'), supportController.respondToTicket);

// Admin Only
router.get('/admin/all', protect, authorize('ADMIN'), supportController.getAllTickets);
router.put('/:ticketId/status', protect, authorize('ADMIN'), supportController.updateTicketStatus);

module.exports = router;
