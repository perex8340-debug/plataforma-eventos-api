// Suite de tests automatizados end-to-end para la API de Eventos e Inscripciones.
// Usa el runner nativo de Node (node:test), supertest como cliente HTTP y
// mongodb-memory-server para levantar una base MongoDB real en memoria.
//
// Ejecutar con:  npm test

// Las variables de entorno deben quedar definidas ANTES de requerir la app,
// porque src/config/env.config.js valida y congela los valores al importarse.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-para-tests';
process.env.JWT_EXPIRES_IN = '1h';
// Mail apunta a un puerto local cerrado: el envío falla rápido (ECONNREFUSED)
// y el service lo captura (la inscripción/cancelación no se pierde).
process.env.MAIL_HOST = '127.0.0.1';
process.env.MAIL_PORT = '1';
process.env.MAIL_USER = 'test@example.com';
process.env.MAIL_PASS = 'test';
process.env.MAIL_FROM = 'test@example.com';

const { before, after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/models/User');
const Event = require('../src/models/Event');

let mongod;
let app;

// ---------------------------------------------------------------------------
// Ciclo de vida: base de datos en memoria + app
// ---------------------------------------------------------------------------
before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URL);
  app = require('../src/app');
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let seq = 0;
const uniqueEmail = () => `user${Date.now()}_${++seq}@test.com`;

const baseUser = (over = {}) => ({
  first_name: 'Nombre',
  last_name: 'Apellido',
  email: uniqueEmail(),
  password: 'secret123',
  ...over,
});

async function createUser(role = 'user') {
  const agent = request.agent(app);
  const data = baseUser();
  await agent.post('/api/sessions/register').send(data).expect(201);
  if (role !== 'user') {
    await User.updateOne({ email: data.email }, { role });
  }
  await agent
    .post('/api/sessions/login')
    .send({ email: data.email, password: data.password })
    .expect(200);
  const user = await User.findOne({ email: data.email });
  return { agent, data, id: user._id.toString() };
}

const futureDate = (days = 7) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

async function createEvent(agent, over = {}) {
  const payload = {
    title: 'Evento de prueba',
    description: 'Descripción del evento',
    category: 'tecnologia',
    date: futureDate(),
    location: 'Bogotá',
    capacity: 10,
    price: 0,
    ...over,
  };
  const res = await agent.post('/api/events').send(payload).expect(201);
  return { id: res.body.payload.id, payload };
}

async function createPublishedEvent(agent, over = {}) {
  const { id, payload } = await createEvent(agent, over);
  await agent.patch(`/api/events/${id}/status`).send({ status: 'published' }).expect(200);
  return { id, payload };
}

// ===========================================================================
// 1. Sesiones / autenticación
// ===========================================================================
describe('Sesiones y autenticación', () => {
  it('registro exitoso -> 201', async () => {
    const res = await request(app).post('/api/sessions/register').send(baseUser());
    assert.equal(res.status, 201);
    assert.equal(res.body.payload.email.includes('@'), true);
  });

  it('el registro público ignora el rol enviado en el body', async () => {
    const res = await request(app)
      .post('/api/sessions/register')
      .send(baseUser({ role: 'admin' }))
      .expect(201);
    assert.equal(res.body.payload.role, 'user');
  });

  it('registro sin campos obligatorios -> 400', async () => {
    const res = await request(app)
      .post('/api/sessions/register')
      .send({ email: 'soloemail@test.com' });
    assert.equal(res.status, 400);
  });

  it('registro con email inválido -> 400', async () => {
    const res = await request(app)
      .post('/api/sessions/register')
      .send(baseUser({ email: 'no-es-un-email' }));
    assert.equal(res.status, 400);
  });

  it('registro duplicado -> 409', async () => {
    const data = baseUser();
    await request(app).post('/api/sessions/register').send(data).expect(201);
    const res = await request(app).post('/api/sessions/register').send(data);
    assert.equal(res.status, 409);
  });

  it('login exitoso -> 200 y cookie', async () => {
    const { data } = await createUser('user');
    const res = await request(app)
      .post('/api/sessions/login')
      .send({ email: data.email, password: data.password });
    assert.equal(res.status, 200);
    assert.match(String(res.headers['set-cookie']), /currentUser=.*HttpOnly/i);
    assert.equal(res.body.token, undefined);
    assert.equal(res.body.password, undefined);
  });

  it('login con password incorrecta -> 401', async () => {
    const { data } = await createUser('user');
    const res = await request(app)
      .post('/api/sessions/login')
      .send({ email: data.email, password: 'incorrecta' });
    assert.equal(res.status, 401);
  });

  it('GET /current sin sesión -> 401', async () => {
    const res = await request(app).get('/api/sessions/current');
    assert.equal(res.status, 401);
  });

  it('GET /current con sesión -> 200 y NO expone password', async () => {
    const { agent } = await createUser('user');
    const res = await agent.get('/api/sessions/current').expect(200);
    assert.equal(res.body.payload.password, undefined);
    assert.equal('password' in res.body.payload, false);
    assert.ok(res.body.payload.email);
  });

  it('logout invalida la cookie para la siguiente consulta current', async () => {
    const { agent } = await createUser('user');
    await agent.post('/api/sessions/logout').expect(200);
    await agent.get('/api/sessions/current').expect(401);
  });
});

