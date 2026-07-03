const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const movies = db.prepare(
    'SELECT id, title, synopsis, duration, poster_url FROM movies ORDER BY title'
  ).all();
  res.json(movies);
});

router.get('/search', (req, res, next) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (!q) {
    return res.json({ movies: [] });
  }
  try {
    const pattern = `%${q}%`;
    const movies = db.prepare(
      'SELECT id, title, synopsis, duration, poster_url FROM movies WHERE title LIKE ? OR synopsis LIKE ? ORDER BY title'
    ).all(pattern, pattern);
    res.json({ movies });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res) => {
  const movie = db.prepare(
    'SELECT id, title, synopsis, duration, poster_url FROM movies WHERE id = ?'
  ).get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Film introuvable' });
  res.json(movie);
});

router.post('/', authRequired, adminRequired, (req, res, next) => {
  const { title, synopsis, duration, poster_url } = req.body;
  if (!title || !duration) {
    return res.status(400).json({ error: 'Titre et durée requis' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO movies (title, synopsis, duration, poster_url) VALUES (?, ?, ?, ?)'
    ).run(title, synopsis || '', Number(duration), poster_url || null);
    const movie = db.prepare(
      'SELECT id, title, synopsis, duration, poster_url FROM movies WHERE id = ?'
    ).get(result.lastInsertRowid);
    res.status(201).json(movie);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authRequired, adminRequired, (req, res, next) => {
  const { title, synopsis, duration, poster_url } = req.body;
  const existing = db.prepare('SELECT id FROM movies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Film introuvable' });
  try {
    db.prepare(
      'UPDATE movies SET title = ?, synopsis = ?, duration = ?, poster_url = ? WHERE id = ?'
    ).run(title, synopsis, Number(duration), poster_url, req.params.id);
    const movie = db.prepare(
      'SELECT id, title, synopsis, duration, poster_url FROM movies WHERE id = ?'
    ).get(req.params.id);
    res.json(movie);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const existing = db.prepare('SELECT id FROM movies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Film introuvable' });
  db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
  res.json({ message: 'Film supprimé' });
});

module.exports = router;
