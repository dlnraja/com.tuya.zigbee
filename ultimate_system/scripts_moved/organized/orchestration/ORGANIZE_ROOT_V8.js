const fs = require('fs');

console.log('📦 ORGANIZE ROOT V8');

// Create organized structure
if (!fs.existsSync('./scripts/organized')) {
  fs.mkdirSync('./scripts/organized', {recursive: true});
}

// Get all JS files in root (except essential)
const essential = ['app.js', 'package.json'];
const rootScripts = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !essential.includes(f));

console.log(`📁 Found ${rootScripts.length} scripts to organize`);

// Move first 10 scripts to avoid timeout
let moved = 0;
rootScripts.slice(0, 10).forEach(script => {
  try {
    const dest = `./scripts/organized/${script}`;
    if (!fs.existsSync(dest)) {
      fs.renameSync(`./${script}`, dest);
      moved++;
    }
  } catch(e) {
    // Skip if already moved
  }
});

console.log(`✅ Organized ${moved} scripts`);
