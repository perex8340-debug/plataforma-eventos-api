const usersRepository = require('../repositories/users.repository');
const { userDTO } = require('../dto/user.dto');
const { HttpError } = require('../utils/errors');
const { createHash, isValidPassword } = require('../utils/hash');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const normalizeEmail = (email) => email.trim().toLowerCase();

class SessionsService {
  async registerUser(input = {}) {
    const { first_name, last_name, email, password } =
      input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    if (
      typeof first_name !== 'string' ||
      typeof last_name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !first_name.trim() ||
      !last_name.trim() ||
      !email.trim() ||
      !password
    ) {
      throw new HttpError(400, 'Faltan campos obligatorios');
    }

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new HttpError(400, 'El email no tiene un formato válido');
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
    }

    const existingUser = await usersRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new HttpError(409, 'El email ya está registrado');
    }

    return usersRepository.createUser({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: normalizedEmail,
      password: createHash(password),
    });
  }

  async authenticate(email, password) {
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new HttpError(400, 'Faltan credenciales');
    }

    const user = await usersRepository.findByEmail(normalizeEmail(email));
    if (!user || !isValidPassword(password, user.password)) {
      throw new HttpError(401, 'Credenciales inválidas');
    }

    return user;
  }

  async getPublicUser(id) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new HttpError(401, 'No autenticado');
    }

    return userDTO(user);
  }
}

module.exports = new SessionsService();
