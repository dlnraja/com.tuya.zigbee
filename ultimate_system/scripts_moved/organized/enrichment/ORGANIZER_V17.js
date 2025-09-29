const fs = require('fs');
console.log('📦 ORGANIZER V17 - HÉRITAGE V15+V16');

const dirs = ['./scripts/organized/backup', './scripts/organized/enrichment', './scripts/organized/validation'];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
});

const essential = ['app.js', 'BACKUP_V17.js', 'ENRICHER_V17.js', 'SCRAPER_V17.js'];
let moved = 0;

fs.readdirSync('./').forEach(f => {
  if (f.endsWith('.js') && !essential.includes(f)) {
    const cat = f.includes('BACKUP') ? 'backup' : f.includes('VALID') ? 'validation' : 'enrichment';
    const dest = `./scripts/organized/${cat}/${f}`;
    if (!fs.existsSync(dest)) {
      try {
        fs.renameSync(`./${f}`, dest);
        moved++;
      } catch(e) {}
    }
  }
});

console.log(`✅ V17: ${moved} scripts organisés (Héritage V15: 75, V16: 7)`);
