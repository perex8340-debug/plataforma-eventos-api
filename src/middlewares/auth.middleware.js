const passport = require('passport');

module.exports = passport.authenticate('current', {
  session: false,
  failWithError: true,
});