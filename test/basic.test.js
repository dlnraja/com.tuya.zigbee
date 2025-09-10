const assert = require('assert');

console.log('Démarrage des tests...');

describe('Test de base', function() {
  it('devrait passer un test simple', function() {
    console.log('Exécution du test simple');
    assert.strictEqual(1 + 1, 2);
  });
});
