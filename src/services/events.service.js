const eventsRepository = require('../repositories/events.repository');
const ticketsRepository = require('../repositories/tickets.repository');
const { eventDTO } = require('../dto/event.dto');
const { HttpError } = require('../utils/errors');

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const VALID_STATUSES = ['draft', 'published', 'cancelled', 'finished'];
class EventsService {
  // -------------------------------------------------------------------------
  // Validaciones de negocio (viven aca, no en rutas ni controllers)
  // -------------------------------------------------------------------------

  validateEventInput(eventData) {
    if (!eventData || typeof eventData !== 'object' || Array.isArray(eventData)) {
      throw new HttpError(400, 'Los datos del evento no son válidos');
    }

    const { title, description, category, date, location, capacity, price } = eventData;
    if ([title, description, category, location].some(
      (value) => typeof value !== 'string' || !value.trim()
    )) {
      throw new HttpError(400, 'Faltan campos obligatorios');
    }

    if (!date) {
      throw new HttpError(400, 'La fecha del evento es obligatoria');
    }

    const eventDate = new Date(date);
    if (Number.isNaN(eventDate.getTime())) {
      throw new HttpError(400, 'La fecha del evento no es válida');
    }

    if (eventDate.getTime() <= Date.now()) {
      throw new HttpError(400, 'No se puede crear un evento con fecha pasada');
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new HttpError(400, 'La capacidad debe ser un número entero mayor a 0');
    }

    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      throw new HttpError(400, 'El precio no puede ser negativo');
    }
  }

  assertCanModify(event, user) {
    const isOwner = event.organizer.toString() === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new HttpError(403, 'No tenés permisos para modificar este evento');
    }
  }

  assertValidId(id) {
    if (!OBJECT_ID_REGEX.test(String(id))) {
      throw new HttpError(400, 'Identificador de evento no válido');
    }
  }

  assertNotCancelled(event) {
    if (event.status === 'cancelled') {
      throw new HttpError(400, 'Un evento cancelado no puede modificarse');
    }
  }

  assertCanPublish(event) {
    if (event.status === 'finished' || event.status === 'cancelled') {
      throw new HttpError(
        400,
        'No se puede publicar un evento ya finalizado o cancelado'
      );
    }
    if (new Date(event.date).getTime() <= Date.now()) {
      throw new HttpError(400, 'No se puede publicar un evento con fecha pasada');
    }
  }

  // -------------------------------------------------------------------------
  // Acciones
  // -------------------------------------------------------------------------

  async createEvent(user, eventData) {
    this.validateEventInput(eventData);

    const event = await eventsRepository.createEvent({
      title: eventData.title.trim(),
      description: eventData.description.trim(),
      category: eventData.category.trim(),
      date: new Date(eventData.date),
      location: eventData.location.trim(),
      capacity: eventData.capacity,
      price: eventData.price,
      organizer: user.id,
    });

    return this.getPublicEvent(event);
  }

  async getEventById(id) {
    this.assertValidId(id);
    const event = await eventsRepository.findById(id);
    if (!event) {
      throw new HttpError(404, 'Evento no encontrado');
    }
    return this.getPublicEvent(event, true);
  }

  async listEvents(query) {
    this.validateListQuery(query);
    const result = await eventsRepository.listEvents(query);
    return {
      ...result,
      data: result.data.map((event) => this.getPublicEvent(event)),
    };
  }

  async updateEvent(user, id, updateData) {
    this.assertValidId(id);
    const event = await eventsRepository.findForBusinessRules(id);
    if (!event) {
      throw new HttpError(404, 'Evento no encontrado');
    }

    this.assertCanModify(event, user);
    this.assertNotCancelled(event);

    if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
      throw new HttpError(400, 'Los datos del evento no son válidos');
    }

    // El estado y el organizador no se pueden modificar desde este endpoint.
    const editableFields = ['title', 'description', 'category', 'date', 'location', 'capacity', 'price'];
    const updates = Object.fromEntries(
      Object.entries(updateData).filter(([field]) => editableFields.includes(field))
    );
    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, 'No hay campos válidos para actualizar');
    }

    for (const field of ['title', 'description', 'category', 'location']) {
      if (updates[field] !== undefined) {
        if (typeof updates[field] !== 'string' || !updates[field].trim()) {
          throw new HttpError(400, `El campo ${field} no es válido`);
        }
        updates[field] = updates[field].trim();
      }
    }

    if (updates.date !== undefined) {
      const eventDate = new Date(updates.date);
      if (Number.isNaN(eventDate.getTime())) {
        throw new HttpError(400, 'La fecha del evento no es válida');
      }
      if (eventDate.getTime() <= Date.now()) {
        throw new HttpError(400, 'La fecha del evento no puede ser pasada');
      }
      updates.date = eventDate;
    }

    if (
      updates.capacity !== undefined &&
      (!Number.isInteger(updates.capacity) || updates.capacity <= 0)
    ) {
      throw new HttpError(400, 'La capacidad debe ser un número entero mayor a 0');
    }

    if (updates.capacity !== undefined) {
      const occupied = await ticketsRepository.countActiveTickets(id);
      if (updates.capacity < occupied) {
        throw new HttpError(409, 'La capacidad no puede ser menor a los cupos ya ocupados');
      }
    }

    if (
      updates.price !== undefined &&
      (typeof updates.price !== 'number' ||
        Number.isNaN(updates.price) ||
        updates.price < 0)
    ) {
      throw new HttpError(400, 'El precio no puede ser negativo');
    }

    const updated = updates.capacity === undefined
      ? await eventsRepository.updateEvent(id, updates)
      : await eventsRepository.updateEventCapacity(id, updates, updates.capacity);
    if (!updated) {
      throw new HttpError(409, 'La capacidad no puede ser menor a los cupos ya ocupados');
    }
    return this.getPublicEvent(updated, true);
  }

  async updateStatus(user, id, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new HttpError(
        400,
        `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`
      );
    }

    this.assertValidId(id);
    const event = await eventsRepository.findForBusinessRules(id);
    if (!event) {
      throw new HttpError(404, 'Evento no encontrado');
    }

    this.assertCanModify(event, user);

    if (event.status === 'cancelled') {
      throw new HttpError(400, 'Un evento cancelado no puede modificarse');
    }

    if (newStatus === 'published') {
      this.assertCanPublish(event);
    }

    const updated = await eventsRepository.updateEvent(id, { status: newStatus });
    return this.getPublicEvent(updated, true);
  }

  // -------------------------------------------------------------------------
  // Validación de criterios para listar eventos
  // -------------------------------------------------------------------------

  validateListQuery(query = {}) {
    if (query.status && !VALID_STATUSES.includes(query.status)) {
      throw new HttpError(400, 'Estado de evento no válido');
    }

    for (const field of ['dateFrom', 'dateTo']) {
      if (query[field] && Number.isNaN(new Date(query[field]).getTime())) {
        throw new HttpError(400, `El filtro ${field} no contiene una fecha válida`);
      }
    }

    if (query.dateFrom && query.dateTo && new Date(query.dateFrom) > new Date(query.dateTo)) {
      throw new HttpError(400, 'El rango de fechas no es válido');
    }
  }

  // -------------------------------------------------------------------------
  // Serialización pública (DTO: nunca expone datos sensibles)
  // -------------------------------------------------------------------------

  getPublicEvent(event, withOrganizer = false) {
    return eventDTO(event, { withOrganizer });
  }
}

module.exports = new EventsService();
