const fs = require('fs');

console.log('📦 ORGANIZE ALL v4.0.0');

// Create directories
const dirs = ['./scripts/organized', './scripts/backup', './scripts/enrichment'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// Move root scripts (keep essential files)
const keep = ['app.js', 'package.json', '.gitignore'];
const rootFiles = fs.readdirSync('./').filter(f => 
  f.endsWith('.js') && !keep.includes(f));

rootFiles.forEach(file => {
  try {
    fs.renameSync(`./${file}`, `./scripts/organized/${file}`);
    console.log(`📁 Moved ${file}`);
  } catch (e) {
    console.log(`⚠️ Could not move ${file}`);
  }
});

console.log('✅ ORGANIZATION COMPLETE');
