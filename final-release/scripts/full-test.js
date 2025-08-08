#!/usr/bin/env node

/**
 * 🧪 FULL TEST SUITE
 * Suite de tests complète
 */

const { execSync } = require('child_process');

console.log('🧪 DÉMARRAGE SUITE DE TESTS COMPLÈTE');

try {
  // Tests unitaires
  console.log('📋 Tests unitaires...');
  execSync('npm test', { stdio: 'inherit' });
  
  // Tests avec couverture
  console.log('📊 Tests avec couverture...');
  execSync('npm run test:coverage', { stdio: 'inherit' });
  
  // Tests d'intégration
  console.log('🔗 Tests d'intégration...');
  execSync('node test/integration.test.js', { stdio: 'inherit' });
  
  // Validation
  console.log('✅ Validation...');
  execSync('node scripts/check-integrity.js', { stdio: 'inherit' });
  
  console.log('✅ SUITE DE TESTS COMPLÈTE RÉUSSIE');
  
} catch (error) {
  console.error('❌ ERREUR:', error.message);
  process.exit(1);
}