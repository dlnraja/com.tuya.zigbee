const fs = require('fs');
console.log('📦 ORGANIZER V13 - CLEAN STRUCTURE');

// Structure cible
const dirs = [
  './scripts/organized/backup',
  './scripts/organized/enrichment', 
  './scripts/organized/validation',
  './scripts/organized/scraping'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
});

// Scripts essentiels à garder à la racine
const essential = ['app.js', 'package.json', 'ULTIMATE_V13.js', 'DUMP_V13.js', 'ENRICHER_V13.js', 'ORGANIZER_V13.js'];

let organized = 0;
fs.readdirSync('./').forEach(file => {
  if (file.endsWith('.js') && !essential.includes(file)) {
    try {
      const category = file.includes('BACKUP') || file.includes('DUMP') ? 'backup' :
                     file.includes('ENRICH') || file.includes('SMART') ? 'enrichment' :
                     file.includes('CHECK') || file.includes('COHERENCE') ? 'validation' : 'organized';
      
      const dest = `./scripts/organized/${category}/${file}`;
      if (!fs.existsSync(dest)) {
        fs.renameSync(`./${file}`, dest);
        organized++;
      }
    } catch(e) {
      // Skip if already moved
    }
  }
});

console.log(`✅ ${organized} scripts organisés`);
