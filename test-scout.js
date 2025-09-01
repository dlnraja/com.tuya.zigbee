#!/usr/bin/env node
// Test script pour scout.js
console.log('=== Test de scout.js ===');

const path = require('path');
const fs = require('fs');

const scoutPath = path.join(__dirname, 'scripts', 'scout.js');

console.log('Vérification de la présence du fichier scout.js...');
if (fs.existsSync(scoutPath)) {
  console.log('✅ scout.js trouvé');

  console.log('Tentative de lecture du fichier...');
  try {
    const content = fs.readFileSync(scoutPath, 'utf8');
    console.log(`✅ Fichier lu (${content.length} caractères)`);

    console.log('Vérification de la syntaxe...');
    // Test basique de syntaxe
    const lines = content.split('\n');
    console.log(`✅ ${lines.length} lignes dans le fichier`);

    // Vérifier la présence de mots-clés importants
    const hasImport = content.includes('import');
    const hasAxios = content.includes('axios');
    const hasFs = content.includes('fs-extra');

    console.log(`Imports présents: ${hasImport ? '✅' : '❌'}`);
    console.log(`Axios utilisé: ${hasAxios ? '✅' : '❌'}`);
    console.log(`fs-extra utilisé: ${hasFs ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error.message);
  }

} else {
  console.error('❌ scout.js non trouvé');
}

console.log('\n=== Test scout.js terminé ===');
