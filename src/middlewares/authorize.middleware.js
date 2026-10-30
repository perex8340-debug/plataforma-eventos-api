const { HttpError } = require('../utils/errors');

// Middleware de autorizacion por roles: factory que recibe los roles
// permitidos y compara contra req.user.role. Sin sesion previa -> 401;
// sesion pero rol no permitido -> 403.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'No autenticado'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new HttpError(403, 'No tenés permisos para realizar esta acción')
    );
  }

  return next();
};

module.exports = authorize;