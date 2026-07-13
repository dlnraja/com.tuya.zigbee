// apply-forum-fixes.js — apply fixes from forum findings
const fs = require('fs');

const mfsPath = 'data/mfs_db.json';
const mfs = JSON.parse(fs.readFileSync(mfsPath, 'utf8'));
const c = JSON.parse(fs.readFileSync('lib/tuya/fingerprints.json', 'utf8'));
let added = 0;

console.log('=== APPLYING FORUM FIXES ===\n');

// === FIX 1: Add SEDEA whitelabel mfrs ===
// From forum #147569: SEDEA = Tuya whitelabel
// Common SEDEA mfrs: _TZE200_*, _TYZB01_*
console.log('=== FIX 1: SEDEA whitelabel mfrs ===');
// SEDEA typically uses TS0201 (temp/humidity sensor)
const sedeaMfrs = [
  { mfr: '_TZE200_a476raq2', pid: 'TS0201', desc: 'SEDEA sensor (hypothetical)' }
];
// We'll need to add real SEDEA mfrs from the image
// For now, create a generic SEDEA entry
mfs.devices['_sedea_unknown'] = {
  manufacturerId: '_sedea_unknown',
  modelIds: ['TS0201'],
  variants: [],
  deviceType: 'sensor',
  driverHint: 'climate_sensor',
  capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
  powerSource: 'battery',
  sources: ['forum'],
  sourceDetails: { forum: 'community.homey.app/t/147569' },
  confidence: 0.4,
  lastSeen: new Date().toISOString(),
  note: 'SEDEA is a Tuya whitelabel brand. Real mfrs need to be extracted from device image.'
};
mfs.driverMapping.climate_sensor = mfs.driverMapping.climate_sensor || { manufacturerIds: [], fingerprints: [] };
mfs.driverMapping.climate_sensor.manufacturerIds = mfs.driverMapping.climate_sensor.manufacturerIds || [];
if (!mfs.driverMapping.climate_sensor.manufacturerIds.includes('_sedea_unknown')) {
  mfs.driverMapping.climate_sensor.manufacturerIds.push('_sedea_unknown');
  added++;
}
console.log('  Added _sedea_unknown placeholder');
console.log('  Source: https://community.homey.app/t/capteur-sedea-eth730-zigbee/147569');

// === FIX 2: Add _TZE200_9xfjixap to thermostatic_radiator_valve driver ===
console.log('\n=== FIX 2: _TZE200_9xfjixap (thermostat) ===');
// This device is in mfs_db.devices but NOT in driverMapping
// Forum: https://community.homey.app/t/zigbee-thermostat-tze200-9xfjixap-recognized-as-button-in-homey-pro/145056
// Also: dlnraja/com.tuya.zigbee#365 (radiator_valve)
const thermMfr = '_tze200_9xfjixap';
const thermDriver = 'thermostatic_radiator_valve';

if (!mfs.driverMapping[thermDriver]) {
  mfs.driverMapping[thermDriver] = { manufacturerIds: [], fingerprints: [] };
}
if (!mfs.driverMapping[thermDriver].manufacturerIds.includes(thermMfr)) {
  mfs.driverMapping[thermDriver].manufacturerIds.push(thermMfr);
  added++;
  console.log('  Added ' + thermMfr + ' to ' + thermDriver);
}

// Also add to device_radiator_valve_thermostat
const thermDriver2 = 'device_radiator_valve_thermostat';
if (mfs.driverMapping[thermDriver2]) {
  if (!mfs.driverMapping[thermDriver2].manufacturerIds.includes(thermMfr)) {
    mfs.driverMapping[thermDriver2].manufacturerIds.push(thermMfr);
    added++;
    console.log('  Also added to ' + thermDriver2);
  }
}

// === FIX 3: Auto-apply all 85 canonical gaps to their driver mappings ===
console.log('\n=== FIX 3: Canonical gaps ===');
const pairs = JSON.parse(fs.readFileSync('.github/state/all-mfr-pid-pairs.json', 'utf8'));
const driverPattern = /drivers\/(.+?)\//;
for (const p of pairs) {
  if (p.sources && p.sources.includes('canonical') && !p.sources.includes('driver')) {
    const info = p.info || [];
    const driverInfo = info.find(i => i.source === 'driver');
    if (driverInfo && driverInfo.driver) {
      const driver = driverInfo.driver;
      const mfr = p.mfr.toLowerCase();
      if (!mfs.driverMapping[driver]) {
        mfs.driverMapping[driver] = { manufacturerIds: [], fingerprints: [] };
      }
      mfs.driverMapping[driver].manufacturerIds = mfs.driverMapping[driver].manufacturerIds || [];
      if (!mfs.driverMapping[driver].manufacturerIds.includes(mfr)) {
        mfs.driverMapping[driver].manufacturerIds.push(mfr);
        added++;
      }
    }
  }
}
console.log('  Applied canonical gap fixes');

// === FIX 4: Add Sacred Couples for forum fixes ===
console.log('\n=== FIX 4: Update Sacred Couples ===');
mfs.sacredCouples = mfs.sacredCouples || {};
// Add SEDEA sacred couple
mfs.sacredCouples['_sedea_unknown|ts0201'] = {
  mfr: '_sedea_unknown', pid: 'ts0201', driver: 'climate_sensor',
  sources: ['forum'], confidence: 0.4
};
// Add 9xfjixap sacred couple (if not present)
const key9 = '_tze200_9xfjixap|ts0601';
if (!mfs.sacredCouples[key9]) {
  mfs.sacredCouples[key9] = {
    mfr: '_tze200_9xfjixap', pid: 'ts0601', driver: 'thermostatic_radiator_valve',
    sources: ['forum', 'mfs_db'], confidence: 0.85
  };
}

mfs._meta = mfs._meta || {};
mfs._meta.lastUpdated = new Date().toISOString();
mfs._meta.forumFixesApplied = true;

console.log('\n=== TOTAL ADDED: ' + added + ' ===');

fs.copyFileSync(mfsPath, mfsPath + '.bak.forum.' + Date.now());
fs.writeFileSync(mfsPath, JSON.stringify(mfs, null, 2));
console.log('Saved mfs_db.json');
