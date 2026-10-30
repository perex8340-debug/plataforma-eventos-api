# Informe de Revisión Determinística - Pre-entrega 8

> Revisión histórica del 16/10/2026. Consultá el [informe actualizado del 18/10/2026](informe-revision-deterministica-2026-10-18.md) para el estado actual del código.

**Proyecto:** control-cupos
**Alcance:** Arquitectura en capas DAO, Repository y DTO
**Base:** refactor estructural sin cambios de comportamiento externo
**Fecha de verificación:** 16/10/2026

## 1. Verificación de sintaxis (node --check)

Se verificó la sintaxis de todos los archivos fuente sin errores:

- `src/app.js` — OK
- `src/server.js` — OK
- `src/config/*.js` (env, database, passport) — OK
- `src/dao/*.js` — OK
- `src/repositories/*.js` — OK
- `src/dto/*.js` — OK
- `src/services/*.js` — OK
- `src/controllers/*.js` — OK
- `src/routes/*.js` — OK
- `src/middlewares/*.js` — OK
- `src/utils/*.js` — OK

**Resultado:** 0 errores de sintaxis.

## 2. Separación estricta de responsabilidades por capas

| Regla de acoplamiento | Verificación | Resultado |
|---|---|---|
| Los DAO son los **únicos** que importan modelos de Mongoose | `grep "require('../models/`" en `src/` | **Cumple** (solo `src/dao/*.js`) |
| Los Repositories usan el DAO; **no** importan modelos | `grep` en `src/repositories/` | **Cumple** (importan `../dao/*`) |
| Los Services consumen **Repositories**, nunca DAO/modelos | `grep "dao\|models\|mongoose"` en `src/services/` | **Cumple** (0 coincidencias) |
| Los Controllers solo coordinan request/response | `grep "dao\|models\|mongoose"` en `src/controllers/` | **Cumple** (0 coincidencias) |
| Los DTO controlan las respuestas y filtran datos sensibles | Revisión de `src/dto/*.js` | **Cumple** |

### Métodos por capa

- **DAO** (acceso a datos, nombres técnicos): `findById`, `findOne`, `find`,
  `count`, `create`, `findByIdAndUpdate`, `countActiveTickets` (agregación de cupos).
- **Repository** (orientado al dominio): `findByEmail`, `findByIdLean`,
  `findActiveByUserAndEvent`, `countActiveTickets`, `cancelTicket`, `findByEvent`,
  `findByUser`.
- **Service** (lógica de negocio): validación de cupos, estados del evento,
  duplicados, permisos sobre recursos propios, generación de `reservationCode`,
  envío de notificaciones.

## 3. Sanitización de respuestas (DTO)

- Ninguna respuesta expone `password` ni su hash.
- `userDTO` / `userSummaryDTO` controlan las respuestas de usuario.
- `eventDTO` filtra el `organizer` populado (usa `userSummaryDTO`).
- `ticketDTO`, `myTicketsDTO`, `eventTicketsDTO` filtran los documentos
  relacionados cuando hay `populate` (`event` y `user`).
- Verificado con tests que hacen `populate` y comprueban la ausencia de `password`.

**Resultado:** Cumple sanitización.

## 4. Integridad funcional y preservación de la lógica de negocio

La refactorización fue arquitectónica; no se alteró el contrato externo. Se
preserva el comportamiento de:

- Autenticación/autorización (JWT en cookie HTTP Only; roles `user`/`organizer`/`admin`).
- Gestión de eventos (creación, edición, publicación, estados).
- Control de cupos, inscripciones y detección de duplicados.
- Cancelaciones lógicas (`cancelled` + `cancelledAt`) con liberación automática de cupo.
- Notificaciones por email no bloqueantes (confirmación y cancelación).

### Manejo de errores consistente (middleware central)

`src/middlewares/errorHandler.js` centraliza las respuestas de error:

| Código | Situación |
|--------|-----------|
| 400 | Datos inválidos o regla de negocio |
| 401 | Sin sesión / token inválido o expirado |
| 403 | Sin permisos (rol o propiedad del recurso) |
| 404 | Recuso inexistente o id mal formado |
| 409 | Conflicto (cupo insuficiente, duplicado, email ya registrado) |
| 500 | Error interno no anticipado |

También traduce errores con `status` HTTP explícito (p. ej. `AuthenticationError`
de passport por credenciales faltantes) a su código correcto, **evitando que un
error de negocio termine en un 500 genérico**.

## 5. Verificación ejecutable

Los resultados anteriores se sustentan en la suite `tests/api.test.js`
(ejecutable con `npm test`). Ver `docs/reporte-ejecucion-tests.md`:

```
ℹ tests 39
ℹ pass 39
ℹ fail 0
```

**Conclusión:** La arquitectura DAO/Repository/DTO es correcta, con separación
estricta de responsabilidades, DTOs que sanitizan las respuestas y manejo de
errores consistente. Sin regresiones funcionales verificadas por 39 tests
end-to-end sobre MongoDB real en memoria.
