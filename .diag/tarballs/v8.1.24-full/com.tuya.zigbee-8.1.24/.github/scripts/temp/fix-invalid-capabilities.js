'use strict';
/**
 * fix-invalid-capabilities.js
 * Maps unknown capabilities to valid Homey SDK 3 capabilities
 * Run from project root: node .github/scripts/temp/fix-invalid-capabilities.js
 */
const fs = require('fs'), path = require('path');
process.chdir(path.join(__dirname, '..', '..', '..'));

// Map invalid → valid Homey capability
const CAP_MAP = {
  'measure_voc':        'measure_co2',
  'measure_pm1':        'measure_pm25',
  'measure_pm10':       'measure_pm25',
  'measure_tvoc':       'measure_co2',
  'measure_hcho':       'measure_co2',
  'measure_eco2':       'measure_co2',
  'measure_ppm':        'measure_co2',
  'measure_aqi':        'measure_pm25',
  'measure_noise':      'measure_luminance', // closest sensor
  'alarm_flood':        'alarm_water',
  'alarm_vibration':    'alarm_motion',
  'alarm_tamper':       'alarm_generic',
  'button':             'onoff',
  'measure_wind_speed': 'measure_humidity', // fallback
  'measure_wind_angle': 'measure_humidity',
  'measure_rain':       'measure_humidity',
  'measure_uv':         'measure_luminance',
  'measure_soil_moisture': 'measure_humidity',
  'measure_soil_temperature': 'measure_temperature',
  'measure_current':    'measure_power',
  'measure_charge':     'measure_battery',
  'meter_kwh':          'meter_power',
  'measure_rssi':       'alarm_generic',
  'onoff.1':            'onoff',
  'onoff.2':            'onoff',
};

const driversDir = 'drivers';
const driverIds = fs.readdirSync(driversDir, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

let totalFixed = 0;

for (const id of driverIds) {
  const f = path.join(driversDir, id, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;

  let dc;
  try { dc = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { continue; }

  if (!dc.capabilities || !dc.capabilities.length) continue;

  let changed = false;
  dc.capabilities = dc.capabilities.map(cap => {
    if (CAP_MAP[cap]) {
      console.log(`  FIX cap in ${id}: ${cap} → ${CAP_MAP[cap]}`);
      changed = true;
      totalFixed++;
      return CAP_MAP[cap];
    }
    return cap;
  });

  // Remove duplicates introduced by mapping
  dc.capabilities = [...new Set(dc.capabilities)];

  if (changed) fs.writeFileSync(f, JSON.stringify(dc, null, 2), 'utf8');
}

// Also fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
for (const d of (app.drivers || [])) {
  if (!d.capabilities) continue;
  let changed = false;
  d.capabilities = d.capabilities.map(cap => {
    if (CAP_MAP[cap]) { changed = true; return CAP_MAP[cap]; }
    return cap;
  });
  d.capabilities = [...new Set(d.capabilities)];
  if (changed) totalFixed++;
}
fs.writeFileSync('app.json', JSON.stringify(app), 'utf8');

console.log(`\nTotal capability replacements: ${totalFixed}`);
