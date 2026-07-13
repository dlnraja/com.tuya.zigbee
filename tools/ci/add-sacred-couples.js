// add-sacred-couples.js — Add Sacred Couples from REAL sources only
const fs = require('fs');

const mfsPath = 'data/mfs_db.json';
const mfs = JSON.parse(fs.readFileSync(mfsPath, 'utf8'));

// Initialize
mfs.sacredCouples = {};
mfs._meta = mfs._meta || {};

// === SOURCE 1: From canonical fingerprints (authoritative) ===
const canonical = JSON.parse(fs.readFileSync('lib/tuya/fingerprints.json', 'utf8'));
for (const [mfr, info] of Object.entries(canonical)) {
  const pids = info.modelIds || [];
  for (const pid of pids) {
    const key = mfr.toLowerCase() + '|' + pid.toLowerCase();
    mfs.sacredCouples[key] = {
      mfr: mfr.toLowerCase(),
      pid: pid.toLowerCase(),
      driver: info.driverId,
      sources: ['canonical'],
      confidence: 0.95
    };
  }
}
console.log('From canonical:', Object.keys(mfs.sacredCouples).length);

// === SOURCE 2: From mfs_db.devices ===
for (const [did, dev] of Object.entries(mfs.devices)) {
  if (!dev.manufacturerId) continue;
  const pids = dev.modelIds || [];
  for (const pid of pids) {
    const key = dev.manufacturerId.toLowerCase() + '|' + pid.toLowerCase();
    if (mfs.sacredCouples[key]) {
      // Merge sources
      mfs.sacredCouples[key].sources.push('mfs_db');
    } else {
      mfs.sacredCouples[key] = {
        mfr: dev.manufacturerId.toLowerCase(),
        pid: pid.toLowerCase(),
        driver: dev.driverHint || 'unknown',
        sources: ['mfs_db'],
        confidence: dev.confidence || 0.7
      };
    }
  }
}
console.log('After mfs_db:', Object.keys(mfs.sacredCouples).length);

// === SOURCE 3: From REAL user data (Johan, Gmail) ===
const userPairs = JSON.parse(fs.readFileSync('.github/state/all-mfr-pid-pairs.json', 'utf8'));
let fromUser = 0;
for (const p of userPairs) {
  const userSources = p.sources || [];
  // Only add if at least one user source
  const isUser = userSources.some(s => ['johan-issue', 'johan-comment', 'gmail'].includes(s));
  if (!isUser) continue;

  const key = p.mfr.toLowerCase() + '|' + p.pid.toLowerCase();
  if (mfs.sacredCouples[key]) {
    if (!mfs.sacredCouples[key].sources.includes('user-data')) {
      mfs.sacredCouples[key].sources.push('user-data');
      fromUser++;
    }
  } else {
    // New from user data — guess driver
    const pidUpper = p.pid.toUpperCase();
    let driver = 'generic_tuya';
    if (/^TS0601$/.test(pidUpper)) driver = 'soil_sensor';
    else if (/^TS0201$|^TS0202$/.test(pidUpper)) driver = 'climate_sensor';
    else if (/^TS0203$/.test(pidUpper)) driver = 'door_window_sensor';
    else if (/^TS0204$|^TS0205$|^TS0207$/.test(pidUpper)) driver = 'water_leak_sensor';
    else if (/^TS0041$/.test(pidUpper)) driver = 'button_wireless_1';
    else if (/^TS0042$/.test(pidUpper)) driver = 'button_wireless_2';
    else if (/^TS0043$/.test(pidUpper)) driver = 'button_wireless_3';
    else if (/^TS0044$/.test(pidUpper)) driver = 'button_wireless_4';
    else if (/^TS0001$|^TS001[1-4]$/.test(pidUpper)) driver = 'switch_1gang';
    else if (/^TS0002$/.test(pidUpper)) driver = 'switch_2gang';
    else if (/^TS0003$/.test(pidUpper)) driver = 'switch_3gang';
    else if (/^TS0004$/.test(pidUpper)) driver = 'switch_4gang';
    else if (/^TS0601$/.test(pidUpper)) driver = 'soil_sensor';
    else if (/^TS110[EF]$/.test(pidUpper)) driver = 'climate_sensor';
    else if (/^TS005/.test(pidUpper)) driver = 'switch_1gang';
    else if (/^TH0/.test(pidUpper)) driver = 'climate_sensor';
    else if (/^ZG-/.test(pidUpper)) driver = 'soil_sensor';
    else if (/^CS-/.test(pidUpper)) driver = 'soil_sensor';
    else if (/^SNZB/.test(pidUpper)) driver = 'door_window_sensor';

    mfs.sacredCouples[key] = {
      mfr: p.mfr.toLowerCase(),
      pid: p.pid.toLowerCase(),
      driver: driver,
      sources: ['user-data'],
      confidence: 0.6
    };
    fromUser++;
  }
}
console.log('From user data (new):', fromUser);
console.log('Total sacred couples:', Object.keys(mfs.sacredCouples).length);

// Group by driver for stats
const byDriver = {};
for (const k of Object.keys(mfs.sacredCouples)) {
  const d = mfs.sacredCouples[k].driver;
  byDriver[d] = (byDriver[d] || 0) + 1;
}
console.log('\n=== BY DRIVER ===');
for (const [d, c] of Object.entries(byDriver).sort((a,b) => b[1] - a[1]).slice(0, 15)) {
  console.log('  ' + d + ': ' + c);
}

// Update metadata
mfs._meta.sacredCouplesEnabled = true;
mfs._meta.sacredCouplesCount = Object.keys(mfs.sacredCouples).length;
mfs._meta.lastSacredCouplesUpdate = new Date().toISOString();
mfs._meta.lastUpdated = new Date().toISOString();

fs.copyFileSync(mfsPath, mfsPath + '.bak.sacred2.' + Date.now());
fs.writeFileSync(mfsPath, JSON.stringify(mfs, null, 2));
console.log('\nSaved');
