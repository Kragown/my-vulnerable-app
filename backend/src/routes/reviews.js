const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = express.Router();

router.get('/', (req, res) => {
  const movieId = Number(req.query.movieId);
  if (!movieId) {
    return res.status(400).json({ error: 'movieId requis' });
  }
  const reviews = db.prepare(`
    SELECT r.id, r.content, r.created_at, u.email as author_email
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.movie_id = ?
    ORDER BY r.created_at DESC
  `).all(movieId);
  res.json(reviews);
});

router.post('/', authRequired, (req, res, next) => {
  const movie_id = Number(req.body.movie_id);
  const content = sanitizeText(req.body.content, 1000);
  if (!movie_id || !content) {
    return res.status(400).json({ error: 'movie_id et contenu requis' });
  }
  const movie = db.prepare('SELECT id FROM movies WHERE id = ?').get(movie_id);
  if (!movie) return res.status(404).json({ error: 'Film introuvable' });

  try {
    const result = db.prepare(
      'INSERT INTO reviews (user_id, movie_id, content) VALUES (?, ?, ?)'
    ).run(req.user.id, movie_id, content);
    const review = db.prepare(`
      SELECT r.id, r.content, r.created_at, u.email as author_email
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
