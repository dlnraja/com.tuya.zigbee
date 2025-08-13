// !/usr/bin/env node

/**
 * Pipeline sécurisée (version JavaScript)
 * Version JavaScript du script JavaScript safe-pipeline.js
 */

const { execSync } = require('child_process');

console.log('🚀 Exécution de la pipeline sécurisée...');

try {
  console.log('📋 Lancement de npm run mega-progressive...');
  const result = execSync('npm run mega-progressive', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Pipeline exécutée avec succès !');
  console.log('📊 Résultat:');
  console.log(result);
  
} catch (error) {
  console.error('❌ Pipeline échouée:');
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.log('STDERR:', error.stderr);
  process.exit(1);
}

console.log('🎯 Pipeline terminée avec succès !');
