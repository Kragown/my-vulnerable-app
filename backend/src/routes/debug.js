const express = require('express');
const path = require('path');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV || 'development',
    jwt_secret: JWT_SECRET,
    jwt_expires_in: JWT_EXPIRES_IN,
    db_path: path.join(__dirname, '../../data/cinema.db'),
    port: process.env.PORT || 3001,
    debug: true,
  });
});

module.exports = router;
