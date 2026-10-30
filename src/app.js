const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport.config');
const sessionsRouter = require('./routes/sessions.router');
const eventsRouter = require('./routes/events.router');
const ticketsRouter = require('./routes/tickets.router');
const usersRouter = require('./routes/users.router');
const { errorHandler } = require('./middlewares/errorHandler');
const { HttpError } = require('./utils/errors');

const app = express();

app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API de eventos activa' });
});

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/sessions', sessionsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', usersRouter);

// Ruta inexistente -> 404 (no cae en un 500 generico)
app.use((req, res, next) => {
  next(new HttpError(404, 'Recurso no encontrado'));
});

app.use(errorHandler);

module.exports = app;