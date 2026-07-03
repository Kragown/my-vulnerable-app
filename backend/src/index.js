require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { seed } = require('./db/seed');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const movieRoutes = require('./routes/movies');
const showtimeRoutes = require('./routes/showtimes');
const reservationRoutes = require('./routes/reservations');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');

seed();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
});

app.listen(PORT, () => {
  console.log(`API cinéma démarrée sur http://localhost:${PORT}`);
});
