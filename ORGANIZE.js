const fs = require('fs');

console.log('📦 ORGANIZE v6.0.0');

// Créer structure organisée
const orgDirs = [
  './scripts/organized/backup',
  './scripts/organized/enrichment',
  './scripts/organized/validation',
  './scripts/organized/scraping'
];

orgDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// Organiser scripts racine (garder les essentiels)
const essential = ['app.js', 'package.json', '.gitignore'];
const rootScripts = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !essential.includes(f));

let moved = 0;
rootScripts.forEach(script => {
  try {
    const category = script.includes('BACKUP') ? 'backup' :
                   script.includes('ENRICH') ? 'enrichment' :
                   script.includes('FIX') ? 'validation' :
                   'organized';
    
    const dest = `./scripts/organized/${category}/${script}`;
    fs.renameSync(`./${script}`, dest);
    moved++;
  } catch (e) {
    console.log(`⚠️ Could not move ${script}`);
  }
});

console.log(`✅ Organized ${moved} scripts`);
