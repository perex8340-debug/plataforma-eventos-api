# API Backend — Plataforma de Eventos e Inscripciones

API REST para gestionar usuarios, eventos e inscripciones con tickets, control de cupos y notificaciones por correo. Esta entrega final integra en un único proyecto el trabajo progresivo de la plataforma: autenticación, Passport, roles, gestión de eventos, inscripciones y arquitectura en capas. No es una API nueva separada de las pre-entregas.

## Funcionalidades

- Registro público de usuarios con rol inicial **user** y contraseña hasheada con bcrypt.
- Login con Passport Local y JWT guardado en una cookie **HttpOnly**.
- Consulta de usuario actual y cierre de sesión.
- Roles **user**, **organizer** y **admin**, con permisos por rol y propiedad del recurso.
- CRUD de eventos, validaciones de fecha, precio, capacidad y estado, filtros, ordenamiento y paginación.
- Inscripciones mediante tickets, reservas atómicas de cupo, prevención de duplicados incluso ante solicitudes concurrentes y cancelación que libera capacidad.
- Emails de confirmación y cancelación con Nodemailer.
- DAO, Repository, Services, Controllers y DTOs separados por responsabilidad.
- Middleware centralizado para respuestas de error consistentes.

## Tecnologías

- Node.js, Express y MongoDB con Mongoose.
- Passport Local y Passport JWT.
- bcrypt para contraseñas y JSON Web Token para sesiones.
- Nodemailer para notificaciones.
- node:test, Supertest y mongodb-memory-server para pruebas de API.

## Arquitectura

El flujo de las solicitudes es:

    routes → controllers → services → repositories → DAO → models

- **Routes:** declaran endpoints y aplican autenticación/autorización.
- **Controllers:** leen body, params y query; delegan al Service y forman la respuesta HTTP.
- **Services:** concentran reglas de negocio, permisos de propiedad, validaciones, cupos, duplicados y notificaciones.
- **Repositories:** exponen operaciones del dominio y aíslan consultas/filtros de persistencia.
- **DAO:** encapsulan consultas y escrituras de Mongoose. Los modelos se importan desde esta capa.
- **DTO:** definen los campos que se exponen para usuario, evento, ticket y documentos populados.
- **Models:** contienen los esquemas de User, Event y Ticket.
- **Middlewares:** autentican, autorizan y normalizan errores.
- **Config / utils:** cargan variables de entorno, conectan la base y manejan JWT, hashes y errores.

La API no devuelve contraseñas ni sus hashes. Los DTOs también filtran los usuarios y eventos relacionados cuando llegan mediante populate.

### Estructura

    src/
      config/
      controllers/
      dao/
      dto/
      middlewares/
      models/
      repositories/
      routes/
      services/
      utils/
      app.js
      server.js
    tests/
      api.test.js
    docs/
      informe-revision-deterministica.md
      informe-revision-deterministica-2026-10-18.md
      reporte-ejecucion-tests.md
      reporte-entrega-final.md
    evidencias/

## Requisitos e instalación

Se necesita Node.js 20.19 o superior y una instancia de MongoDB local o Atlas.

~~~powershell
git clone https://github.com/perex8340-debug/plataforma-eventos-api.git
cd plataforma-eventos-api
npm install
Copy-Item .env.example .env
~~~

Completa las variables de .env y luego inicia la API:

~~~powershell
npm run dev
~~~

Para iniciar en modo normal:

~~~powershell
npm start
~~~

