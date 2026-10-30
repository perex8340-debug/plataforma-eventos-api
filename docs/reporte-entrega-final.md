# Reporte de validación de la entrega final

**Comando:** `npm test`
**Fecha:** 29/10/2026
**Base de datos:** MongoDB en memoria (`mongodb-memory-server`)
**Cliente HTTP:** Supertest

## Resultado

**49/49 tests aprobados**, distribuidos en cinco suites:

| Suite | Casos |
|---|---:|
| Sesiones y autenticación | 10 |
| Eventos | 13 |
| Inscripciones y control de cupos | 16 |
| Cancelaciones y liberación de cupos | 6 |
| Autorización administrativa | 4 |

La suite incluye solicitudes concurrentes para verificar que la capacidad del
evento no se sobrevende y que un usuario no obtiene dos inscripciones activas
al mismo evento. También cubre registro → login → current → logout → current
(401), registro público con intento de asignar un rol, permisos por rol y
propiedad, filtros/orden/paginación, liberación de cupos y DTOs sin contraseña.

## Prueba de correo

Los tests configuran Nodemailer contra un puerto SMTP local cerrado. El envío
falla de forma intencional y se comprueba que la creación o cancelación del
ticket no se pierde por ese fallo. No se envían correos a destinatarios reales;
para validar recepción, configura un servidor SMTP de pruebas mediante las
variables `MAIL_*` del archivo `.env`.
