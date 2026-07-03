require('dotenv').config();
const { seed } = require('./db/seed');
const { createApp } = require('./app');

seed();

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API cinéma (secure) démarrée sur http://localhost:${PORT}`);
});
