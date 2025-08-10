'use strict';

const fs = require('fs');
const path = require('path');

console.log('🚀 Test de réorganisation des drivers...');

// Vérifier la structure actuelle
const driversDir = path.join(process.cwd(), 'drivers');
console.log(`📁 Dossier drivers: ${driversDir}`);

if (!fs.existsSync(driversDir)) {
  console.log('❌ Dossier drivers non trouvé');
  process.exit(1);
}

// Lister les dossiers de premier niveau
const topLevelDirs = fs.readdirSync(driversDir).filter(item => {
  const itemPath = path.join(driversDir, item);
  return fs.statSync(itemPath).isDirectory();
});

console.log(`📊 Dossiers de premier niveau: ${topLevelDirs.length}`);
topLevelDirs.forEach(dir => {
  console.log(`  - ${dir}`);
});

// Vérifier le dossier undefined
const undefinedDir = path.join(driversDir, 'zigbee', 'undefined');
if (fs.existsSync(undefinedDir)) {
  console.log(`⚠️  Dossier undefined trouvé: ${undefinedDir}`);
  const undefinedSubdirs = fs.readdirSync(undefinedDir).filter(item => {
    const itemPath = path.join(undefinedDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
  console.log(`   Sous-dossiers: ${undefinedSubdirs.length}`);
  undefinedSubdirs.slice(0, 5).forEach(subdir => {
    console.log(`     - ${subdir}`);
  });
}

console.log('✅ Test terminé');
