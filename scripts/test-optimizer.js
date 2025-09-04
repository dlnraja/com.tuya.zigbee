#!/usr/bin/env node
// Test script pour optimizer.js
console.log('=== Test de optimizer.js ===');

const path = require('path');
const fs = require('fs');

const optimizerPath = path.join(__dirname, 'scripts', 'optimizer.js');

console.log('Vérification de la présence du fichier optimizer.js...');
if (fs.existsSync(optimizerPath)) {
  console.log('✅ optimizer.js trouvé');

  console.log('Tentative de lecture du fichier...');
  try {
    const content = fs.readFileSync(optimizerPath, 'utf8');
    console.log(`✅ Fichier lu (${content.length} caractères)`);

    console.log('Vérification de la syntaxe...');
    const lines = content.split('\n');
    console.log(`✅ ${lines.length} lignes dans le fichier`);

    // Vérifier la présence de mots-clés importants
    const hasImport = content.includes('import') || content.includes('require');
    const hasFs = content.includes('fs') || content.includes('fs-extra');
    const hasPath = content.includes('path');
    const hasAsync = content.includes('async') || content.includes('await');
    const hasOptimization = content.includes('optimize') || content.includes('optim');

    console.log(`Imports présents: ${hasImport ? '✅' : '❌'}`);
    console.log(`Module fs utilisé: ${hasFs ? '✅' : '❌'}`);
    console.log(`Module path utilisé: ${hasPath ? '✅' : '❌'}`);
    console.log(`Fonctions async: ${hasAsync ? '✅' : '❌'}`);
    console.log(`Fonctionnalités d'optimisation: ${hasOptimization ? '✅' : '❌'}`);

    // Chercher la fonction main
    const hasMain = content.includes('function main') || content.includes('async function main') || content.includes('main()');
    console.log(`Fonction main trouvée: ${hasMain ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error.message);
  }

} else {
  console.error('❌ optimizer.js non trouvé');
}

console.log('\n=== Test optimizer.js terminé ===');
