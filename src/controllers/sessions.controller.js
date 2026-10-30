const sessionsService = require('../services/sessions.service');
const { COOKIE_NAME, generateToken, getTokenMaxAge } = require('../utils/jwt');
const { NODE_ENV } = require('../config/env.config');
const { HttpError } = require('../utils/errors');

const register = async (req, res, next) => {
  try {
    const user = await sessionsService.getPublicUser(req.user._id);
    res.status(201).json({ status: 'success', payload: user });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const user = req.user;
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: getTokenMaxAge(token),
      secure: NODE_ENV === 'production',
    });

    res.status(200).json({ status: 'success', message: 'Login correcto' });
  } catch (error) {
    res.clearCookie(COOKIE_NAME);
    next(error);
  }
};

const current = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, 'No autenticado');
    }
    const currentUser = await sessionsService.getPublicUser(req.user.id);
    res.status(200).json({ status: 'success', payload: currentUser });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie(COOKIE_NAME);
    res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  current,
  logout,
};