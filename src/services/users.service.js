const usersRepository = require('../repositories/users.repository');
const { userDTO } = require('../dto/user.dto');

class UsersService {
  // Ruta administrativa: listado de usuarios solo admin.
  // La serialización pasa por DTO para nunca exponer password.
  async listUsers() {
    const users = await usersRepository.listUsers();
    return users.map(userDTO);
  }
}

module.exports = new UsersService();
