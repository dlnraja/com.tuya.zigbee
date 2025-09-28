const fs = require('fs');

console.log('📦 COMPLETE ORGANIZER V8');

// Create full directory structure
const dirs = [
  './scripts/organized/backup',
  './scripts/organized/enrichment',
  './scripts/organized/validation',
  './scripts/organized/scraping',
  './scripts/organized/historical',
  './references',
  './backup'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
    console.log(`📁 Created: ${dir}`);
  }
});

// Organize remaining scripts
const rootFiles = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !['app.js'].includes(f));

let organized = 0;
rootFiles.slice(0, 15).forEach(file => {
  try {
    const category = file.includes('BACKUP') || file.includes('HISTORICAL') ? 'backup' :
                   file.includes('ENRICH') || file.includes('SMART') ? 'enrichment' :
                   file.includes('CHECK') || file.includes('COHERENCE') ? 'validation' :
                   file.includes('ORGANIZE') ? 'organized' : 'organized';
    
    const dest = `./scripts/organized/${category}/${file}`;
    if (!fs.existsSync(dest)) {
      fs.renameSync(`./${file}`, dest);
      organized++;
      console.log(`📁 ${file} → ${category}/`);
    }
  } catch(e) {
    // Already moved or essential file
  }
});

console.log(`✅ Organized ${organized} files into proper directories`);
