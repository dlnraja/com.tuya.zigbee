// !/usr/bin/env node

/**
 * Script de validation sécurisée Homey (version JavaScript)
 * Version JavaScript du script JavaScript safe-validation.js
 */

const { execSync } = require('child_process');

console.log('🔍 Validation sécurisée de l\'app Homey...');

try {
  console.log('📋 Exécution de la validation...');
  const result = execSync('npx homey app validate --path .', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Validation réussie !');
  console.log('📊 Résultat:');
  console.log(result);
  
} catch (error) {
  console.error('❌ Validation échouée:');
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.log('STDERR:', error.stderr);
  process.exit(1);
}

console.log('🎯 Validation terminée avec succès !');
