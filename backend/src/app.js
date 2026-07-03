const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const movieRoutes = require('./routes/movies');
const showtimeRoutes = require('./routes/showtimes');
const reservationRoutes = require('./routes/reservations');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.use(helmet({
    contentSecurityPolicy: isProd ? undefined : false,
  }));
  app.use(cors({
    origin: allowedOrigin,
    credentials: true,
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', apiLimiter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/movies', movieRoutes);
  app.use('/api/showtimes', showtimeRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Ressource introuvable' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    if (isProd) {
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
    res.status(500).json({ error: err.message });
  });

  return app;
}

module.exports = { createApp };
