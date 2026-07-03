process.env.JWT_SECRET = 'test-secret-minimum-32-characters-long!!';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:3000';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { seed } = require('../src/db/seed');
const { createApp } = require('../src/app');

const app = createApp();

before(() => {
  seed();
});

async function login(email) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password' });
  return res.body.token;
}

describe('API sécurisée', () => {
  it('GET /api/health retourne ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('GET /api/debug/config est supprimé', async () => {
    const res = await request(app).get('/api/debug/config');
    assert.equal(res.status, 404);
  });

  it('bloque l\'accès IDOR aux réservations', async () => {
    const userToken = await login('user@demo.local');
    const adminToken = await login('admin@demo.local');

    const adminReservations = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`);
    const targetId = adminReservations.body[0]?.id;
    assert.ok(targetId);

    const res = await request(app)
      .get(`/api/reservations/${targetId}`)
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 403);
  });

  it('bloque l\'accès admin pour un utilisateur standard', async () => {
    const userToken = await login('user@demo.local');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 403);
  });

  it('autorise l\'accès admin pour un administrateur', async () => {
    const adminToken = await login('admin@demo.local');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.users >= 2);
  });

  it('utilise des requêtes paramétrées pour la recherche', async () => {
    const res = await request(app).get("/api/movies/search?q=' OR 1=1 --");
    assert.equal(res.status, 200);
    const leaked = res.body.movies?.some((m) => m.title?.includes('@demo'));
    assert.equal(leaked, false);
  });

  it('retourne une erreur générique à la connexion', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '<script>@x.com', password: 'wrong' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Identifiants invalides');
    assert.equal(res.body.reflected, undefined);
  });
});
