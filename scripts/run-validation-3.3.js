// !/usr/bin/env node

/**
 * Exécution de la validation finale de la migration 3.3
 */

console.log('🚀 Lancement de la validation finale de la migration 3.3...');

// Importer et exécuter la validation
const { validateMigration33 } = require('./validate-migration-3.3.js');

validateMigration33()
  .then(() => {
    console.log('🎉 Validation terminée avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la validation:', error.message);
    process.exit(1);
  });
