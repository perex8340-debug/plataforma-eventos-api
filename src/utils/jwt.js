const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env.config');

const COOKIE_NAME = 'currentUser';

const generateToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const getTokenMaxAge = (token) => {
  const payload = jwt.decode(token);
  return typeof payload?.exp === 'number'
    ? Math.max(payload.exp * 1000 - Date.now(), 0)
    : 0;
};

module.exports = {
  COOKIE_NAME,
  generateToken,
  getTokenMaxAge,
  verifyToken,
};
