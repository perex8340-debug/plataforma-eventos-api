const nodemailer = require('nodemailer');
const {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
} = require('../config/env.config');

// Transporte configurado SOLO con variables de entorno de .env.
// Nada de credenciales hardcodeadas en el código.
const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT),
  secure: Number(MAIL_PORT) === 465,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const sendConfirmationEmail = async ({ to, eventTitle, reservationCode, quantity }) => {
  const safeEventTitle = escapeHtml(eventTitle);
  const mailOptions = {
    from: MAIL_FROM,
    to,
    subject: `Inscripción confirmada - ${String(eventTitle).replace(/[\r\n]+/g, ' ')}`,
    html: `
      <h2>¡Tu inscripción fue confirmada!</h2>
      <p>Hola, te confirmamos tu inscripción al evento:</p>
      <ul>
        <li><strong>Evento:</strong> ${safeEventTitle}</li>
        <li><strong>Cantidad:</strong> ${quantity}</li>
        <li><strong>Código de reserva:</strong> ${reservationCode}</li>
      </ul>
      <p>¡Te esperamos!</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendCancellationEmail = async ({ to, eventTitle, reservationCode }) => {
  const safeEventTitle = escapeHtml(eventTitle);
  const mailOptions = {
    from: MAIL_FROM,
    to,
    subject: `Inscripción cancelada - ${String(eventTitle).replace(/[\r\n]+/g, ' ')}`,
    html: `
      <h2>Tu inscripción fue cancelada</h2>
      <p>Te informamos que tu inscripción al siguiente evento fue cancelada:</p>
      <ul>
        <li><strong>Evento:</strong> ${safeEventTitle}</li>
        <li><strong>Código de reserva:</strong> ${reservationCode}</li>
      </ul>
      <p>Si no reconocés esta acción, contactate con el organizador.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendConfirmationEmail, sendCancellationEmail, transporter };