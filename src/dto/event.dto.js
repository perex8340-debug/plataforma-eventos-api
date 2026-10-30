// DTO de Evento.
// Serializa respuestas de evento sin exponer datos internos del modelo.
// Si el organizer viene populado (populate), también lo filtra (userSummaryDTO):
// nunca incluye password ni campos sensibles del usuario.

const { userSummaryDTO } = require('./user.dto');

const eventDTO = (event, { withOrganizer = false } = {}) => {
  const dto = {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    category: event.category,
    date: event.date,
    location: event.location,
    capacity: event.capacity,
    price: event.price,
    status: event.status,
  };

  const isPopulatedOrganizer =
    event.organizer &&
    typeof event.organizer === 'object' &&
    event.organizer.first_name;

  if (withOrganizer && isPopulatedOrganizer) {
    dto.organizer = userSummaryDTO(event.organizer);
  } else {
    dto.organizer = event.organizer ? event.organizer.toString() : null;
  }

  return dto;
};

// Resumen de evento embebido en listados de tickets de un organizador.
const eventTicketListDTO = (event) => ({
  id: event._id.toString(),
  title: event.title,
  capacity: event.capacity,
});

module.exports = { eventDTO, eventTicketListDTO };