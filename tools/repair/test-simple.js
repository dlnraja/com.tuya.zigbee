#!/usr/bin/env node

console.log('🧠 TEST SIMPLE - DIAGNOSTIC');
console.log('=============================');
console.log('Test 1: Console.log basique');
console.log('Test 2: Date actuelle:', new Date().toISOString());
console.log('Test 3: Processus Node.js:', process.version);
console.log('Test 4: Répertoire actuel:', process.cwd());

// Test simple de lecture de fichier
const fs = require('fs');
const path = require('path');

try {
  const driversPath = path.join(__dirname, '../..', 'drivers');
  console.log('Test 5: Chemin drivers:', driversPath);
  
  if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath);
    console.log('Test 6: Nombre de drivers trouvés:', drivers.length);
    console.log('Test 7: Premiers 5 drivers:', drivers.slice(0, 5));
  } else {
    console.log('Test 6: Dossier drivers non trouvé');
  }
} catch (error) {
  console.log('Test 6: Erreur:', error.message);
}

console.log('🎉 TEST TERMINÉ AVEC SUCCÈS !');
