const assert = require('assert');

describe('Test de base', () => {
  it('devrait passer un test simple', () => {
    assert.strictEqual(1 + 1, 2);
  });

  it('devrait vérifier la configuration du projet', () => {
    const config = require('../app.json');
    assert.ok(config.name, 'Le nom de l\'application doit être défini');
    assert.ok(config.version, 'La version doit être définie');
  });
});
