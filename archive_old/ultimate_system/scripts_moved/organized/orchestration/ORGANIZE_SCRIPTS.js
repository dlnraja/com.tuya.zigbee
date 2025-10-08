const fs = require('fs');
const path = require('path');

console.log('📦 ORGANIZE SCRIPTS v3.0.0');

// Créer structure de dossiers
const dirs = [
  './scripts/organized',
  './scripts/backup_analysis', 
  './scripts/enrichment',
  './scripts/scraping',
  './scripts/validation'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Organiser scripts racine
const rootFiles = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !['app.js'].includes(f));

let moved = 0;
rootFiles.forEach(file => {
  try {
    const dest = file.includes('FIX') ? './scripts/organized/' : 
                 file.includes('ULTIMATE') ? './scripts/organized/' :
                 file.includes('MEGA') ? './scripts/organized/' :
                 './scripts/organized/';
    
    fs.renameSync(`./${file}`, `${dest}${file}`);
    moved++;
  } catch (e) {
    console.log(`⚠️ Could not move ${file}`);
  }
});

console.log(`✅ Organized ${moved} scripts`);

// Fusionner scripts similaires
const organized = fs.readdirSync('./scripts/organized');
console.log(`📊 Found ${organized.length} scripts to organize`);
