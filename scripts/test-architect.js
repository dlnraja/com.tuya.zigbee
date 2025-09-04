#!/usr/bin/env node
// Test script pour architect.js
console.log('=== Test de architect.js ===');

const path = require('path');
const fs = require('fs');

const architectPath = path.join(__dirname, 'scripts', 'architect.js');

console.log('Vérification de la présence du fichier architect.js...');
if (fs.existsSync(architectPath)) {
  console.log('✅ architect.js trouvé');

  console.log('Tentative de lecture du fichier...');
  try {
    const content = fs.readFileSync(architectPath, 'utf8');
    console.log(`✅ Fichier lu (${content.length} caractères)`);

    console.log('Vérification de la syntaxe...');
    const lines = content.split('\n');
    console.log(`✅ ${lines.length} lignes dans le fichier`);

    // Vérifier la présence de mots-clés importants
    const hasImport = content.includes('import') || content.includes('require');
    const hasFs = content.includes('fs') || content.includes('fs-extra');
    const hasPath = content.includes('path');
    const hasAsync = content.includes('async') || content.includes('await');

    console.log(`Imports présents: ${hasImport ? '✅' : '❌'}`);
    console.log(`Module fs utilisé: ${hasFs ? '✅' : '❌'}`);
    console.log(`Module path utilisé: ${hasPath ? '✅' : '❌'}`);
    console.log(`Fonctions async: ${hasAsync ? '✅' : '❌'}`);

    // Chercher la fonction main
    const hasMain = content.includes('function main') || content.includes('async function main') || content.includes('main()');
    console.log(`Fonction main trouvée: ${hasMain ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error.message);
  }

} else {
  console.error('❌ architect.js non trouvé');
}

console.log('\n=== Test architect.js terminé ===');
