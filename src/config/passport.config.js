const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const sessionsService = require('../services/sessions.service');
const { COOKIE_NAME } = require('../utils/jwt');
const { JWT_SECRET } = require('./env.config');

// ---------------------------------------------------------------------------
// Estrategia: register
// Passport valida la estrategia y delega el caso de uso al SessionsService.
// ---------------------------------------------------------------------------
passport.use(
  'register',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
      badRequestMessage: 'Faltan campos obligatorios',
    },
    async (req, email, password, done) => {
      try {
        const newUser = await sessionsService.registerUser(req.body);
        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// ---------------------------------------------------------------------------
// Estrategia: login
// El SessionsService valida las credenciales; el JWT lo genera el controller.
// ---------------------------------------------------------------------------
passport.use(
  'login',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      badRequestMessage: 'Faltan credenciales',
    },
    async (email, password, done) => {
      try {
        const user = await sessionsService.authenticate(email, password);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// ---------------------------------------------------------------------------
// Estrategia: current
// Lee y valida el JWT desde la cookie currentUser y deja el payload en req.user.
// ---------------------------------------------------------------------------
passport.use(
  'current',
  new JwtStrategy(
    {
      secretOrKey: JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req.cookies?.[COOKIE_NAME],
      ]),
    },
    async (payload, done) => {
      try {
        return done(null, payload);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Para OAuth (Google, GitHub, etc.) en el futuro: registrar nuevas estrategias
// aquí mismo, sin tocar app.js. Por ejemplo:
// passport.use(new GoogleStrategy({...}, verifyCallback));

module.exports = passport;
