const fs = require('fs');
console.log('📦 ORGANIZER V14 - STRUCTURE PROPRE');

// Créer structure complète
const dirs = [
  './scripts/organized/backup',
  './scripts/organized/enrichment',
  './scripts/organized/validation', 
  './scripts/organized/scraping',
  './scripts/organized/historical'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
});

// Scripts essentiels à garder à la racine
const essential = ['app.js', 'package.json', 'V14.js', 'ANALYZER_V14.js', 'SCRAPER_V14.js', 'COHERENCE_V14.js', 'ORGANIZER_V14.js'];

let organized = 0;
fs.readdirSync('./').forEach(file => {
  if (file.endsWith('.js') && !essential.includes(file) && !file.startsWith('ORCHESTRATOR')) {
    try {
      const category = file.includes('BACKUP') || file.includes('DUMP') ? 'backup' :
                     file.includes('ENRICH') || file.includes('ULTIMATE') ? 'enrichment' :
                     file.includes('COHERENCE') || file.includes('VALID') ? 'validation' :
                     file.includes('SCRAP') || file.includes('WEB') ? 'scraping' : 'historical';
      
      const dest = `./scripts/organized/${category}/${file}`;
      if (!fs.existsSync(dest) && file !== dest.split('/').pop()) {
        fs.renameSync(`./${file}`, dest);
        organized++;
      }
    } catch(e) {}
  }
});

console.log(`✅ ${organized} scripts organisés dans structure V14`);
