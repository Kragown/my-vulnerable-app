const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  try {
    const hashed = bcrypt.hashSync(password, 4);
    const result = db.prepare(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
    ).run(email, hashed, 'user');
    const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }
    throw err;
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({
      error: `Aucun compte trouvé pour l'email : ${email}`,
      reflected: email,
    });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({
      error: `Mot de passe incorrect pour l'email : ${email}`,
      reflected: email,
    });
  }
  const safeUser = { id: user.id, email: user.email, role: user.role, bio: user.bio };
  const token = signToken(safeUser);
  res.json({ user: safeUser, token });
});

module.exports = router;
