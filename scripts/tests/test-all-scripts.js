#!/usr/bin/env node
// Script de test complet pour tous les scripts JS principaux
console.log('=== Test complet de tous les scripts JS ===');
console.log('Date:', new Date().toISOString());
console.log('');

const path = require('path');
const fs = require('fs');

const scripts = ['scout', 'architect', 'optimizer', 'validator'];
const results = {};

// Fonction pour tester un script
function testScript(scriptName) {
  console.log(`\n--- Test de ${scriptName}.js ---`);
  const scriptPath = path.join(__dirname, 'scripts', `${scriptName}.js`);
  const result = {
    name: scriptName,
    exists: false,
    readable: false,
    lines: 0,
    hasImports: false,
    hasAsync: false,
    hasMain: false,
    size: 0,
    errors: []
  };

  try {
    // Vérifier la présence
    if (fs.existsSync(scriptPath)) {
      result.exists = true;
      console.log('✅ Fichier présent');

      // Tester la lecture
      const content = fs.readFileSync(scriptPath, 'utf8');
      result.readable = true;
      result.size = content.length;
      console.log(`✅ Fichier lisible (${content.length} caractères)`);

      // Analyser le contenu
      const lines = content.split('\n');
      result.lines = lines.length;
      console.log(`✅ ${lines.length} lignes`);

      // Vérifications spécifiques
      result.hasImports = content.includes('import') || content.includes('require');
      result.hasAsync = content.includes('async') || content.includes('await');
      result.hasMain = content.includes('function main') || content.includes('async function main') || content.includes('main()');

      console.log(`Imports: ${result.hasImports ? '✅' : '❌'}`);
      console.log(`Async/Await: ${result.hasAsync ? '✅' : '❌'}`);
      console.log(`Fonction main: ${result.hasMain ? '✅' : '❌'}`);

    } else {
      console.log('❌ Fichier non trouvé');
      result.errors.push('Fichier non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    result.errors.push(error.message);
  }

  results[scriptName] = result;
  return result;
}

// Tester tous les scripts
scripts.forEach(scriptName => {
  testScript(scriptName);
});

// Générer le rapport final
console.log('\n=== RAPPORT FINAL ===');
console.log('Résumé des tests:');

let totalScripts = scripts.length;
let existingScripts = 0;
let readableScripts = 0;
let scriptsWithImports = 0;
let scriptsWithAsync = 0;
let scriptsWithMain = 0;

Object.values(results).forEach(result => {
  if (result.exists) existingScripts++;
  if (result.readable) readableScripts++;
  if (result.hasImports) scriptsWithImports++;
  if (result.hasAsync) scriptsWithAsync++;
  if (result.hasMain) scriptsWithMain++;
});

console.log(`📊 Scripts totaux: ${totalScripts}`);
console.log(`📁 Scripts présents: ${existingScripts}/${totalScripts}`);
console.log(`📖 Scripts lisibles: ${readableScripts}/${totalScripts}`);
console.log(`📦 Scripts avec imports: ${scriptsWithImports}/${totalScripts}`);
console.log(`⚡ Scripts avec async: ${scriptsWithAsync}/${totalScripts}`);
console.log(`🎯 Scripts avec fonction main: ${scriptsWithMain}/${totalScripts}`);

console.log('\n=== DÉTAILS PAR SCRIPT ===');
Object.values(results).forEach(result => {
  console.log(`\n${result.name.toUpperCase()}:`);
  console.log(`  - Présent: ${result.exists ? '✅' : '❌'}`);
  console.log(`  - Lisible: ${result.readable ? '✅' : '❌'}`);
  console.log(`  - Taille: ${result.size} caractères`);
  console.log(`  - Lignes: ${result.lines}`);
  console.log(`  - Imports: ${result.hasImports ? '✅' : '❌'}`);
  console.log(`  - Async: ${result.hasAsync ? '✅' : '❌'}`);
  console.log(`  - Main: ${result.hasMain ? '✅' : '❌'}`);
  if (result.errors.length > 0) {
    console.log(`  - Erreurs: ${result.errors.join(', ')}`);
  }
});

// Sauvegarder le rapport
const reportPath = path.join(__dirname, 'test-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    total: totalScripts,
    existing: existingScripts,
    readable: readableScripts,
    withImports: scriptsWithImports,
    withAsync: scriptsWithAsync,
    withMain: scriptsWithMain
  },
  details: results
}, null, 2));

console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);

if (existingScripts === totalScripts && readableScripts === totalScripts) {
  console.log('\n🎉 Tous les scripts sont présents et lisibles!');
} else {
  console.log('\n⚠️  Certains scripts ont des problèmes à résoudre.');
}

console.log('\n=== Test complet terminé ===');
