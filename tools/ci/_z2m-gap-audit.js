// P64.13 — Cross-reference: audit all our drivers against Z2M exposes.
// Find which of our 431 drivers are missing Z2M exposes.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const cache = require(path.join(ROOT, 'data', 'z2m_herdsman_cache.json'));

// Build byMfr: lowercase → set of Z2M exposes
const z2mByMfr = {};
for (const d of cache.devices) {
  for (const m of (d.mfrs || [])) {
    const mfrLower = m.toLowerCase();
    if (!z2mByMfr[mfrLower]) z2mByMfr[mfrLower] = new Set();
    for (const e of d.exposes) z2mByMfr[mfrLower].add(e);
  }
}

// Walk all our drivers
const driversDir = path.join(ROOT, 'drivers');
const driverMfrs = {};
for (const dname of fs.readdirSync(driversDir, { withFileTypes: true })) {
  if (!dname.isDirectory()) continue;
  const cf = path.join(driversDir, dname.name, 'driver.compose.json');
  if (!fs.existsSync(cf)) continue;
  try {
    const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
    const mfrs = (c.zigbee?.manufacturerName || []);
    const caps = new Set(c.capabilities || []);
    for (const m of mfrs) {
      const mfrLower = m.toLowerCase();
      if (!driverMfrs[mfrLower]) driverMfrs[mfrLower] = new Set();
      driverMfrs[mfrLower].add(dname.name);
      driverMfrs[mfrLower].caps = caps; // share caps
    }
  } catch (_) {}
}

// expose → likely Homey capability
const exposeToCap = {
  battery: ['measure_battery', 'alarm_battery'],
  battery_voltage: ['measure_voltage'],
  occupancy: ['alarm_motion', 'alarm_human'],
  presence: ['alarm_motion', 'alarm_human'],
  contact: ['alarm_contact'],
  water_leak: ['alarm_water'],
  smoke: ['alarm_smoke'],
  gas: ['alarm_gas'],
  temperature: ['measure_temperature'],
  humidity: ['measure_humidity'],
  illuminance: ['measure_luminance'],
  voltage: ['measure_voltage'],
  current: ['measure_current'],
  power: ['measure_power'],
  energy: ['meter_power', 'measure_power'],
  switch: ['onoff'],
  light: ['onoff', 'dim'],
  brightness: ['dim'],
  lock: ['locked', 'lockstate'],
  tamper: ['alarm_tamper'],
  action: ['alarm_motion'],
  sos: ['alarm_generic', 'alarm_sos'],
  button: ['alarm_motion', 'button'],
  vibration: ['alarm_tamper', 'alarm_vibration'],
  soil_moisture: ['measure_humidity', 'measure_soil_moisture'],
  eco2: ['measure_co2'],
  voc: ['measure_voc'],
  pm25: ['measure_pm25'],
  noise: ['measure_noise'],
  pressure: ['measure_pressure'],
  distance: ['measure_luminance.distance', 'measure_distance'],
  // New P64.13 mappings
  co2: ['measure_co2'],
  co: ['measure_co'],
  formaldehyde: ['measure_formaldehyde'],
  rain: ['measure_rain'],
  uv: ['measure_uv'],
  pm10: ['measure_pm10'],
  fan_speed: ['dim'],
  valve_position: ['valve_position'],
  vacuumcleaner_state: ['vacuumcleaner_state'],
  vacuumdock_state: ['vacuumdock_state'],
  windowcoverings_set: ['windowcoverings_set'],
  windowcoverings_state: ['windowcoverings_state'],
  windowcoverings_tilt_set: ['windowcoverings_tilt_set'],
  child_lock: ['child_lock'],
  volume_set: ['volume_set'],
  power_on_behavior: ['power_on_behavior'],
  thermostat_mode: ['thermostat_mode'],
  target_temperature: ['target_temperature'],
  thermostat_state: ['thermostat_state'],
  energy: ['meter_power'],
};

