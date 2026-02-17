/**
 * Extract current driver fingerprints from the app
 */
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../../drivers');

function getDriverFingerprints() {
  const drivers = {};
  const mfrToDrivers = new Map();
  const mfrSet = new Set();
  const pidToDrivers = new Map();

  for (const name of fs.readdirSync(DRIVERS_DIR)) {
    const fp = path.join(DRIVERS_DIR, name, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (!j.zigbee) continue;
      const mfrs = j.zigbee.manufacturerName || [];
      const pids = j.zigbee.productId || [];
      drivers[name] = { mfrs, pids, caps: j.capabilities || [] };
      for (const m of mfrs) {
        mfrSet.add(m.toLowerCase());
        if (!mfrToDrivers.has(m)) mfrToDrivers.set(m, []);
        mfrToDrivers.get(m).push(name);
      }
      for (const p of pids) {
        if (!pidToDrivers.has(p)) pidToDrivers.set(p, []);
        pidToDrivers.get(p).push(name);
      }
    } catch (e) { /* skip broken */ }
  }
  return { drivers, mfrToDrivers, mfrSet, pidToDrivers };
}

module.exports = { getDriverFingerprints, DRIVERS_DIR };
