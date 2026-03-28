/**
 * Driver fingerprint utilities - re-exports from shared lib
 * Kept for backward compatibility with sync scripts
 */
const { loadAllDrivers, DRIVERS_DIR } = require('../../lib/drivers');

function getDriverFingerprints() {
  const drivers = {};
  const mfrToDrivers = new Map();
  const mfrSet = new Set();
  const pidToDrivers = new Map();
  const allDrivers = loadAllDrivers();
  for (const [name, d] of allDrivers) {
    drivers[name] = { mfrs: d.mfrs, pids: d.pids, caps: d.caps };
    for (const m of d.mfrs) {
      mfrSet.add(m.toLowerCase());
      if (!mfrToDrivers.has(m)) mfrToDrivers.set(m, []);
      mfrToDrivers.get(m).push(name);
    }
    for (const p of d.pids) {
      if (!pidToDrivers.has(p)) pidToDrivers.set(p, []);
      pidToDrivers.get(p).push(name);
    }
  }
  return { drivers, mfrToDrivers, mfrSet, pidToDrivers };
}

module.exports = { getDriverFingerprints, DRIVERS_DIR };
