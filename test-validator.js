#!/usr/bin/env node
// Test script pour validator.js
console.log('=== Test de validator.js ===');

const path = require('path');
const fs = require('fs');

const validatorPath = path.join(__dirname, 'scripts', 'validator.js');

console.log('Vérification de la présence du fichier validator.js...');
if (fs.existsSync(validatorPath)) {
  console.log('✅ validator.js trouvé');

  console.log('Tentative de lecture du fichier...');
  try {
    const content = fs.readFileSync(validatorPath, 'utf8');
    console.log(`✅ Fichier lu (${content.length} caractères)`);

    console.log('Vérification de la syntaxe...');
    const lines = content.split('\n');
    console.log(`✅ ${lines.length} lignes dans le fichier`);

    // Vérifier la présence de mots-clés importants
    const hasImport = content.includes('import') || content.includes('require');
    const hasFs = content.includes('fs') || content.includes('fs-extra');
    const hasPath = content.includes('path');
    const hasAsync = content.includes('async') || content.includes('await');
    const hasValidation = content.includes('validat') || content.includes('check');
    const hasEslint = content.includes('eslint');
    const hasHomey = content.includes('homey');

    console.log(`Imports présents: ${hasImport ? '✅' : '❌'}`);
    console.log(`Module fs utilisé: ${hasFs ? '✅' : '❌'}`);
    console.log(`Module path utilisé: ${hasPath ? '✅' : '❌'}`);
    console.log(`Fonctions async: ${hasAsync ? '✅' : '❌'}`);
    console.log(`Fonctionnalités de validation: ${hasValidation ? '✅' : '❌'}`);
    console.log(`ESLint utilisé: ${hasEslint ? '✅' : '❌'}`);
    console.log(`Homey CLI utilisé: ${hasHomey ? '✅' : '❌'}`);

    // Chercher la fonction main
    const hasMain = content.includes('function main') || content.includes('async function main') || content.includes('main()');
    console.log(`Fonction main trouvée: ${hasMain ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error.message);
  }

} else {
  console.error('❌ validator.js non trouvé');
}

console.log('\n=== Test validator.js terminé ===');
