const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { BCRYPT_ROUNDS, isValidEmail, isValidPassword } = require('../utils/validate');

const router = express.Router();

const GENERIC_AUTH_ERROR = 'Identifiants invalides';

router.post('/register', (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }
  try {
    const hashed = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const result = db.prepare(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
    ).run(email.toLowerCase().trim(), hashed, 'user');
    const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Impossible de créer le compte' });
    }
    next(err);
  }
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: GENERIC_AUTH_ERROR });
  }
  const safeUser = { id: user.id, email: user.email, role: user.role, bio: user.bio };
  const token = signToken(safeUser);
  res.json({ user: safeUser, token });
});

module.exports = router;
