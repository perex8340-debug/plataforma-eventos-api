const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const createHash = (password) => bcrypt.hashSync(password, SALT_ROUNDS);

const isValidPassword = (password, hashedPassword) =>
  bcrypt.compareSync(password, hashedPassword);

module.exports = {
  createHash,
  isValidPassword,
};
