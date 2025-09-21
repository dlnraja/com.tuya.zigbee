const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE FUSION - Archivage Doublons');

// Scripts à garder (essentiels)
const keep = [
  'MASTER-FUSION.js',
  'ai-generator.js', 
  'final-check.js',
  'publish-direct.js'
];

// Archiver les autres
const scriptsDir = 'scripts';
const archiveDir = 'scripts/archive-fusion';

fs.readdirSync(scriptsDir).forEach(file => {
  if (file.endsWith('.js') && !keep.includes(file) && !file.includes('archive')) {
    const source = path.join(scriptsDir, file);
    const dest = path.join(archiveDir, file);
    
    try {
      fs.copyFileSync(source, dest);
      fs.unlinkSync(source);
      console.log(`📦 Archivé: ${file}`);
    } catch(e) {
      console.log(`⚠️ Erreur: ${file}`);
    }
  }
});

console.log('✅ Nettoyage terminé - Scripts fusionnés');
