#!/usr/bin/env node

/**
 * 📊 COVERAGE RUNNER
 * Script pour exécuter les tests avec couverture
 */

const { execSync } = require('child_process');

console.log('📊 DÉMARRAGE TESTS AVEC COUVERTURE');

try {
  // Exécuter les tests avec couverture
  execSync('nyc mocha test/**/*.test.js', { stdio: 'inherit' });
  
  console.log('✅ TESTS AVEC COUVERTURE RÉUSSIS');
  
  // Générer le rapport HTML
  execSync('nyc report --reporter=html', { stdio: 'inherit' });
  
  console.log('📊 Rapport HTML généré dans coverage/');
  
} catch (error) {
  console.error('❌ ERREUR:', error.message);
  process.exit(1);
}