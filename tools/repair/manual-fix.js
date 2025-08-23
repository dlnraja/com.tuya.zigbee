#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION MANUELLE');
console.log('=======================');

// Configuration des chemins
const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

console.log('📁 Répertoire projet:', projectRoot);
console.log('📁 Répertoire drivers:', driversPath);

// Vérifier si le dossier drivers existe
if (!fs.existsSync(driversPath)) {
  console.log('❌ Dossier drivers non trouvé');
  process.exit(1);
}

// Lister tous les dossiers de drivers
const driverDirs = fs.readdirSync(driversPath).filter(dir => {
  return fs.statSync(path.join(driversPath, dir)).isDirectory();
});

console.log(`📊 Trouvé ${driverDirs.length} dossiers de drivers`);

// Afficher la liste des drivers
driverDirs.forEach((dir, index) => {
  console.log(`   ${index + 1}. ${dir}`);
});

console.log('\n🎉 Script de diagnostic terminé !');
