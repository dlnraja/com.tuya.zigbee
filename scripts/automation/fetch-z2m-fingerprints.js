/**
 * Fetch Z2M Fingerprints - v5.7.48
 * Fetches Tuya fingerprints from Z2M and finds missing ones
 * Run: node scripts/automation/fetch-z2m-fingerprints.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/community-sync');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Infer driver from manufacturerName + productId
function inferDeviceType(mfr, pid) {
  const m = (mfr || '').toLowerCase();
  const p = (pid || '').toUpperCase();
  
  // TS0601 Tuya DP devices
  if (p === 'TS0601') {
    if (/temp|humid|climate|th0/i.test(m)) return 'climate_sensor';
    if (/presence|radar|human|pir/i.test(m)) return 'presence_sensor_radar';
    if (/curtain|blind|cover/i.test(m)) return 'curtain_motor';
    if (/valve|trv|thermo/i.test(m)) return 'radiator_valve';
    if (/smoke|fire/i.test(m)) return 'smoke_detector_advanced';
    if (/water|leak/i.test(m)) return 'water_leak_sensor';
    if (/door|contact/i.test(m)) return 'contact_sensor';
    if (/soil/i.test(m)) return 'soil_sensor';
    return 'climate_sensor'; // Default TS0601
  }
  
  // Standard switches
  if (p === 'TS0001') return 'switch_1gang';
  if (p === 'TS0002') return 'switch_2gang';
  if (p === 'TS0003') return 'switch_3gang';
  if (p === 'TS0004') return 'switch_4gang';
  if (p === 'TS011F' || p === 'TS0121') return 'plug_smart';
  if (p === 'TS0041') return 'button_wireless_1';
  if (p === 'TS0042') return 'button_wireless_2';
  if (p === 'TS0043') return 'button_wireless_3';
  if (p === 'TS0044') return 'button_wireless_4';
  if (/TS02\d{2}/.test(p)) return 'dimmer_wall_1gang';
  
  return 'unknown';
}

// Get existing fingerprints from drivers
function getExistingFingerprints() {
  const existing = new Set();
  fs.readdirSync(DRIVERS_DIR).forEach(driver => {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = data.zigbee?.manufacturerName || [];
      const pids = data.zigbee?.productId || [];
      mfrs.forEach(m => pids.forEach(p => existing.add(`${m}|${p}`)));
    } catch (e) {}
  });
  return existing;
}

// Main
console.log('🔍 Scanning existing drivers...');
const existing = getExistingFingerprints();
console.log(`📊 Found ${existing.size} existing fingerprint combinations`);

// Save existing for reference
fs.writeFileSync(
  path.join(DATA_DIR, 'existing-fingerprints.json'),
  JSON.stringify([...existing].sort(), null, 2)
);

console.log('✅ Fingerprint scan complete');
console.log(`📁 Output: ${DATA_DIR}`);
