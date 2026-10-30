const eventsDAO = require('../dao/events.dao');

class EventsRepository {
  async createEvent(eventData) {
    return eventsDAO.create(eventData);
  }

  // findById devuelve el evento con organizer poblado
  async findById(id) {
    return eventsDAO.findById(id);
  }

  // findByIdLean devuelve el documento sin populate (para chequear
  // ownership sin traer datos del organizador)
  async findForBusinessRules(id) {
    return eventsDAO.findByIdLean(id);
  }

  async listEvents(query = {}) {
    const { filter, sort, page, limit } = this.buildListOptions(query);
    const [data, total] = await Promise.all([
      eventsDAO.find(filter, { sort, skip: (page - 1) * limit, limit }),
      eventsDAO.count(filter),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async updateEvent(id, updateData) {
    return eventsDAO.findByIdAndUpdate(id, updateData);
  }

  async updateEventCapacity(id, updateData, capacity) {
    return eventsDAO.findByIdAndUpdateWithCapacityGuard(id, updateData, capacity);
  }

  async reserveCapacity(id, quantity) {
    return eventsDAO.reserveCapacity(id, quantity);
  }

  async releaseCapacity(id, quantity) {
    return eventsDAO.releaseCapacity(id, quantity);
  }

  async synchronizeReservedCapacity() {
    return eventsDAO.synchronizeReservedCapacity();
  }

  buildListOptions(query) {
    const filter = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = { $regex: new RegExp(this.escapeRegex(query.category), 'i') };
    }
    if (query.location) {
      filter.location = { $regex: new RegExp(this.escapeRegex(query.location), 'i') };
    }

    const dateRange = {};
    if (query.dateFrom) {
      dateRange.$gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      dateRange.$lte = new Date(query.dateTo);
    }
    if (Object.keys(dateRange).length > 0) {
      filter.date = dateRange;
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);

    return { filter, sort: this.buildSort(query.sort), page, limit };
  }

  buildSort(sortParam) {
    const sortableFields = ['date', 'title', 'category', 'location', 'capacity', 'price', 'status'];
    if (!sortParam) {
      return { date: 1 };
    }

    const sort = {};
    for (const part of String(sortParam).split(',')) {
      let field = part.trim();
      let order = 1;
      if (field.startsWith('-')) {
        order = -1;
        field = field.slice(1);
      }
      if (sortableFields.includes(field)) {
        sort[field] = order;
      }
    }

    return Object.keys(sort).length > 0 ? sort : { date: 1 };
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = new EventsRepository();
