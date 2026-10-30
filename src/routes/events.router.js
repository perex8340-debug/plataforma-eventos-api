const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const eventsController = require('../controllers/events.controller');
const ticketsController = require('../controllers/tickets.controller');

const router = Router();

// Publico: listado con filtros/paginacion y detalle
router.get('/', eventsController.listEvents);
router.get('/:id', eventsController.getEvent);

// Crear eventos: solo organizer o admin (user -> 403 en authorize)
router.post(
  '/',
  authMiddleware,
  authorize('organizer', 'admin'),
  eventsController.createEvent
);

// Modificar: dueño del evento o admin (ownership validada en service)
router.put(
  '/:id',
  authMiddleware,
  authorize('organizer', 'admin'),
  eventsController.updateEvent
);

// Cambiar estado (draft/published/cancelled/finished): dueño o admin
router.patch(
  '/:id/status',
  authMiddleware,
  authorize('organizer', 'admin'),
  eventsController.updateEventStatus
);

// Inscribirse a un evento: cualquier usuario autenticado
// (validaciones de evento y cupos en tickets.service)
router.post('/:eid/tickets', authMiddleware, ticketsController.createTicket);

// Tickets de un evento: organizer del evento o admin
// (ownership validada en tickets.service -> 403 si no corresponde)
router.get('/:eid/tickets', authMiddleware, ticketsController.eventTickets);

module.exports = router;