La API usa el puerto **3000** por defecto. La ruta de salud es **GET /**.
Al iniciar, la API sincroniza los cupos reservados con los tickets activos existentes antes de aceptar solicitudes.

## Variables de entorno

| Variable | Uso | Requerida |
|---|---|---|
| PORT | Puerto HTTP; por defecto 3000 | No |
| MONGO_URL | URI de MongoDB | Sí |
| JWT_SECRET | Clave privada para firmar JWT | Sí |
| JWT_EXPIRES_IN | Duración del token; por defecto 1h | No |
| NODE_ENV | development, test o production | No |
| MAIL_HOST | Host SMTP | Sí |
| MAIL_PORT | Puerto SMTP; 465 usa TLS | No |
| MAIL_USER | Usuario SMTP | Sí |
| MAIL_PASS | Contraseña o app password SMTP | Sí |
| MAIL_FROM | Remitente de emails | Sí |

Usa .env.example como plantilla. No subas .env ni credenciales; ambos quedan fuera del repositorio mediante .gitignore.

## Roles y usuarios de prueba

| Rol | Permisos principales |
|---|---|
| user | Consultar eventos, inscribirse y administrar sus propios tickets |
| organizer | Crear eventos y administrar sus eventos; consultar sus inscripciones |
| admin | Administrar eventos y tickets de cualquier organizador; listar usuarios |

El registro público no permite asignar roles: aunque el body incluya role, el usuario queda como user. Para crear cuentas de prueba de organizer o admin:

1. Registra la cuenta por POST /api/sessions/register.
2. Cambia el rol en la base de desarrollo desde mongosh:

~~~javascript
use eventos_inscripciones
db.users.updateOne(
  { email: "organizer@example.com" },
  { $set: { role: "organizer" } }
)
~~~

Para una cuenta administrativa, usa role: "admin". Luego vuelve a iniciar sesión para que el JWT contenga el rol actualizado. No uses este procedimiento para usuarios reales sin controles administrativos.

## Endpoints

Todas las rutas usan el prefijo **/api**.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | /sessions/register | Público | Registra usuario con rol user |
| POST | /sessions/login | Público | Inicia sesión y establece cookie JWT |
| GET | /sessions/current | Autenticado | Devuelve el usuario actual sin password |
| POST | /sessions/logout | Público | Limpia la cookie de sesión |
| GET | /events | Público | Lista eventos con filtros, orden y paginación |
| GET | /events/:id | Público | Obtiene evento por id |
| POST | /events | organizer, admin | Crea evento en estado draft |
| PUT | /events/:id | Dueño del evento, admin | Actualiza campos editables |
| PATCH | /events/:id/status | Dueño del evento, admin | Cambia estado |
| POST | /events/:eid/tickets | Autenticado | Crea inscripción si hay cupo |
| GET | /tickets/my-tickets | Autenticado | Lista tickets propios |
| GET | /events/:eid/tickets | Dueño del evento, admin | Lista tickets y ocupación del evento |
| PATCH | /tickets/:tid/cancel | Dueño del ticket, admin | Cancela el ticket y libera cupo |
| GET | /users | admin | Lista usuarios sin datos de contraseña |

Los cambios de estado disponibles para eventos son **draft**, **published**, **cancelled** y **finished**. Un evento cancelado no se puede modificar. Solo se puede inscribir en eventos publicados y futuros.

### Filtros, orden y paginación

GET /api/events acepta:

- status: draft, published, cancelled o finished.
- category y location: coincidencia parcial sin distinguir mayúsculas.
- dateFrom y dateTo: límites de fecha.
- page y limit: página y tamaño; limit tiene máximo 100.
- sort: campo ascendente o descendente; prefijo - indica descendente. Ejemplos: date, -date, title.

Ejemplo:

~~~text
GET /api/events?status=published&category=tech&page=2&limit=5&sort=-date
~~~

La lista devuelve los campos de paginación al mismo nivel que `data`:

~~~json
{
  "status": "success",
  "data": [
    { "id": "6690...", "title": "Congreso Tech 2026", "status": "published" }
  ],
  "page": 2,
  "limit": 5,
  "total": 27,
  "totalPages": 6
}
~~~

## Ejemplos de uso

Los ejemplos usan curl y una cookie jar para conservar la sesión. En PowerShell también puedes usar curl.exe.

### 1. Registro, login, current y logout

~~~bash
curl -i -X POST http://localhost:3000/api/sessions/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Ana","last_name":"Pérez","email":"ana@example.com","password":"ClaveSegura123"}'

curl -i -c cookies.txt -X POST http://localhost:3000/api/sessions/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"ClaveSegura123"}'

