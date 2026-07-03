const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

router.patch('/me', authRequired, (req, res, next) => {
  const { email, bio } = req.body;
  const updates = [];
  const values = [];

  if (email !== undefined) {
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email invalide' });
    }
    updates.push('email = ?');
    values.push(email.toLowerCase().trim());
  }
  if (bio !== undefined) {
    if (typeof bio !== 'string' || bio.length > 500) {
      return res.status(400).json({ error: 'Bio invalide' });
    }
    updates.push('bio = ?');
    values.push(bio.trim());
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucun champ autorisé à mettre à jour' });
  }

  try {
    values.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }
    next(err);
  }
});

router.get('/:id', authRequired, (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

module.exports = router;
