// tools/ci/generate-catch-all-snapshot.js
const fs = require('fs');
const path = require('path');
const cp = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
const mfrs = (cp.zigbee && cp.zigbee.manufacturerName) || [];
const data = {
  description: 'Catch-all mfrs in switch_1gang that should NOT be claimed as duplicates by auto-fix-all',
  generatedAt: new Date().toISOString(),
  catchall: mfrs
};
fs.writeFileSync(path.join(__dirname, '..', '..', 'data', 'sacred-couple-catch-all.json'), JSON.stringify(data, null, 2) + '\n');
console.log('Wrote', mfrs.length, 'mfrs to data/sacred-couple-catch-all.json');
