const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const movies = db.prepare('SELECT * FROM movies ORDER BY title').all();
  res.json(movies);
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const query = `SELECT * FROM movies WHERE title LIKE '%${q}%' OR synopsis LIKE '%${q}%'`;
  try {
    const movies = db.prepare(query).all();
    res.json({ query, movies });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, query });
  }
});

router.get('/:id', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Film introuvable' });
  res.json(movie);
});

router.post('/', authRequired, adminRequired, (req, res) => {
  const { title, synopsis, duration, poster_url } = req.body;
  const result = db.prepare(
    'INSERT INTO movies (title, synopsis, duration, poster_url) VALUES (?, ?, ?, ?)'
  ).run(title, synopsis, duration, poster_url || null);
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(movie);
});

router.put('/:id', authRequired, adminRequired, (req, res) => {
  const { title, synopsis, duration, poster_url } = req.body;
  const existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Film introuvable' });
  db.prepare(
    'UPDATE movies SET title = ?, synopsis = ?, duration = ?, poster_url = ? WHERE id = ?'
  ).run(title, synopsis, duration, poster_url, req.params.id);
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  res.json(movie);
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Film introuvable' });
  db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
  res.json({ message: 'Film supprimé' });
});

module.exports = router;
