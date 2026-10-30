// DTO de Usuario.
// Controla qué campos del documento User salen en las respuestas.
// Nunca expone `password` ni su hash.

const userSummaryDTO = (user) => ({
  id: user._id.toString(),
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
});

// Usuario autenticado (register, /current, listado admin)
const userDTO = (user) => ({
  ...userSummaryDTO(user),
  role: user.role,
});

module.exports = { userDTO, userSummaryDTO };