const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const usersController = require('../controllers/users.controller');

const router = Router();

// Ruta administrativa: solo admin (organizer -> 403, user -> 403)
router.get(
  '/',
  authMiddleware,
  authorize('admin'),
  usersController.listUsers
);

module.exports = router;