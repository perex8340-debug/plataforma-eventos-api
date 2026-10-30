const ticketsService = require('../services/tickets.service');

const createTicket = async (req, res, next) => {
  try {
    const ticket = await ticketsService.createTicket(req.user, req.params.eid, req.body);
    res.status(201).json({ status: 'success', payload: ticket });
  } catch (error) {
    next(error);
  }
};

const myTickets = async (req, res, next) => {
  try {
    const tickets = await ticketsService.getMyTickets(req.user);
    res.status(200).json({ status: 'success', payload: tickets });
  } catch (error) {
    next(error);
  }
};

const eventTickets = async (req, res, next) => {
  try {
    const result = await ticketsService.getEventTickets(req.user, req.params.eid);
    res.status(200).json({ status: 'success', payload: result });
  } catch (error) {
    next(error);
  }
};

const cancelTicket = async (req, res, next) => {
  try {
    const ticket = await ticketsService.cancelTicket(req.user, req.params.tid);
    res.status(200).json({ status: 'success', payload: ticket });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  myTickets,
  eventTickets,
  cancelTicket,
};