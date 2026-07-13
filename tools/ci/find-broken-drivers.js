// find-broken-drivers.js — find drivers missing manufacturerName
const fs = require('fs');
const path = require('path');

const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());

const broken = [];
for (const d of drivers) {
  const f = path.join(driversDir, d, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!data.zigbee) continue;
    if (!data.zigbee.manufacturerName) {
      broken.push({ driver: d, reason: 'missing manufacturerName' });
      continue;
    }
    if (!Array.isArray(data.zigbee.manufacturerName) || data.zigbee.manufacturerName.length === 0) {
      broken.push({ driver: d, reason: 'empty manufacturerName' });
    }
  } catch (e) {
    broken.push({ driver: d, reason: 'parse error: ' + e.message });
  }
}

console.log('=== BROKEN DRIVERS (missing manufacturerName) ===');
console.log('Total:', broken.length);
for (const b of broken) {
  console.log('  ' + b.driver + ' — ' + b.reason);
}

// Also check the "current" failure pattern that has many driver names
const detail = `manifest.drivers['air_purifier_contact'].zigbee should have required property 'manufacturerName' 
manifest.drivers['air_purifier_quality'].zigbee should have required property 'manufacturerName' 
manifest.drivers['button_wireless_switch'].zigbee should have required property 'manufacturerName' 
manifest.drivers['button_wireless_usb'].zigbee should have required property 'manufacturerName' 
manifest.drivers['climate_sensor_device'].zigbee should have required property 'manufacturerName' 
manifest.drivers['climate_sensor_gas'].zigbee should have required property 'manufacturerName'`;

const matches = detail.match(/manifest\.drivers\['([^']+)'\]/g) || [];
const driverNames = [...new Set(matches.map(m => m.match(/'([^']+)'/)[1]))];
console.log('\n=== DRIVERS IN FAILURE PATTERN 6 ===');
for (const d of driverNames) {
  const exists = fs.existsSync(path.join(driversDir, d, 'driver.compose.json'));
  console.log('  ' + d + (exists ? ' (exists)' : ' (NOT FOUND)'));
}
