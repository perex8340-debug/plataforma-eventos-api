const app = require('./app');
const { PORT } = require('./config/env.config');
const { connectDB } = require('./config/database');
const eventsRepository = require('./repositories/events.repository');

connectDB().then(async () => {
  await eventsRepository.synchronizeReservedCapacity();
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('No se pudo inicializar la capacidad reservada de los eventos:', error);
  process.exit(1);
});
