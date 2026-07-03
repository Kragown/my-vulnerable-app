const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('frontend smoke', () => {
  it('contient les pages principales', () => {
    const pages = ['login', 'register', 'movies', 'reservations', 'admin'];
    for (const page of pages) {
      const pagePath = path.join(__dirname, '..', 'app', page, 'page.tsx');
      assert.ok(fs.existsSync(pagePath), `page manquante: ${page}`);
    }
  });

  it('n\'utilise pas dangerouslySetInnerHTML sur login', () => {
    const login = fs.readFileSync(path.join(__dirname, '..', 'app', 'login', 'page.tsx'), 'utf8');
    assert.equal(login.includes('dangerouslySetInnerHTML'), false);
  });
});
