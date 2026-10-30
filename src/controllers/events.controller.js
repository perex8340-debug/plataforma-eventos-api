const eventsService = require('../services/events.service');

const createEvent = async (req, res, next) => {
  try {
    const event = await eventsService.createEvent(req.user, req.body);
    res.status(201).json({ status: 'success', payload: event });
  } catch (error) {
    next(error);
  }
};

const getEvent = async (req, res, next) => {
  try {
    const event = await eventsService.getEventById(req.params.id);
    res.status(200).json({ status: 'success', payload: event });
  } catch (error) {
    next(error);
  }
};

const listEvents = async (req, res, next) => {
  try {
    const result = await eventsService.listEvents(req.query);
    res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const event = await eventsService.updateEvent(
      req.user,
      req.params.id,
      req.body
    );
    res.status(200).json({ status: 'success', payload: event });
  } catch (error) {
    next(error);
  }
};

const updateEventStatus = async (req, res, next) => {
  try {
    const event = await eventsService.updateStatus(
      req.user,
      req.params.id,
      req.body.status
    );
    res.status(200).json({ status: 'success', payload: event });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
  updateEventStatus,
};