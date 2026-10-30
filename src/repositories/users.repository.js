const usersDAO = require('../dao/users.dao');

class UsersRepository {
  async findByEmail(email) {
    return usersDAO.findByEmail(email);
  }

  async listUsers() {
    return usersDAO.findAll();
  }

  async findById(id) {
    return usersDAO.findById(id);
  }

  async createUser(userData) {
    return usersDAO.create(userData);
  }
}

module.exports = new UsersRepository();
