const { HttpError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  if (error instanceof HttpError) {
    return res
      .status(error.statusCode)
      .json({ status: 'error', message: error.message });
  }

  // Errores con status HTTP explícito (p. ej. passport AuthenticationError
  // "Missing credentials" -> status 400). Evita responder un 500 genérico.
  if (
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return res
      .status(error.status)
      .json({ status: 'error', message: error.message || 'Solicitud inválida' });
  }

  // Errores operacionales de frameworks (p. ej. JSON mal formado de body-parser)
  if (error.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ status: 'error', message: 'El cuerpo de la solicitud no es un JSON válido' });
  }

  // Duplicado de índice único de MongoDB (código 11000): dos requests
  // concurrentes de registro con el mismo email. Se devuelve el mismo 409
  // que el chequeo previo de findByEmail para no terminar en un 500 genérico.
  if (error.code === 11000) {
    return res
      .status(409)
      .json({ status: 'error', message: 'El email ya está registrado' });
  }

  // Errores de validación/casteo de Mongoose son datos inválidos del request,
  // no fallos internos de la API.
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res
      .status(400)
      .json({ status: 'error', message: 'Los datos de la solicitud no son válidos' });
  }

  // Errores de verificación de JWT (passport-jwt): token ausente, inválido o
  // expirado. Siempre se responde 401 genérico, sin diferenciar la causa.
  if (
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError' ||
    error.name === 'NotBeforeError'
  ) {
    return res
      .status(401)
      .json({ status: 'error', message: 'No autenticado' });
  }

  console.error('Error no controlado:', error);
  return res
    .status(500)
    .json({ status: 'error', message: 'Error interno del servidor' });
};

module.exports = { errorHandler };
