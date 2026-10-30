const dotenv = require('dotenv');

dotenv.config();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
};

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URL: requireEnv('MONGO_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MAIL_HOST: requireEnv('MAIL_HOST'),
  MAIL_PORT: process.env.MAIL_PORT || 587,
  MAIL_USER: requireEnv('MAIL_USER'),
  MAIL_PASS: requireEnv('MAIL_PASS'),
  MAIL_FROM: requireEnv('MAIL_FROM'),
};
