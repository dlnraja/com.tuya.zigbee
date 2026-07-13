// apply-mfr-pid-cross-ref.js — apply new mfr+PID pairs from user data
const fs = require('fs');
const path = require('path');

const mfsPath = 'data/mfs_db.json';
const mfs = JSON.parse(fs.readFileSync(mfsPath, 'utf8'));
const pairs = JSON.parse(fs.readFileSync('.github/state/all-mfr-pid-pairs.json', 'utf8'));

// Find pairs in user data but not in canonical/mfs_db/drivers
const userSources = new Set(['johan-issue', 'johan-comment', 'gmail']);
const internalSources = new Set(['canonical', 'mfs_db', 'driver']);
const newPairs = pairs.filter(p => {
  const inUser = p.sources.some(s => userSources.has(s));
  const inInternal = p.sources.some(s => internalSources.has(s));
  return inUser && !inInternal;
});

console.log('=== NEW PAIRS FROM USER DATA ===');
console.log('Total:', newPairs.length);

// Group by mfr to add as new devices
const byMfr = new Map();
for (const p of newPairs) {
  if (!byMfr.has(p.mfr)) byMfr.set(p.mfr, []);
  byMfr.get(p.mfr).push(p);
}

console.log('\nUnique mfrs:', byMfr.size);

// Determine best driver for each mfr (heuristic based on PID)
function guessDriver(pid) {
  const p = pid.toUpperCase();
  if (/^TS0601$/.test(p)) return 'soil_sensor'; // many soil/temp sensors use TS0601
  if (/^TS0201$/.test(p)) return 'climate_sensor';
  if (/^TS0202$/.test(p)) return 'climate_sensor';
  if (/^TS0203$/.test(p)) return 'door_window_sensor';
  if (/^TS0204$/.test(p)) return 'water_leak_sensor';
  if (/^TS0205$/.test(p)) return 'water_leak_sensor';
  if (/^TS0207$/.test(p)) return 'water_leak_sensor';
  if (/^TS0208$/.test(p)) return 'motion_sensor';
  if (/^TS0041$/.test(p)) return 'button_wireless_1';
  if (/^TS0042$/.test(p)) return 'button_wireless_2';
  if (/^TS0043$/.test(p)) return 'button_wireless_3';
  if (/^TS0044$/.test(p)) return 'button_wireless_4';
  if (/^TS0001$/.test(p)) return 'switch_1gang';
  if (/^TS0002$/.test(p)) return 'switch_2gang';
  if (/^TS0003$/.test(p)) return 'switch_3gang';
  if (/^TS0004$/.test(p)) return 'switch_4gang';
  if (/^TS0011$/.test(p)) return 'switch_1gang';
  if (/^TS0012$/.test(p)) return 'switch_1gang';
  if (/^TS0013$/.test(p)) return 'switch_1gang';
  if (/^TS0014$/.test(p)) return 'switch_1gang';
  if (/^TS0505/.test(p)) return 'switch_1gang';
  if (/^TS0601$/.test(p)) return 'soil_sensor';
  if (/^TS110/.test(p)) return 'climate_sensor';
  if (/^TS005/.test(p)) return 'switch_1gang';
  if (/^TH0/.test(p)) return 'climate_sensor';
  if (/^ZG-/.test(p)) return 'soil_sensor';
  if (/^CS-/.test(p)) return 'soil_sensor';
  if (/^SNZB/.test(p)) return 'door_window_sensor';
  return 'generic_tuya';
}

// Add new devices
let added = 0;
const newMfrs = new Set();
for (const [mfr, items] of byMfr) {
  const mfrLower = mfr.toLowerCase();
  const existing = mfs.devices[mfrLower];
  const newPids = items.map(i => i.pid);
  // Get unique new PIDs
  const uniquePids = [...new Set(newPids)];
  if (existing) {
    // Merge: add new PIDs to existing
    const existingPids = existing.modelIds || [];
    for (const pid of uniquePids) {
      if (!existingPids.includes(pid)) existingPids.push(pid);
    }
    existing.modelIds = existingPids;
    existing.lastSeen = new Date().toISOString();
    existing.sources = [...new Set([...(existing.sources || []), 'user-data-cross-ref'])];
    added += uniquePids.length;
  } else {
    // Create new device entry
    const pids = uniquePids;
    // Find the most common driver guess
    const driverGuesses = {};
    for (const pid of pids) {
      const d = guessDriver(pid);
      driverGuesses[d] = (driverGuesses[d] || 0) + 1;
    }
    const bestDriver = Object.entries(driverGuesses).sort((a,b) => b[1] - a[1])[0][0];
    mfs.devices[mfrLower] = {
      manufacturerId: mfrLower,
      modelIds: pids,
      variants: [],
      deviceType: 'sensor',
      driverHint: bestDriver,
      capabilities: [],
      powerSource: 'unknown',
      sources: ['user-data-cross-ref'],
      sourceDetails: { 'user-data-cross-ref': items.length },
      confidence: 0.5,
      lastSeen: new Date().toISOString()
    };
    newMfrs.add(mfrLower);
    added += pids.length;
  }
}

// Also add mfrs to driver mapping
if (newMfrs.size > 0) {
  for (const mfr of newMfrs) {
    const device = mfs.devices[mfr];
    const driver = device.driverHint;
    if (!mfs.driverMapping[driver]) mfs.driverMapping[driver] = { manufacturerIds: [], fingerprints: [] };
    if (!mfs.driverMapping[driver].manufacturerIds) mfs.driverMapping[driver].manufacturerIds = [];
    if (!mfs.driverMapping[driver].manufacturerIds.includes(mfr)) {
      mfs.driverMapping[driver].manufacturerIds.push(mfr);
    }
  }
}

console.log('\n=== APPLIED ===');
console.log('New mfrs added:', newMfrs.size);
console.log('New mfr+pid pairs added:', added);
console.log('New mfrs:', [...newMfrs].slice(0, 20));

// Backup + save
const bak = mfsPath + '.bak.crossref.' + Date.now();
fs.copyFileSync(mfsPath, bak);
console.log('Backup:', bak);
fs.writeFileSync(mfsPath, JSON.stringify(mfs, null, 2));
console.log('Saved mfs_db.json');

// Also save the applied pairs
const report = {
  meta: { generatedAt: new Date().toISOString() },
  totalNewPairs: newPairs.length,
  newMfrs: newMfrs.size,
  pairsAdded: added,
  newMfrList: [...newMfrs],
  sampleNewPairs: newPairs.slice(0, 50)
};
fs.writeFileSync('.github/state/cross-ref-applied.json', JSON.stringify(report, null, 2));
console.log('Report saved');
