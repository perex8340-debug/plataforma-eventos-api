const usersService = require('../services/users.service');

class UsersController {
  // Ruta administrativa: ver todos los usuarios (solo admin).
  // Devuelve datos sin password (pasa por DTO en el service).
  async listUsers(req, res, next) {
    try {
      const payload = await usersService.listUsers();
      res.status(200).json({ status: 'success', payload });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UsersController();