const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else if (file === 'driver.compose.json') {
      callback(filePath);
    }
  });
}

let fixedCount = 0;

walk(DRIVERS_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let json = JSON.parse(content);
  let changed = false;

  if (json.zigbee && json.zigbee.manufacturerName) {
      const original = JSON.stringify(json.zigbee.manufacturerName);
      json.zigbee.manufacturerName = json.zigbee.manufacturerName.map(m => m.toLowerCase());
      // Deduplicate
      json.zigbee.manufacturerName = [...new Set(json.zigbee.manufacturerName)];
      
      if (JSON.stringify(json.zigbee.manufacturerName) !== original) {
          changed = true;
      }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    fixedCount++;
    console.log(`[LOWERCASED] ${filePath}`);
  }
});

console.log(`\nDone. Lowercased fingerprints in ${fixedCount} files.`);
