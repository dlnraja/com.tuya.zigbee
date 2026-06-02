'use strict';
const fs = require('fs'), path = require('path');
process.chdir(path.join(__dirname, '..', '..', '..'));

const drivers = fs.readdirSync('drivers', { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

const refs = new Set();
let settingsFileCount = 0;

for (const d of drivers) {
  const f = path.join('drivers', d, 'driver.settings.compose.json');
  if (!fs.existsSync(f)) continue;
  settingsFileCount++;
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const arr = Array.isArray(j) ? j : [j];
    for (const s of arr) {
      const ext = s['$extends'];
      if (ext) ext.forEach(r => refs.add(r));
    }
  } catch (e) {
    console.log('INVALID:', d, e.message.slice(0, 40));
  }
}

console.log('driver.settings.compose.json files:', settingsFileCount);
console.log('Unique $extends refs:', [...refs].sort().join(', '));
console.log('Count:', refs.size);