// ===========================================================================
// 2. Eventos
// ===========================================================================
describe('Eventos', () => {
  it('crear evento como user común -> 403', async () => {
    const { agent } = await createUser('user');
    const res = await agent.post('/api/events').send({ title: 'x' });
    assert.equal(res.status, 403);
  });

  it('crear evento como organizer -> 201', async () => {
    const { agent } = await createUser('organizer');
    const { id } = await createEvent(agent);
    assert.ok(id);
  });

  it('crear evento con fecha pasada -> 400', async () => {
    const { agent } = await createUser('organizer');
    const res = await agent.post('/api/events').send({
      title: 'Pasado',
      description: 'd',
      category: 'c',
      date: new Date(Date.now() - 86400000).toISOString(),
      location: 'l',
      capacity: 5,
      price: 0,
    });
    assert.equal(res.status, 400);
  });

  it('publicar evento -> 200', async () => {
    const { agent } = await createUser('organizer');
    const { id } = await createEvent(agent);
    const res = await agent.patch(`/api/events/${id}/status`).send({ status: 'published' });
    assert.equal(res.status, 200);
    assert.equal(res.body.payload.status, 'published');
  });

  it('listar eventos -> 200', async () => {
    const res = await request(app).get('/api/events');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(typeof res.body.page, 'number');
    assert.equal(typeof res.body.limit, 'number');
    assert.equal(typeof res.body.total, 'number');
    assert.equal(typeof res.body.totalPages, 'number');
  });

  it('filtra, ordena y pagina eventos con el contrato solicitado', async () => {
    const { agent: organizer } = await createUser('organizer');
    const category = `paginacion-${Date.now()}`;
    for (const days of [1, 2, 3]) {
      await createPublishedEvent(organizer, {
        category,
        date: futureDate(days),
      });
    }

    const res = await request(app)
      .get(`/api/events?status=published&category=${category}&page=2&limit=2&sort=-date`)
      .query({
        location: 'bogotá',
        dateFrom: futureDate(0),
        dateTo: futureDate(4),
      })
      .expect(200);

    assert.equal(res.body.status, 'success');
    assert.equal(res.body.page, 2);
    assert.equal(res.body.limit, 2);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.totalPages, 2);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].category, category);
    assert.equal(res.body.payload, undefined);
  });

  it('GET / responde con estado de salud', async () => {
    await request(app).get('/').expect(200);
  });

  it('obtener evento por id -> 200', async () => {
    const { agent } = await createUser('organizer');
    const { id } = await createPublishedEvent(agent);
    const res = await request(app).get(`/api/events/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.payload.id, id);
  });

  it('obtener evento inexistente -> 404', async () => {
    const res = await request(app).get('/api/events/64b7f1f1f1f1f1f1f1f1f1f1');
    assert.equal(res.status, 404);
  });

  it('obtener evento con id mal formado -> 400', async () => {
    const res = await request(app).get('/api/events/no-es-un-objectid');
    assert.equal(res.status, 400);
  });

  it('organizer ajeno no modifica un evento y admin sí puede hacerlo', async () => {
    const { agent: owner } = await createUser('organizer');
    const { id } = await createEvent(owner);
    const { agent: otherOrganizer } = await createUser('organizer');
    await otherOrganizer.put(`/api/events/${id}`).send({ title: 'No autorizado' }).expect(403);

    const { agent: admin } = await createUser('admin');
    const res = await admin.put(`/api/events/${id}`).send({ title: 'Editado por admin' });
    assert.equal(res.status, 200);
    assert.equal(res.body.payload.title, 'Editado por admin');
  });

  it('no reduce capacidad bajo reservas activas ni modifica eventos cancelados', async () => {
    const { agent: organizer } = await createUser('organizer');
    const { id } = await createPublishedEvent(organizer, { capacity: 2 });
    const { agent: user } = await createUser('user');
    await user.post(`/api/events/${id}/tickets`).send({ quantity: 2 }).expect(201);
    await organizer.put(`/api/events/${id}`).send({ capacity: 1 }).expect(409);

    await organizer.patch(`/api/events/${id}/status`)
      .send({ status: 'cancelled' })
      .expect(200);
    await organizer.put(`/api/events/${id}`).send({ title: 'Evento editado' }).expect(400);
  });

  it('rechaza capacidad cero', async () => {
    const { agent: organizer } = await createUser('organizer');
    const res = await organizer.post('/api/events').send({
      title: 'Evento inválido',
      description: 'Descripción',
      category: 'prueba',
      date: futureDate(),
      location: 'Bogotá',
      capacity: 0,
      price: 0,
    });
    assert.equal(res.status, 400);
  });
});

// ===========================================================================
// 3. Tickets / inscripciones / cupos
// ===========================================================================
describe('Inscripciones y control de cupos', () => {
  it('inscripción exitosa -> 201 y ticket sin password', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org, { capacity: 5 });
    const { agent: user, data: userData } = await createUser('user');
    const { transporter } = require('../src/services/mail.service');
    const originalSendMail = transporter.sendMail;
    const sentMessages = [];
    transporter.sendMail = async (message) => {
      sentMessages.push(message);
      return { messageId: 'test-message' };
    };
    let res;
    try {
      res = await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 });
    } finally {
      transporter.sendMail = originalSendMail;
    }
    assert.equal(res.status, 201);
    assert.equal(res.body.payload.status, 'confirmed');
    assert.equal(res.body.payload.password, undefined);
    assert.ok(res.body.payload.user);
    assert.ok(res.body.payload.event);
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].to, userData.email);
    assert.match(sentMessages[0].subject, /Inscripción confirmada/);
  });

  it('inscripción sin sesión -> 401', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const res = await request(app).post(`/api/events/${id}/tickets`).send({ quantity: 1 });
    assert.equal(res.status, 401);
  });

  it('inscripción a evento inexistente -> 404', async () => {
    const { agent: user } = await createUser('user');
    const res = await user
      .post('/api/events/64b7f1f1f1f1f1f1f1f1f1f1/tickets')
      .send({ quantity: 1 });
    assert.equal(res.status, 404);
  });

  it('inscripción a evento NO publicado (draft) -> 400', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createEvent(org);
    const { agent: user } = await createUser('user');
    const res = await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 });
    assert.equal(res.status, 400);
  });

  it('inscripción a evento cancelado -> 400', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    await org.patch(`/api/events/${id}/status`).send({ status: 'cancelled' }).expect(200);
    const { agent: user } = await createUser('user');
    const res = await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 });
    assert.equal(res.status, 400);
  });

  it('inscripción a evento con fecha ya pasada -> 400', async () => {
    const { agent: org, id: orgId } = await createUser('organizer');
    const event = await Event.create({
      title: 'Viejo',
      description: 'd',
      category: 'c',
      date: new Date(Date.now() - 86400000),
      location: 'l',
      capacity: 5,
      price: 0,
      status: 'published',
      organizer: orgId,
    });
    const { agent: user } = await createUser('user');
    const res = await user.post(`/api/events/${event._id}/tickets`).send({ quantity: 1 });
    assert.equal(res.status, 400);
  });

  it('quantity inválida (0) -> 400', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    const res = await user.post(`/api/events/${id}/tickets`).send({ quantity: 0 });
    assert.equal(res.status, 400);
  });

  it('sin cupo suficiente -> 409', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org, { capacity: 1 });
    const { agent: u1 } = await createUser('user');
    await u1.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const { agent: u2 } = await createUser('user');
    const res = await u2.post(`/api/events/${id}/tickets`).send({ quantity: 1 });
    assert.equal(res.status, 409);
  });

  it('inscripción duplicada activa -> 409', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const res = await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 });
    assert.equal(res.status, 409);
  });

  it('no sobrevende cupos cuando dos usuarios se inscriben a la vez', async () => {
    const { agent: organizer } = await createUser('organizer');
    const { id } = await createPublishedEvent(organizer, { capacity: 1 });
    const { agent: firstUser } = await createUser('user');
    const { agent: secondUser } = await createUser('user');

    const results = await Promise.all([
      firstUser.post(`/api/events/${id}/tickets`).send({ quantity: 1 }),
      secondUser.post(`/api/events/${id}/tickets`).send({ quantity: 1 }),
    ]);

    assert.deepEqual(results.map(({ status }) => status).sort(), [201, 409]);
    const event = await Event.findById(id);
    assert.equal(event.reservedCapacity, 1);
  });

  it('no crea tickets duplicados para solicitudes concurrentes del mismo usuario', async () => {
    const { agent: organizer } = await createUser('organizer');
    const { id } = await createPublishedEvent(organizer, { capacity: 2 });
    const { agent: user } = await createUser('user');

    const results = await Promise.all([
      user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }),
      user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }),
    ]);

    assert.deepEqual(results.map(({ status }) => status).sort(), [201, 409]);
    assert.equal(await Event.findById(id).then(({ reservedCapacity }) => reservedCapacity), 1);
  });

  it('GET /api/tickets/my-tickets con populate -> 200 sin password', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const res = await user.get('/api/tickets/my-tickets').expect(200);
    const ticket = res.body.payload[0];
    assert.ok(ticket.event.title);
    assert.equal(ticket.event.password, undefined);
  });

  it('GET /api/tickets/my-tickets sin sesión -> 401', async () => {
    const res = await request(app).get('/api/tickets/my-tickets');
    assert.equal(res.status, 401);
  });

  it('GET /api/events/:eid/tickets como organizer dueño -> 200 sin password de usuarios', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const res = await org.get(`/api/events/${id}/tickets`).expect(200);
    assert.ok(res.body.payload.tickets[0].user.email);
    assert.equal(res.body.payload.tickets[0].user.password, undefined);
  });

  it('GET /api/events/:eid/tickets como user común -> 403', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    const res = await user.get(`/api/events/${id}/tickets`);
    assert.equal(res.status, 403);
  });

  it('GET /api/events/:eid/tickets como otro organizer -> 403', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: other } = await createUser('organizer');
    const res = await other.get(`/api/events/${id}/tickets`);
    assert.equal(res.status, 403);
  });
});

// ===========================================================================
// 4. Cancelaciones
// ===========================================================================
describe('Cancelaciones y liberación de cupos', () => {
  it('cancelar ticket propio -> 200 (cancelled + cancelledAt)', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    const created = await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    assert.equal((await Event.findById(id)).reservedCapacity, 1);
    const tres = await user.patch(`/api/tickets/${created.body.payload.id}/cancel`);
    assert.equal(tres.status, 200);
    assert.equal(tres.body.payload.status, 'cancelled');
    assert.ok(tres.body.payload.cancelledAt);
    assert.equal((await Event.findById(id)).reservedCapacity, 0);
  });

  it('cancelar ticket ya cancelado -> 400', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: user } = await createUser('user');
    const created = await user.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const tid = created.body.payload.id;
    await user.patch(`/api/tickets/${tid}/cancel`).expect(200);
    const res = await user.patch(`/api/tickets/${tid}/cancel`);
    assert.equal(res.status, 400);
  });

  it('cancelar ticket ajeno como user -> 403', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: owner } = await createUser('user');
    const created = await owner.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const { agent: other } = await createUser('user');
    const res = await other.patch(`/api/tickets/${created.body.payload.id}/cancel`);
    assert.equal(res.status, 403);
  });

  it('cancelar ticket ajeno como admin -> 200', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org);
    const { agent: owner } = await createUser('user');
    const created = await owner.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    const { agent: admin } = await createUser('admin');
    const res = await admin.patch(`/api/tickets/${created.body.payload.id}/cancel`);
    assert.equal(res.status, 200);
  });

  it('el cupo se libera tras cancelar -> reinscripción 201', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org, { capacity: 1 });
    const { agent: u1 } = await createUser('user');
    const created = await u1.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
    // con capacity 1, otro usuario no puede entrar
    const { agent: u2 } = await createUser('user');
    await u2.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(409);
    // u1 cancela -> se libera el cupo
    await u1.patch(`/api/tickets/${created.body.payload.id}/cancel`).expect(200);
    await u2.post(`/api/events/${id}/tickets`).send({ quantity: 1 }).expect(201);
  });

  it('la sincronización inicial recupera cupos de tickets activos existentes', async () => {
    const { agent: org } = await createUser('organizer');
    const { id } = await createPublishedEvent(org, { capacity: 3 });
    const { agent: user } = await createUser('user');
    await user.post(`/api/events/${id}/tickets`).send({ quantity: 2 }).expect(201);
    await Event.updateOne({ _id: id }, { $set: { reservedCapacity: 0 } });

    await require('../src/repositories/events.repository').synchronizeReservedCapacity();

    assert.equal((await Event.findById(id)).reservedCapacity, 2);
  });
});

// ===========================================================================
// 5. Autorización administrativa
// ===========================================================================
describe('Ruta administrativa de usuarios', () => {
  it('GET /api/users como admin -> 200 sin password', async () => {
    const { agent: admin } = await createUser('admin');
    const res = await admin.get('/api/users').expect(200);
    assert.ok(Array.isArray(res.body.payload));
    assert.equal(res.body.payload.every((u) => u.password === undefined), true);
  });

  it('GET /api/users como organizer -> 403', async () => {
    const { agent: org } = await createUser('organizer');
    const res = await org.get('/api/users');
    assert.equal(res.status, 403);
  });

  it('GET /api/users sin sesión -> 401', async () => {
    const res = await request(app).get('/api/users');
    assert.equal(res.status, 401);
  });

  it('ruta inexistente -> 404', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');
    assert.equal(res.status, 404);
  });
});
