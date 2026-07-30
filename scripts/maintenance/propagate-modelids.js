// propagate-modelids.js
// P86: Pour chaque mfr dans mfs_db, ajouter TOUS ses modelIds au productId[] du driver cible
// Cela permet à un driver d'accepter un mfr qui peut avoir plusieurs device IDs (PIDs)

const fs = require('fs');
const path = require('path');

const ROOT = '.';
const MFS = 'data/mfs_db.json';
const CATCHALL = new Set(['generic_tuya', 'generic_zigbee', 'generic_device', 'universal_zigbee', 'generic_diy']);

function loadJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

const mfs = loadJSON(MFS);
if (!mfs) { console.log('mfs_db missing'); process.exit(1); }

// Build mfr → driverId index
const mfsByMfr = new Map();
for (const [k, v] of Object.entries(mfs)) {
  if (!k.startsWith('_')) continue;
  if (k.length < 12) continue;
  if (typeof v !== 'object' || !v || !v.driverId) continue;
  mfsByMfr.set(k, v);
}

// Per-driver accumulator: driverId → Set of PIDs to add
const driverPidAdditions = new Map();

let multiPidMfrs = 0;
for (const [mfr, v] of mfsByMfr) {
  if (CATCHALL.has(v.driverId)) continue;
  if (!v.modelIds || v.modelIds.length < 2) continue;
  multiPidMfrs++;
  if (!driverPidAdditions.has(v.driverId)) driverPidAdditions.set(v.driverId, new Set());
  for (const p of v.modelIds) {
    // Skip dev placeholders
    if (/^(BUTTON|CC\d+|CUSTOM|DIY|EFEKTA|ESP\d*|MAKER|PTVO|ZIGBEE|DIMMER|DEBUG|DEMO|RELAY|ROUTER|SENSOR|SWITCH|SNZW|SNZB-)/.test(p)) continue;
    driverPidAdditions.get(v.driverId).add(p);
  }
}

console.log('P86 propagate:');
console.log('  Mfrs with multi-PID to propagate:', multiPidMfrs);
console.log('  Drivers to update:', driverPidAdditions.size);

if (process.argv.includes('--apply')) {
  let totalAdded = 0;
  let driversUpdated = 0;
  for (const [driverId, pidSet] of driverPidAdditions) {
    if (pidSet.size === 0) continue;
    const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
    if (!fs.existsSync(p)) {
      console.log(`  WARN: driver not found: ${driverId}`);
      continue;
    }
    const c = loadJSON(p);
    if (!c.zigbee) continue;
    const existing = new Set(c.zigbee.productId || []);
    let added = 0;
    for (const pid of pidSet) {
      if (!existing.has(pid)) {
        existing.add(pid);
        added++;
      }
    }
    if (added > 0) {
      c.zigbee.productId = [...existing].sort();
      saveJSON(p, c);
      totalAdded += added;
      driversUpdated++;
    }
  }
  console.log(`  Applied: +${totalAdded} PIDs to ${driversUpdated} drivers`);
}
