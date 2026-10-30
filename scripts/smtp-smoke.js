require('dotenv').config();

const main = async () => {
  const to = process.env.MAIL_TEST_TO;
  if (!to) {
    throw new Error('Configura MAIL_TEST_TO en .env antes de probar el envío SMTP');
  }

  const { sendConfirmationEmail, transporter } = require('../src/services/mail.service');
  try {
    await transporter.verify();
    const result = await sendConfirmationEmail({
      to,
      eventTitle: 'Prueba de correo - Plataforma de Eventos',
      reservationCode: 'TEST-EMAIL',
      quantity: 1,
    });

    console.log(`Correo de prueba enviado. ID: ${result.messageId}`);
  } finally {
    transporter.close();
  }
};

main()
  .catch((error) => {
    console.error(`Falló la prueba SMTP: ${error.message}`);
    process.exitCode = 1;
  });
