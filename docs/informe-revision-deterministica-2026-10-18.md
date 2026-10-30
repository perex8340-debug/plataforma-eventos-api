# Informe de revisión determinística — Pre-entrega 8

**Proyecto:** control-cupos
**Fecha:** 18/10/2026
**Alcance:** arquitectura DAO, Repository, Service, Controller y DTO; manejo de errores; preservación de los flujos existentes.

## Separación por capas

La revisión estática confirmó:

- Los únicos imports directos de modelos (`User`, `Event`, `Ticket`) están en `src/dao/`.
- Los repositories importan sus DAOs correspondientes y no importan modelos.
- Services y controllers no importan DAOs, modelos ni Mongoose.
- Las estrategias de Passport delegan el registro y la autenticación a `SessionsService`.
- El armado de filtros, ordenamiento y paginación de eventos está en `EventsRepository`; `EventsService` conserva la validación de reglas y serializa el resultado.

El flujo implementado es:

```text
routes → controllers → services → repositories → DAO → models
```

## Responsabilidades verificadas

| Capa | Operaciones observadas |
|---|---|
| DAO | Consultas y escrituras de Mongoose; agregación para contar tickets activos |
| Repository | Operaciones de dominio como `createUser`, `listUsers`, `listEvents`, `findForBusinessRules`, `countActiveTickets`, `cancelTicket`, `findTicketsForEvent` y `findTicketsForUser` |
| Service | Registro/login, validaciones, cupos, estados, duplicados, permisos, notificaciones y DTO de respuestas |
| Controller | Lectura de request, llamada al service y construcción de response |
| DTO | Campos permitidos para usuario, evento, ticket y documentos populados |

Las actualizaciones de eventos filtran los campos editables, validan sus tipos y evitan reducir la capacidad por debajo de los cupos activos. Los errores de validación y casteo de Mongoose se responden como `400`; se mantiene el middleware central para `401`, `403`, `404`, `409` y `500`.

## DTO y datos sensibles

- `userDTO` y `userSummaryDTO` no incluyen `password`.
- `eventDTO` filtra el organizador populado.
- `myTicketsDTO` y `eventTicketsDTO` filtran los documentos relacionados populados.
- Las respuestas de `/current`, eventos y tickets continúan pasando por los DTO correspondientes.

## Verificaciones ejecutadas

- `node --check` en todos los archivos JavaScript bajo `src/`: sin errores.
- Revisión estática de imports: los modelos solo se importan desde los DAO; services y controllers no acceden a DAO/modelos directamente.
- `npm test`: **39/39 PASS**, 5 suites, 0 fallos, 0 cancelaciones. El reporte detallado está en [`reporte-ejecucion-tests.md`](reporte-ejecucion-tests.md).

En el entorno aislado de esta revisión, MongoDB en memoria necesitó que `TEMP` y `TMP` apuntaran a una carpeta del workspace; con la ruta temporal predeterminada, Windows bloqueó la escritura de WiredTiger. La suite pasó al corregir esa ruta temporal, sin modificar el proyecto.

## Archivos de entrega

El repositorio contiene `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `README.md`, la suite de tests y ambos informes. No se incluyeron `.env`, `node_modules` ni credenciales privadas en Git.
