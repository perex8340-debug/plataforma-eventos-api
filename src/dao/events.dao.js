const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

class EventsDAO {
  async create(eventData) {
    return Event.create(eventData);
  }

  async findById(id) {
    return Event.findById(id).populate('organizer', 'first_name last_name email');
  }

  async findByIdLean(id) {
    return Event.findById(id).lean();
  }

  async find(filter, { sort, skip, limit }) {
    return Event.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(filter) {
    return Event.countDocuments(filter);
  }

  async findByIdAndUpdate(id, updateData) {
    return Event.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('organizer', 'first_name last_name email');
  }

  async reserveCapacity(id, quantity) {
    return Event.findOneAndUpdate(
      {
        _id: id,
        status: 'published',
        date: { $gt: new Date() },
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$reservedCapacity', 0] }, quantity] },
            '$capacity',
          ],
        },
      },
      { $inc: { reservedCapacity: quantity } },
      { returnDocument: 'after' }
    ).lean();
  }

  async releaseCapacity(id, quantity) {
    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        $expr: {
          $gte: [{ $ifNull: ['$reservedCapacity', 0] }, quantity],
        },
      },
      { $inc: { reservedCapacity: -quantity } },
      { returnDocument: 'after' }
    );

    if (!event) {
      throw new Error(`No se pudo liberar la capacidad reservada del evento ${id}`);
    }

    return event;
  }

  async findByIdAndUpdateWithCapacityGuard(id, updateData, capacity) {
    return Event.findOneAndUpdate(
      {
        _id: id,
        $expr: {
          $lte: [{ $ifNull: ['$reservedCapacity', 0] }, capacity],
        },
      },
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('organizer', 'first_name last_name email');
  }

  async synchronizeReservedCapacity() {
    await Promise.all([Event.init(), Ticket.init()]);
    const [events, occupiedByEvent] = await Promise.all([
      Event.find({}, '_id').lean(),
      Ticket.aggregate([
        { $match: { status: { $in: ['confirmed', 'pending'] } } },
        { $group: { _id: '$event', total: { $sum: '$quantity' } } },
      ]),
    ]);

    if (events.length === 0) {
      return;
    }

    const occupiedById = new Map(
      occupiedByEvent.map(({ _id, total }) => [_id.toString(), total])
    );

    await Event.bulkWrite(
      events.map(({ _id }) => ({
        updateOne: {
          filter: { _id },
          update: {
            $set: { reservedCapacity: occupiedById.get(_id.toString()) || 0 },
          },
        },
      }))
    );
  }
}

module.exports = new EventsDAO();