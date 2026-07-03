const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { getTicketPrice } = require('../utils/pricing');

const router = express.Router();

function getReservationDetails(id) {
  const reservation = db.prepare(`
    SELECT r.*, u.email as user_email, s.starts_at, m.title as movie_title, rm.name as room_name
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    JOIN showtimes s ON s.id = r.showtime_id
    JOIN movies m ON m.id = s.movie_id
    JOIN rooms rm ON rm.id = s.room_id
    WHERE r.id = ?
  `).get(id);

  if (!reservation) return null;

  const seats = db.prepare(`
    SELECT rs.ticket_type, rs.price, se.row_label, se.seat_number
    FROM reservation_seats rs
    JOIN seats se ON se.id = rs.seat_id
    WHERE rs.reservation_id = ?
  `).all(id);

  return { ...reservation, seats };
}

router.get('/', authRequired, (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, m.title as movie_title, s.starts_at
    FROM reservations r
    JOIN showtimes s ON s.id = r.showtime_id
    JOIN movies m ON m.id = s.movie_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json(reservations);
});

router.get('/:id', authRequired, (req, res) => {
  const reservation = getReservationDetails(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
  res.json(reservation);
});

router.post('/', authRequired, (req, res) => {
  const { showtime_id, seats, total_price, status, user_id } = req.body;
  if (!showtime_id || !seats || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'showtime_id et seats requis' });
  }

  const showtime = db.prepare('SELECT * FROM showtimes WHERE id = ?').get(showtime_id);
  if (!showtime) return res.status(404).json({ error: 'Séance introuvable' });

  const ownerId = user_id || req.user.id;
  let computedTotal = 0;
  for (const s of seats) {
    computedTotal += getTicketPrice(s.ticket_type);
  }
  const finalPrice = total_price !== undefined ? total_price : computedTotal;
  const finalStatus = status || 'confirmed';

  const insertRes = db.prepare(
    'INSERT INTO reservations (user_id, showtime_id, total_price, status) VALUES (?, ?, ?, ?)'
  );
  const insertSeat = db.prepare(
    'INSERT INTO reservation_seats (reservation_id, seat_id, ticket_type, price) VALUES (?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    for (const s of seats) {
      const occupied = db.prepare(`
        SELECT rs.id FROM reservation_seats rs
        JOIN reservations r ON r.id = rs.reservation_id
        WHERE rs.seat_id = ? AND r.showtime_id = ?
      `).get(s.seat_id, showtime_id);
      if (occupied) {
        throw new Error(`Place ${s.seat_id} déjà réservée`);
      }
    }

    const result = insertRes.run(ownerId, showtime_id, finalPrice, finalStatus);
    const reservationId = result.lastInsertRowid;
    for (const s of seats) {
      const price = getTicketPrice(s.ticket_type);
      insertSeat.run(reservationId, s.seat_id, s.ticket_type, price);
    }
    return reservationId;
  });

  try {
    const reservationId = transaction();
    const reservation = getReservationDetails(reservationId);
    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authRequired, (req, res) => {
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
  db.prepare('DELETE FROM reservation_seats WHERE reservation_id = ?').run(req.params.id);
  db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Réservation annulée' });
});

module.exports = router;
