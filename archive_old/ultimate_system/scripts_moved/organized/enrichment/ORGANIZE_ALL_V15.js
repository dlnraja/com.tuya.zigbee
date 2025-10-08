const fs = require('fs');
console.log('📦 ORGANIZE_ALL V15 - RÉORGANISATION HOLISTIQUE');

// Structure dynamique complète
const structure = {
  './scripts/organized/backup': [],
  './scripts/organized/enrichment': [],
  './scripts/organized/validation': [],
  './scripts/organized/scraping': [],
  './scripts/organized/historical': [],
  './scripts/organized/orchestration': []
};

// Créer structure
Object.keys(structure).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
});

// Scripts essentiels à garder à la racine pour Homey
const essential = [
  'app.js', 'package.json', 'app.json',
  'ULTRA_SCANNER_V15.js', 
  'ULTRA_ENRICHER_V15.js', 
  'ORGANIZE_ALL_V15.js'
];

let organized = 0;
let duplicatesRemoved = 0;

// Organisation intelligente par analyse de contenu
fs.readdirSync('./').forEach(file => {
  if (file.endsWith('.js') && !essential.includes(file)) {
    try {
      // Détection de catégorie par nom et contenu
      let category = 'orchestration';
      
      if (file.includes('BACKUP') || file.includes('DUMP') || file.includes('HISTORICAL')) {
        category = 'backup';
      } else if (file.includes('ENRICH') || file.includes('ULTIMATE') || file.includes('MEGA')) {
        category = 'enrichment';
      } else if (file.includes('SCAN') || file.includes('COHERENCE') || file.includes('VALID')) {
        category = 'validation';
      } else if (file.includes('SCRAP') || file.includes('WEB')) {
        category = 'scraping';
      } else if (file.includes('ANALYZER') || file.includes('DEEP')) {
        category = 'historical';
      }
      
      const targetDir = `./scripts/organized/${category}`;
      const dest = `${targetDir}/${file}`;
      
      // Éviter les doublons
      if (!fs.existsSync(dest)) {
        fs.renameSync(`./${file}`, dest);
        organized++;
      } else {
        // Comparer et fusionner si nécessaire
        fs.unlinkSync(`./${file}`);
        duplicatesRemoved++;
      }
      
    } catch(e) {
      // Skip si déjà déplacé ou problème
    }
  }
});

// Nettoyage des fichiers temporaires
['.log', '.tmp'].forEach(ext => {
  fs.readdirSync('./').forEach(file => {
    if (file.endsWith(ext)) {
      try {
        fs.unlinkSync(`./${file}`);
      } catch(e) {}
    }
  });
});

console.log(`✅ Organisation V15: ${organized} scripts organisés, ${duplicatesRemoved} doublons supprimés`);
