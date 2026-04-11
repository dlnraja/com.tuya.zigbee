'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DATA_DIR = path.join(ROOT, 'data', 'community-sync');
const STATE_DIR = path.join(ROOT, '.github', 'state');

function loadAllDrivers() {
  const drivers = new Map();
  for (const name of fs.readdirSync(DRIVERS_DIR)) {
    const cf = path.join(DRIVERS_DIR, name, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const raw = fs.readFileSync(cf, 'utf8');
      const config = JSON.parse(raw);
      if (!config.zigbee) continue;
      drivers.set(name, {
        name, path: cf, raw, config,
        mfrs: config.zigbee.manufacturerName || [],
        pids: config.zigbee.productId || [],
        caps: config.capabilities || [],
      });
    } catch (e) { /* skip broken */ }
  }
  return drivers;
}

function loadFingerprints() {
  const mfrToDrivers = new Map();
  const pidToDrivers = new Map();
  const mfrSet = new Set();
  const drivers = loadAllDrivers();
  for (const [name, d] of drivers) {
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
  return { drivers, mfrToDrivers, pidToDrivers, mfrSet };
}

function findConflicts() {
  const { drivers } = loadFingerprints();
  const combos = new Map();
  for (const [name, d] of drivers) {
    for (const m of d.mfrs) {
      for (const p of d.pids) {
        const key = m + '|' + p;
        if (!combos.has(key)) combos.set(key, []);
        combos.get(key).push(name);
      }
    }
  }
  const conflicts = new Map();
  for (const [key, drvs] of combos) {
    if (drvs.length > 1) conflicts.set(key, drvs);
  }
  return conflicts;
}

function writeDriverJson(driverPath, data) {
  fs.writeFileSync(driverPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  ROOT, DRIVERS_DIR, DATA_DIR, STATE_DIR,
  loadAllDrivers, loadFingerprints, findConflicts,
  writeDriverJson, ensureDir,
};
