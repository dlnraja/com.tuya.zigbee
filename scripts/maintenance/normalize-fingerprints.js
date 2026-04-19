const fs = require('fs');
const path = require('path');

function normalizeFingerprints(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    if (content.zigbee) {
      if (content.zigbee.manufacturerName) {
        content.zigbee.manufacturerName = content.zigbee.manufacturerName.map(m => {
          if (m.toLowerCase() !== m) {
            changed = true;
            return m.toLowerCase();
          }
          return m;
        });
        // Deduplicate
        content.zigbee.manufacturerName = [...new Set(content.zigbee.manufacturerName)];
      }
      if (content.zigbee.productId) {
        content.zigbee.productId = content.zigbee.productId.map(p => {
          if (p.toLowerCase() !== p) {
            changed = true;
            return p.toLowerCase();
          }
          return p;
        });
        // Deduplicate
        content.zigbee.productId = [...new Set(content.zigbee.productId)];
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      console.log(` Normalized: ${filePath}`);
    }
  } catch (e) {
    // console.error(`Error processing ${filePath}: ${e.message}`);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walk(filePath);
    } else if (file === 'driver.compose.json' || file === 'app.json') {
      normalizeFingerprints(filePath);
    }
  });
}

console.log('--- Normalizing all Zigbee fingerprints to lowercase ---');
walk('.');
console.log('--- Normalization complete ---');
