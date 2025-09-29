const fs = require('fs');

console.log('📦 ORGANIZE V9');

// Create directories
if (!fs.existsSync('./scripts/organized')) {
  fs.mkdirSync('./scripts/organized', {recursive: true});
}

// Move scripts
const scripts = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !['app.js'].includes(f));

let moved = 0;
scripts.slice(0, 5).forEach(script => {
  try {
    const dest = `./scripts/organized/${script}`;
    if (!fs.existsSync(dest)) {
      fs.renameSync(`./${script}`, dest);
      moved++;
    }
  } catch(e) {}
});

console.log(`✅ Organized ${moved} scripts`);
