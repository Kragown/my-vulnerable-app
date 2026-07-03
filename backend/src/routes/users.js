const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

router.patch('/me', authRequired, (req, res) => {
  const allowed = ['email', 'bio', 'role', 'password'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
  }
  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.get('/:id', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, role, bio, password FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

module.exports = router;
