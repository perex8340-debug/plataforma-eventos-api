const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ticketsController = require('../controllers/tickets.controller');

const router = Router();

router.get('/my-tickets', authMiddleware, ticketsController.myTickets);
router.patch('/:tid/cancel', authMiddleware, ticketsController.cancelTicket);

module.exports = router;