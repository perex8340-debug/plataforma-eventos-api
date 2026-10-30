// DTO de Ticket / Inscripción.
// Serializa respuestas de tickets y filtra los documentos relacionados
// (event y user) cuando vienen populados: nunca expone password.

const { userSummaryDTO } = require('./user.dto');

const baseTicketDTO = (ticket) => ({
  id: ticket._id.toString(),
  status: ticket.status,
  quantity: ticket.quantity,
  reservationCode: ticket.reservationCode,
  createdAt: ticket.createdAt,
  cancelledAt: ticket.cancelledAt,
});

// Ticket simple (respuesta de creación y cancelación)
const ticketDTO = (ticket) => ({
  ...baseTicketDTO(ticket),
  event: ticket.event ? ticket.event.toString() : ticket.event,
  user: ticket.user ? ticket.user.toString() : ticket.user,
});

// GET /api/tickets/my-tickets: con evento populado (id, title, date, location)
const myTicketsDTO = (ticket) => ({
  ...baseTicketDTO(ticket),
  event: ticket.event
    ? {
        id: ticket.event._id.toString(),
        title: ticket.event.title,
        date: ticket.event.date,
        location: ticket.event.location,
      }
    : null,
});

// GET /api/events/:eid/tickets: con usuario populado filtrado (sin password)
const eventTicketsDTO = (ticket) => ({
  ...baseTicketDTO(ticket),
  user: ticket.user ? userSummaryDTO(ticket.user) : null,
});

module.exports = { ticketDTO, myTicketsDTO, eventTicketsDTO };