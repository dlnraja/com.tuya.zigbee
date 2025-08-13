// !/usr/bin/env node

/**
 * Lancement de la migration vers la structure SDK3+ conforme
 */

console.log('🚀 Lancement de la migration vers la structure SDK3+ conforme...');

// Importer et exécuter la migration
const { migrateToSDK3StructureComplete } = require('./migrate-to-sdk3-structure-complete.js');

migrateToSDK3StructureComplete()
  .then(() => {
    console.log('🎉 Migration SDK3+ terminée avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  });
