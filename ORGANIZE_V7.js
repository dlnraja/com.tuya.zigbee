const fs = require('fs');

console.log('📦 ORGANIZE V7');

if (!fs.existsSync('./scripts/organized')) {
  fs.mkdirSync('./scripts/organized', {recursive: true});
}

const rootScripts = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !['app.js', 'package.json'].includes(f));

console.log(`📁 Found ${rootScripts.length} scripts to organize`);

let organized = 0;
rootScripts.slice(0, 5).forEach(script => {
  try {
    const dest = `./scripts/organized/${script}`;
    if (!fs.existsSync(dest)) {
      fs.renameSync(`./${script}`, dest);
      organized++;
    }
  } catch(e) {}
});

console.log(`✅ Organized ${organized} scripts`);
