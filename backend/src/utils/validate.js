const BCRYPT_ROUNDS = 12;
const VALID_TICKET_TYPES = ['enfant', 'etudiant', 'adulte'];

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function isValidTicketType(type) {
  return VALID_TICKET_TYPES.includes(type);
}

function pickAllowed(body, allowed) {
  const result = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
}

module.exports = {
  BCRYPT_ROUNDS,
  VALID_TICKET_TYPES,
  isValidEmail,
  isValidPassword,
  isValidTicketType,
  pickAllowed,
};