curl -i -b cookies.txt http://localhost:3000/api/sessions/current

curl -i -b cookies.txt -c cookies.txt -X POST \
  http://localhost:3000/api/sessions/logout

curl -i -b cookies.txt http://localhost:3000/api/sessions/current
~~~

El último request debe responder **401**. La cookie contiene el JWT y se marca HttpOnly; la respuesta de login no devuelve el token ni el password.

### 2. Crear y publicar un evento

Inicia sesión con una cuenta organizer y conserva su cookie en organizer-cookies.txt.

~~~bash
curl -i -b organizer-cookies.txt -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Congreso Tech 2026","description":"Encuentro de tecnología","category":"tech","date":"2026-12-10T15:00:00.000Z","location":"Bogotá","capacity":100,"price":0}'
~~~

La creación devuelve un evento draft. Publica el evento con el id recibido:

~~~bash
curl -i -b organizer-cookies.txt -X PATCH \
  http://localhost:3000/api/events/EVENT_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"published"}'
~~~

### 3. Inscribirse, consultar tickets y cancelar

Inicia sesión con una cuenta user y conserva la cookie en user-cookies.txt.

~~~bash
curl -i -b user-cookies.txt -X POST \
  http://localhost:3000/api/events/EVENT_ID/tickets \
  -H "Content-Type: application/json" \
  -d '{"quantity":1}'

curl -i -b user-cookies.txt \
  http://localhost:3000/api/tickets/my-tickets

curl -i -b user-cookies.txt -X PATCH \
  http://localhost:3000/api/tickets/TICKET_ID/cancel
~~~

El ticket confirmado reserva cupo. Al cancelarlo, conserva el documento con estado cancelled y cancelledAt; su cantidad deja de contar como ocupada.

### Respuesta de inscripción

~~~json
{
  "status": "success",
  "payload": {
    "id": "66a...",
    "user": "665f...",
    "event": "6690...",
    "status": "confirmed",
    "quantity": 1,
    "reservationCode": "A1B2C3D4E5F60708",
    "createdAt": "2026-10-20T12:00:00.000Z",
    "cancelledAt": null
  }
}
~~~

Si no hay cupo o ya existe una inscripción activa, responde **409**. Los tickets cancelled no cuentan para el cupo ni bloquean una nueva inscripción.

## Errores HTTP

| Código | Significado |
|---|---|
| 400 | Request o regla de negocio inválida |
| 401 | No autenticado, cookie ausente o token inválido |
| 403 | Autenticado, pero sin rol o propiedad suficiente |
| 404 | Recurso inexistente |
| 409 | Duplicado o conflicto de cupos |
| 500 | Error interno no previsto |

Todas las respuestas de error siguen el formato:

~~~json
{ "status": "error", "message": "Descripción del error" }
~~~

## Emails

Nodemailer envía un email cuando se confirma o cancela una inscripción. Configura las variables MAIL_* para recibirlos realmente. Si SMTP no responde, el ticket y el cambio de cupo se conservan y la API registra el error de envío.

La suite automatizada no usa credenciales reales ni envía emails externos: apunta a un puerto SMTP local cerrado para comprobar que la operación no se pierde si el proveedor de correo falla. Para verificar recepción real, configura un SMTP de desarrollo como Mailtrap o una cuenta de prueba.

## Pruebas

~~~powershell
npm test
~~~

La suite de integración usa una instancia MongoDB en memoria, Supertest y el runner nativo de Node. Cubre 49 casos de sesiones, cookies, roles, eventos, filtros/paginación, inscripción, duplicados concurrentes, cupos concurrentes, cancelaciones, DTOs y permisos. Los tests no usan credenciales ni envían correo a cuentas reales; el servidor SMTP local se deja cerrado para verificar que un fallo del proveedor no pierda la inscripción. El resultado está en [docs/reporte-entrega-final.md](docs/reporte-entrega-final.md).

## Entrega limpia

El repositorio incluye package.json, package-lock.json, .gitignore, .env.example, README, código, evidencias y pruebas. No incluye .env, node_modules ni credenciales privadas.