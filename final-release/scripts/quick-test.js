#!/usr/bin/env node

/**
 * ⚡ QUICK TEST
 * Test rapide pour validation
 */

const { execSync } = require('child_process');

console.log('⚡ DÉMARRAGE TEST RAPIDE');

try {
  // Test de base
  execSync('npm test', { stdio: 'inherit' });
  
  // Test d'intégrité
  execSync('node scripts/check-integrity.js', { stdio: 'inherit' });
  
  console.log('✅ TEST RAPIDE RÉUSSI');
  
} catch (error) {
  console.error('❌ ERREUR:', error.message);
  process.exit(1);
}