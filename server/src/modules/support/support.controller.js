const supportService = require('./support.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const createTicket = asyncHandler(async (req, res, next) => {
  const ticket = await supportService.createTicket(req.body, req.user._id);
  res.status(201).json({
    success: true,
    message: 'Support ticket submitted successfully',
    data: { ticket }
  });
});

const getMyTickets = asyncHandler(async (req, res, next) => {
  const tickets = await supportService.getMyTickets(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Support tickets retrieved successfully',
    data: { tickets }
  });
});

const respondToTicket = asyncHandler(async (req, res, next) => {
  const { message } = req.body;
  const ticket = await supportService.respondToTicket(req.params.ticketId, message, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Response added successfully',
    data: { ticket }
  });
});

// Admin Controllers
const getAllTickets = asyncHandler(async (req, res, next) => {
  const tickets = await supportService.getAllTickets();
  res.status(200).json({
    success: true,
    message: 'All support tickets retrieved successfully',
    data: { tickets }
  });
});

const updateTicketStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const ticket = await supportService.updateTicketStatus(req.params.ticketId, status);
  res.status(200).json({
    success: true,
    message: `Ticket status set to ${status}`,
    data: { ticket }
  });
});

module.exports = {
  createTicket,
  getMyTickets,
  respondToTicket,
  getAllTickets,
  updateTicketStatus,
};
