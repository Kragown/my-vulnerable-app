const { describe, it } = require('node:test');
const assert = require('node:assert');
const { escapeHtml, sanitizeText } = require('../src/utils/sanitize');
const {
  isValidEmail,
  isValidPassword,
  isValidTicketType,
  pickAllowed,
} = require('../src/utils/validate');

describe('sanitize', () => {
  it('échappe les balises HTML', () => {
    assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('tronque et nettoie le texte', () => {
    assert.equal(sanitizeText('  hello  '), 'hello');
    assert.equal(sanitizeText('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('validate', () => {
  it('valide les emails', () => {
    assert.equal(isValidEmail('user@demo.local'), true);
    assert.equal(isValidEmail('invalid'), false);
  });

  it('valide les mots de passe', () => {
    assert.equal(isValidPassword('password'), true);
    assert.equal(isValidPassword('short'), false);
  });

  it('valide les tarifs', () => {
    assert.equal(isValidTicketType('adulte'), true);
    assert.equal(isValidTicketType('vip'), false);
  });

  it('filtre les champs autorisés', () => {
    const result = pickAllowed({ email: 'a@b.c', role: 'admin', bio: 'x' }, ['email', 'bio']);
    assert.deepEqual(result, { email: 'a@b.c', bio: 'x' });
  });
});
