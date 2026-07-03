const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { movieId } = req.query;
  if (!movieId) {
    return res.status(400).json({ error: 'movieId requis' });
  }
  const reviews = db.prepare(`
    SELECT r.*, u.email as author_email
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.movie_id = ?
    ORDER BY r.created_at DESC
  `).all(movieId);
  res.json(reviews);
});

router.post('/', authRequired, (req, res) => {
  const { movie_id, content } = req.body;
  if (!movie_id || !content) {
    return res.status(400).json({ error: 'movie_id et content requis' });
  }
  const result = db.prepare(
    'INSERT INTO reviews (user_id, movie_id, content) VALUES (?, ?, ?)'
  ).run(req.user.id, movie_id, content);
  const review = db.prepare(`
    SELECT r.*, u.email as author_email
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(review);
});

module.exports = router;
