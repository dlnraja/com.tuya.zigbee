const fs = require('fs');

console.log('📦 ORGANIZE SCRIPTS V5.0.0');

// Create organized structure
const dirs = [
  './scripts/organized/backup',
  './scripts/organized/enrichment', 
  './scripts/organized/validation',
  './scripts/organized/scraping'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// Move root scripts (keep essential files)
const essential = ['app.js', 'package.json', '.gitignore', '.homeyignore'];
const rootFiles = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !essential.includes(f));

let moved = 0;
rootFiles.forEach(file => {
  try {
    const category = file.includes('BACKUP') ? 'backup' :
                   file.includes('FIX') || file.includes('RESOLVE') ? 'validation' :
                   file.includes('WEB') || file.includes('SCRAPER') ? 'scraping' :
                   file.includes('ANALYZER') || file.includes('ENRICH') ? 'enrichment' : 
                   'organized';
    
    const dest = `./scripts/organized/${category}/${file}`;
    fs.renameSync(`./${file}`, dest);
    moved++;
    console.log(`📁 ${file} → ${category}/`);
  } catch (e) {
    console.log(`⚠️ Could not move ${file}`);
  }
});

console.log(`✅ Organized ${moved} scripts`);
