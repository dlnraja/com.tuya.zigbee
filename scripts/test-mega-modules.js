#!/usr/bin/env node
'use strict';

/**
 * 🧪 Script de Test des Modules MEGA - Version 3.5.0
 * Test de tous les modules MEGA orchestrator
 */

console.log('🧪 Test des Modules MEGA...\n');

// Test des modules un par un
const modules = [
  'tools/core/preparation.js',
  'tools/core/validator.js',
  'tools/core/matrix-builder.js',
  'tools/core/dashboard-builder.js',
  'tools/core/evidence-collector.js',
  'tools/core/enricher.js',
  'tools/core/web-enricher.js',
  'tools/core/final-validator.js',
  'tools/core/deployer.js',
  'tools/core/script-converter.js',
  'tools/core/script-consolidator.js'
];

let successCount = 0;
let errorCount = 0;

for (const modulePath of modules) {
  try {
    const module = require(`./${modulePath}`);
    console.log(`✅ ${modulePath} - OK`);
    successCount++;
  } catch (error) {
    console.log(`❌ ${modulePath} - ERREUR: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n📊 Résumé: ${successCount}/${modules.length} modules fonctionnels`);
console.log(`✅ Succès: ${successCount}`);
console.log(`❌ Erreurs: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n🎉 Tous les modules MEGA sont fonctionnels !');
} else {
  console.log('\n⚠️ Certains modules ont des problèmes à corriger.');
}
