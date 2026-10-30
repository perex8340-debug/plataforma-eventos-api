const ticketsDAO = require('../dao/tickets.dao');

class TicketsRepository {
  async createTicket(ticketData) {
    return ticketsDAO.create(ticketData);
  }

  async findTicketForCancellation(id) {
    return ticketsDAO.findByIdLean(id);
  }

  async findTicketsForUser(userId) {
    return ticketsDAO.findByUser(userId);
  }

  async findActiveByUserAndEvent(userId, eventId) {
    return ticketsDAO.findActiveByUserAndEvent(userId, eventId);
  }

  // Método orientado al dominio: cuenta los cupos ocupados (tickets activos)
  // de un evento.
  async countActiveTickets(eventId) {
    return ticketsDAO.countActiveTickets(eventId);
  }

  async findTicketsForEvent(eventId) {
    return ticketsDAO.findByEvent(eventId);
  }

  // Método orientado al dominio: cancela un ticket (lógico, no borra el
  // documento) marcando status=cancelled y registrando cancelledAt.
  async cancelTicket(ticketId) {
    return ticketsDAO.cancelActive(ticketId);
  }
}

module.exports = new TicketsRepository();
