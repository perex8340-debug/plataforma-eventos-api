const User = require('../models/User');

class UsersDAO {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findAll() {
    return User.find({});
  }

  async findById(id) {
    return User.findById(id);
  }

  async create(userData) {
    return User.create(userData);
  }
}

module.exports = new UsersDAO();
