const fs = require('fs');
console.log('📦 ORGANIZER V16');

const dirs = ['./scripts/organized/backup', './scripts/organized/enrichment', './scripts/organized/validation'];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
});

const essential = ['app.js', 'MEGA_V16.js', 'HISTORICAL_ANALYZER_V16.js'];
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

console.log(`✅ ${moved} scripts organisés V16`);
