const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('ERREUR: JWT_SECRET doit être défini dans .env et faire au moins 32 caractères.');
  process.exit(1);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  next();
}

function ownerOrAdmin(ownerId, req, res, next) {
  if (req.user.role === 'admin' || req.user.id === ownerId) {
    return next();
  }
  return res.status(403).json({ error: 'Accès refusé' });
}

module.exports = {
  signToken,
  authRequired,
  adminRequired,
  ownerOrAdmin,
};
