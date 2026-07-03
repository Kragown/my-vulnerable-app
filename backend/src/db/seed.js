const db = require('./index');
const bcrypt = require('bcryptjs');

const TICKET_PRICES = {
  enfant: 6,
  etudiant: 8,
  adulte: 12,
};

function clearData() {
  db.exec(`
    DELETE FROM reservation_seats;
    DELETE FROM reservations;
    DELETE FROM reviews;
    DELETE FROM showtimes;
    DELETE FROM seats;
    DELETE FROM rooms;
    DELETE FROM movies;
    DELETE FROM users;
  `);
}

function createSeatsForRoom(roomId, rows, cols) {
  const insert = db.prepare(
    'INSERT INTO seats (room_id, row_label, seat_number) VALUES (?, ?, ?)'
  );
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      insert.run(roomId, rowLabels[r], c);
    }
  }
}

function seed() {
  clearData();

  const insertUser = db.prepare(
    'INSERT INTO users (email, password, role, bio) VALUES (?, ?, ?, ?)'
  );
  const hashedPassword = bcrypt.hashSync('password', 4);
  insertUser.run('user@demo.local', hashedPassword, 'user', 'Amateur de science-fiction.');
  insertUser.run('admin@demo.local', hashedPassword, 'admin', 'Administrateur du cinéma.');

  const insertMovie = db.prepare(
    'INSERT INTO movies (title, synopsis, duration, poster_url) VALUES (?, ?, ?, ?)'
  );
  const movie1 = insertMovie.run(
    'Nebula Rising',
    'Une équipage interstellaire découvre une anomalie qui menace la galaxie.',
    128,
    '/posters/nebula.jpg'
  );
  const movie2 = insertMovie.run(
    'Midnight in Paris',
    'Un réalisateur nostalgique erre dans un Paris d\'un autre temps.',
    102,
    '/posters/midnight.jpg'
  );
  const movie3 = insertMovie.run(
    'The Last Heist',
    'Un braquage impossible réunit d\'anciens rivaux pour un dernier coup.',
    115,
    '/posters/heist.jpg'
  );

  const insertRoom = db.prepare(
    'INSERT INTO rooms (name, rows, cols) VALUES (?, ?, ?)'
  );
  const room1 = insertRoom.run('Salle 1', 6, 8);
  const room2 = insertRoom.run('Salle 2', 5, 10);
  const room1Id = room1.lastInsertRowid;
  const room2Id = room2.lastInsertRowid;

  createSeatsForRoom(room1Id, 6, 8);
  createSeatsForRoom(room2Id, 5, 10);

  const insertShowtime = db.prepare(
    'INSERT INTO showtimes (movie_id, room_id, starts_at) VALUES (?, ?, ?)'
  );
  const now = new Date();
  const showtimeIds = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    date.setHours(14, 0, 0, 0);
    showtimeIds.push(insertShowtime.run(movie1.lastInsertRowid, room1Id, date.toISOString()).lastInsertRowid);
    date.setHours(18, 30, 0, 0);
    showtimeIds.push(insertShowtime.run(movie2.lastInsertRowid, room1Id, date.toISOString()).lastInsertRowid);
    date.setHours(21, 0, 0, 0);
    showtimeIds.push(insertShowtime.run(movie3.lastInsertRowid, room2Id, date.toISOString()).lastInsertRowid);
  }

  const user1 = db.prepare('SELECT id FROM users WHERE email = ?').get('user@demo.local');
  const user2 = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.local');

  const insertReservation = db.prepare(
    'INSERT INTO reservations (user_id, showtime_id, total_price, status) VALUES (?, ?, ?, ?)'
  );
  const insertResSeat = db.prepare(
    'INSERT INTO reservation_seats (reservation_id, seat_id, ticket_type, price) VALUES (?, ?, ?, ?)'
  );

  const res1 = insertReservation.run(user1.id, showtimeIds[0], TICKET_PRICES.adulte * 2, 'confirmed');
  const seatsRoom1 = db.prepare('SELECT id FROM seats WHERE room_id = ? LIMIT 2').all(room1Id);
  insertResSeat.run(res1.lastInsertRowid, seatsRoom1[0].id, 'adulte', TICKET_PRICES.adulte);
  insertResSeat.run(res1.lastInsertRowid, seatsRoom1[1].id, 'enfant', TICKET_PRICES.enfant);

  const res2 = insertReservation.run(user2.id, showtimeIds[2], TICKET_PRICES.etudiant, 'confirmed');
  const seatAdmin = db.prepare('SELECT id FROM seats WHERE room_id = ? AND row_label = ? AND seat_number = ?').get(room1Id, 'C', 5);
  insertResSeat.run(res2.lastInsertRowid, seatAdmin.id, 'etudiant', TICKET_PRICES.etudiant);

  const insertReview = db.prepare(
    'INSERT INTO reviews (user_id, movie_id, content) VALUES (?, ?, ?)'
  );
  insertReview.run(user1.id, movie1.lastInsertRowid, 'Visuellement époustouflant, à voir en grand écran !');

  console.log('Base de données initialisée avec succès.');
  console.log('Comptes démo : user@demo.local / password, admin@demo.local / password');
}

if (require.main === module) {
  seed();
}

module.exports = { seed, TICKET_PRICES };
