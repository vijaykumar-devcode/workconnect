const SupportTicket = require('./supportTicket.model');
const { AppError } = require('../../middleware/errorHandler');

class SupportService {
  async createTicket(ticketData, userId) {
    const { subject, message } = ticketData;

    return await SupportTicket.create({
      user: userId,
      subject,
      message
    });
  }

  async getMyTickets(userId) {
    return await SupportTicket.find({ user: userId })
      .sort({ createdAt: -1 });
  }

  async getAllTickets() {
    return await SupportTicket.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
  }

  async respondToTicket(ticketId, responseText, authorId) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found', 404);
    }

    ticket.responses.push({
      author: authorId,
      message: responseText
    });

    await ticket.save();
    return ticket;
  }

  async updateTicketStatus(ticketId, status) {
    if (!['Open', 'In-Progress', 'Resolved', 'Escalated'].includes(status)) {
      throw new AppError('Invalid status value', 400);
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true }
    );

    if (!ticket) {
      throw new AppError('Support ticket not found', 404);
    }

    return ticket;
  }
}

module.exports = new SupportService();
