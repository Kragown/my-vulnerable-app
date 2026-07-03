const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const showtimes = db.prepare(`
    SELECT s.*, m.title as movie_title, m.duration, r.name as room_name
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    JOIN rooms r ON r.id = s.room_id
    ORDER BY s.starts_at
  `).all();
  res.json(showtimes);
});

router.get('/:id', (req, res) => {
  const showtime = db.prepare(`
    SELECT s.*, m.title as movie_title, m.synopsis, m.duration, r.name as room_name, r.rows, r.cols
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    JOIN rooms r ON r.id = s.room_id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!showtime) return res.status(404).json({ error: 'Séance introuvable' });
  res.json(showtime);
});

router.get('/:id/seats', (req, res) => {
  const showtime = db.prepare('SELECT * FROM showtimes WHERE id = ?').get(req.params.id);
  if (!showtime) return res.status(404).json({ error: 'Séance introuvable' });

  const seats = db.prepare(`
    SELECT se.id, se.row_label, se.seat_number,
      CASE WHEN rs.id IS NOT NULL THEN 1 ELSE 0 END as occupied
    FROM seats se
    LEFT JOIN reservation_seats rs ON rs.seat_id = se.id
    LEFT JOIN reservations r ON r.id = rs.reservation_id AND r.showtime_id = ?
    WHERE se.room_id = ?
    ORDER BY se.row_label, se.seat_number
  `).all(req.params.id, showtime.room_id);

  res.json({ showtime_id: showtime.id, seats });
});

router.post('/', authRequired, adminRequired, (req, res) => {
  const { movie_id, room_id, starts_at } = req.body;
  const result = db.prepare(
    'INSERT INTO showtimes (movie_id, room_id, starts_at) VALUES (?, ?, ?)'
  ).run(movie_id, room_id, starts_at);
  const showtime = db.prepare('SELECT * FROM showtimes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(showtime);
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM showtimes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Séance introuvable' });
  db.prepare('DELETE FROM showtimes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Séance supprimée' });
});

module.exports = router;
