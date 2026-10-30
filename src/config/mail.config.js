require('dotenv').config();

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
};

module.exports = {
  MAIL_HOST: required('MAIL_HOST'),
  MAIL_PORT: process.env.MAIL_PORT || 587,
  MAIL_USER: required('MAIL_USER'),
  MAIL_PASS: required('MAIL_PASS'),
  MAIL_FROM: required('MAIL_FROM'),
};
