const { Router } = require('express');
const passport = require('passport');
const controller = require('../controllers/sessions.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.post(
  '/register',
  passport.authenticate('register', { session: false, failWithError: true }),
  controller.register
);
router.post(
  '/login',
  passport.authenticate('login', { session: false, failWithError: true }),
  controller.login
);

router.get('/current', authMiddleware, controller.current);
router.post('/logout', controller.logout);

module.exports = router;