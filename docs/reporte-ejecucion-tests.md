# Reporte de Ejecución de Tests - Pre-entrega 8

> Informe histórico de la pre-entrega 8 (18/10/2026). Para los resultados de la
> versión final y su suite ampliada, consulta
> [reporte-entrega-final.md](reporte-entrega-final.md).

**Proyecto:** control-cupos
**Comando:** `npm test`
**Runner:** Node.js Test Runner nativo (`node --test`)
**Base de datos:** `mongodb-memory-server` (MongoDB real en memoria)
**Cliente HTTP:** `supertest`
**Fecha de ejecución:** 18/10/2026

En el entorno aislado de revisión, las variables `TEMP` y `TMP` se apuntaron al
workspace para permitir que MongoDB en memoria escribiera sus archivos de
WiredTiger. La primera ejecución con el directorio temporal predeterminado fue
bloqueada por permisos del sandbox; no fue un fallo de la API.

## Resultado global: **39/39 PASS**

```
ℹ tests 39
ℹ suites 5
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 20217.3516
```

> Los tests corren contra una instancia real de MongoDB en memoria. El envío de
> emails se apunta a un puerto local cerrado de forma intencional: la conexión
> SMTP falla con `ECONNREFUSED` y el `tickets.service` captura el error sin
> perder la inscripción/cancelación. Esto valida el comportamiento no bloqueante
> de las notificaciones.

## Suites y casos ejecutados

### Suite 1 — Sesiones y autenticación (8)
| # | Caso | Esperado | Obtenido | Estado |
|---|------|----------|----------|--------|
| 1 | Registro exitoso | 201 | 201 | PASS |
| 2 | Registro sin campos obligatorios | 400 | 400 | PASS |
| 3 | Registro con email inválido | 400 | 400 | PASS |
| 4 | Registro duplicado | 409 | 409 | PASS |
| 5 | Login exitoso (cookie JWT) | 200 | 200 | PASS |
| 6 | Login con password incorrecta | 401 | 401 | PASS |
| 7 | `GET /current` sin sesión | 401 | 401 | PASS |
| 8 | `GET /current` con sesión, sin password | 200 | 200 | PASS |

### Suite 2 — Eventos (8)
| # | Caso | Esperado | Obtenido | Estado |
|---|------|----------|----------|--------|
| 9 | Crear evento como user común | 403 | 403 | PASS |
| 10 | Crear evento como organizer | 201 | 201 | PASS |
| 11 | Crear evento con fecha pasada | 400 | 400 | PASS |
| 12 | Publicar evento | 200 | 200 | PASS |
| 13 | Listar eventos | 200 | 200 | PASS |
| 14 | Obtener evento por id | 200 | 200 | PASS |
| 15 | Obtener evento inexistente | 404 | 404 | PASS |
| 16 | Obtener evento con id mal formado | 400 | 400 | PASS |

### Suite 3 — Inscripciones y control de cupos (13)
| # | Caso | Esperado | Obtenido | Estado |
|---|------|----------|----------|--------|
| 17 | Inscripción exitosa (ticket sin password) | 201 | 201 | PASS |
| 18 | Inscripción sin sesión | 401 | 401 | PASS |
| 19 | Inscripción a evento inexistente | 404 | 404 | PASS |
| 20 | Inscripción a evento no publicado (draft) | 400 | 400 | PASS |
| 21 | Inscripción a evento cancelado | 400 | 400 | PASS |
| 22 | Inscripción a evento con fecha ya pasada | 400 | 400 | PASS |
| 23 | `quantity` inválida (0) | 400 | 400 | PASS |
| 24 | Sin cupo suficiente | 409 | 409 | PASS |
| 25 | Inscripción duplicada activa | 409 | 409 | PASS |
| 26 | `GET /my-tickets` con populate, sin password | 200 | 200 | PASS |
| 27 | `GET /my-tickets` sin sesión | 401 | 401 | PASS |
| 28 | `GET /events/:eid/tickets` (organizer dueño), sin password | 200 | 200 | PASS |
| 29 | `GET /events/:eid/tickets` (user común) | 403 | 403 | PASS |
| 30 | `GET /events/:eid/tickets` (otro organizer) | 403 | 403 | PASS |

### Suite 4 — Cancelaciones y liberación de cupos (5)
| # | Caso | Esperado | Obtenido | Estado |
|---|------|----------|----------|--------|
| 31 | Cancelar ticket propio (cancelled + cancelledAt) | 200 | 200 | PASS |
| 32 | Cancelar ticket ya cancelado | 400 | 400 | PASS |
| 33 | Cancelar ticket ajeno como user | 403 | 403 | PASS |
| 34 | Cancelar ticket ajeno como admin | 200 | 200 | PASS |
| 35 | Cupo liberado tras cancelación (reinscripción) | 201 | 201 | PASS |

### Suite 5 — Ruta administrativa de usuarios (4)
| # | Caso | Esperado | Obtenido | Estado |
|---|------|----------|----------|--------|
| 36 | `GET /users` como admin, sin password | 200 | 200 | PASS |
| 37 | `GET /users` como organizer | 403 | 403 | PASS |
| 38 | `GET /users` sin sesión | 401 | 401 | PASS |
| 39 | Ruta inexistente | 404 | 404 | PASS |

## Verificación DTO / sanitización

- `GET /current`: la respuesta no contiene `password` (verificado por aserción).
- Tickets con `populate(event)`: evento resumido vía `myTicketsDTO`.
- Tickets con `populate(user)`: usuario embebido sin `password` vía `eventTicketsDTO`.
- Listado admin de usuarios: serializado vía `userDTO`, sin `password`.

## Conclusión

Tras la refactorización a **DAO → Repository → Service → Controller + DTO**, el
comportamiento externo de la API se preserva íntegramente. **39/39 PASS**, sin
regresiones. La suite es reproducible con `npm test` en cualquier entorno con
Node.js y conexión para descargar el binario de MongoDB en memoria.