// Custom: all special expose names that map to a cap with same name
const PASSTHROUGH = new Set([
  'occupancy', 'presence', 'contact', 'water_leak', 'smoke', 'gas',
  'temperature', 'humidity', 'illuminance', 'battery', 'battery_voltage',
  'voltage', 'current', 'power', 'energy', 'switch', 'lock', 'tamper',
  'action', 'sos', 'button', 'vibration', 'soil_moisture', 'distance',
  'co2', 'co', 'formaldehyde', 'rain', 'uv', 'pm10', 'pm25',
  'child_lock', 'volume_set', 'power_on_behavior', 'thermostat_mode',
  'target_temperature', 'thermostat_state',
  'valve_position', 'valve_state', 'lock_state',
  'windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set',
  'fan_speed', 'vacuumcleaner_state', 'vacuumdock_state',
  'noise', 'pressure', 'voc', 'eco2',
]);

// Find all our MFRs and check for Z2M expose gaps
const gapReport = [];
for (const [mfrLower, driverSet] of Object.entries(driverMfrs)) {
  const z2mExposes = z2mByMfr[mfrLower];
  if (!z2mExposes || z2mExposes.size === 0) continue; // MFR not in Z2M

  const driverCaps = new Set();
  // Get caps from the driver
  for (const dname of driverSet) {
    const cf = path.join(driversDir, dname, 'driver.compose.json');
    if (fs.existsSync(cf)) {
      const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const cap of (c.capabilities || [])) driverCaps.add(cap);
    }
  }

  // For each Z2M expose, check if we have the matching capability
  for (const expose of z2mExposes) {
    // Skip generic passes
    if (PASSTHROUGH.has(expose) && driverCaps.has('measure_' + expose.replace('measure_', '').replace('.', '_'))) continue;
    // Get required caps
    const requiredCaps = exposeToCap[expose] || [];
    if (requiredCaps.length === 0) continue; // unknown expose, skip

    const hasAny = requiredCaps.some(c => driverCaps.has(c));
    if (!hasAny) {
      gapReport.push({
        mfr: mfrLower,
        drivers: [...driverSet],
        expose,
        suggestedCaps: requiredCaps,
      });
    }
  }
}

console.log('=== Z2M EXPOSE GAP REPORT ===');
console.log(`Total MFRs in our drivers: ${Object.keys(driverMfrs).length}`);
console.log(`Total MFRs in Z2M: ${Object.keys(z2mByMfr).length}`);
console.log(`Gap report: ${gapReport.length} cases\n`);

// Group by expose to see common gaps
const byExpose = {};
for (const g of gapReport) {
  if (!byExpose[g.expose]) byExpose[g.expose] = [];
  byExpose[g.expose].push(g);
}

console.log('Gaps by Z2M expose (sorted by count):');
for (const [expose, list] of Object.entries(byExpose).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${expose}: ${list.length} MFRs (drivers: ${[...new Set(list.flatMap(g => g.drivers))].slice(0, 5).join(', ')})`);
}

console.log('\nFull gap report (first 30):');
for (const g of gapReport.slice(0, 30)) {
  console.log(`  ${g.mfr} → ${g.expose} (drivers: ${g.drivers.join(', ')}; suggest: ${g.suggestedCaps.join(' or ')})`);
}

// Save report
fs.writeFileSync(path.join(ROOT, 'data', 'z2m_expose_gap_report.json'),
  JSON.stringify({
    _meta: {
      totalMfrsInDrivers: Object.keys(driverMfrs).length,
      totalMfrsInZ2M: Object.keys(z2mByMfr).length,
      totalGaps: gapReport.length,
      byExpose: Object.fromEntries(Object.entries(byExpose).map(([k, v]) => [k, v.length])),
    },
    gaps: gapReport,
  }, null, 2));
console.log(`\n✓ saved to data/z2m_expose_gap_report.json`);
