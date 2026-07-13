// fix-driver-compose-gaps-v2.js — fix canonical gaps using canonical FP lookup
const fs = require('fs');
const path = require('path');

const pairs = JSON.parse(fs.readFileSync('.github/state/all-mfr-pid-pairs.json', 'utf8'));
const canonical = JSON.parse(fs.readFileSync('lib/tuya/fingerprints.json', 'utf8'));

// Find canonical gaps (in canonical, not in drivers)
const canonicalGaps = [];
for (const p of pairs) {
  if (p.sources && p.sources.includes('canonical') && !p.sources.includes('driver')) {
    // Look up the canonical FP to find the driver
    const fp = canonical[p.mfr] || canonical[p.mfr.toLowerCase()];
    if (fp && fp.driverId) {
      canonicalGaps.push({ mfr: p.mfr, pid: p.pid, driver: fp.driverId, sources: p.sources });
    }
  }
}

console.log('=== CANONICAL GAPS TO FIX ===');
console.log('Total:', canonicalGaps.length);

// Group by driver
const byDriver = new Map();
for (const g of canonicalGaps) {
  if (!byDriver.has(g.driver)) byDriver.set(g.driver, []);
  byDriver.get(g.driver).push(g);
}

console.log('Drivers affected:', byDriver.size);
for (const [d, items] of byDriver) {
  console.log('  ' + d + ': ' + items.length + ' pairs');
}

// Apply to each driver's driver.compose.json
let filesModified = 0;
let mfrsAdded = 0;
let pidsAdded = 0;
for (const [driver, items] of byDriver) {
  const composeFile = path.join('drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) {
    console.log('  SKIP ' + driver + ' (no driver.compose.json)');
    continue;
  }
  const data = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  if (!data.zigbee) {
    console.log('  SKIP ' + driver + ' (no zigbee section)');
    continue;
  }
  if (!data.zigbee.manufacturerName) data.zigbee.manufacturerName = [];
  if (!data.zigbee.productId) data.zigbee.productId = [];

  let mfrsBefore = data.zigbee.manufacturerName.length;
  let pidsBefore = data.zigbee.productId.length;

  for (const g of items) {
    const mfrLower = g.mfr.toLowerCase();
    const pidUpper = g.pid.toUpperCase();
    if (!data.zigbee.manufacturerName.includes(mfrLower) && !data.zigbee.manufacturerName.includes(g.mfr)) {
      data.zigbee.manufacturerName.push(mfrLower);
    }
    if (!data.zigbee.productId.includes(pidUpper) && !data.zigbee.productId.includes(g.pid)) {
      data.zigbee.productId.push(pidUpper);
    }
  }
  let mfrsAfter = data.zigbee.manufacturerName.length;
  let pidsAfter = data.zigbee.productId.length;
  let addedMfrs = mfrsAfter - mfrsBefore;
  let addedPids = pidsAfter - pidsBefore;
  if (addedMfrs > 0 || addedPids > 0) {
    fs.writeFileSync(composeFile, JSON.stringify(data, null, 2));
    filesModified++;
    mfrsAdded += addedMfrs;
    pidsAdded += addedPids;
    console.log('  +' + addedMfrs + ' mfrs, +' + addedPids + ' pids in ' + driver);
  }
}

console.log('\n=== TOTAL ===');
console.log('Files modified:', filesModified);
console.log('Mfrs added:', mfrsAdded);
console.log('Pids added:', pidsAdded);
