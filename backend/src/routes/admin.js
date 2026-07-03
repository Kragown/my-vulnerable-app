const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authRequired, (req, res) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    movies: db.prepare('SELECT COUNT(*) as count FROM movies').get().count,
    reservations: db.prepare('SELECT COUNT(*) as count FROM reservations').get().count,
    revenue: db.prepare('SELECT COALESCE(SUM(total_price), 0) as total FROM reservations').get().total,
    recent_reservations: db.prepare(`
      SELECT r.id, r.total_price, r.status, u.email, m.title
      FROM reservations r
      JOIN users u ON u.id = r.user_id
      JOIN showtimes s ON s.id = r.showtime_id
      JOIN movies m ON m.id = s.movie_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all(),
  };
  res.json(stats);
});

module.exports = router;
