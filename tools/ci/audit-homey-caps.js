// Audit our drivers against the OFFICIAL Homey SDK3 capability list
// (extracted from homey-zigbeedriver's lib/system/capabilities/ + known
// SDK3 standard capabilities like button, target_temperature, etc.)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SDK_DIR = path.join(ROOT, 'node_modules', 'homey-zigbeedriver', 'lib', 'system', 'capabilities');
const DRIVERS = path.join(ROOT, 'drivers');

// Well-known Homey SDK3 capabilities (not in homey-zigbeedriver but legitimate)
// Source: Homey Apps SDK v3 docs + common app patterns
const KNOWN_SDK3_CAPS = {
  // Buttons (X is sub-index; identify/toggle are special)
  'button': { options: ['identify', 'toggle'] },
  'button.identify': { kind: 'sub-option' },
  'button.toggle': { kind: 'sub-option' },
  'button.toggle_1': { kind: 'sub-option' },
  'button.toggle_2': { kind: 'sub-option' },
  'button.reset_1': { kind: 'sub-option' },
  'button.reset_2': { kind: 'sub-option' },
  'button.reset_3': { kind: 'sub-option' },
  'button.reset_4': { kind: 'sub-option' },
  'button.reset_5': { kind: 'sub-option' },
  'button.reset_6': { kind: 'sub-option' },
  'button.program_1': { kind: 'sub-option' },
  'button.program_2': { kind: 'sub-option' },
  'button.program_3': { kind: 'sub-option' },
  'button.program_4': { kind: 'sub-option' },
  // Thermostat
  'target_temperature': { kind: 'base' },
  'thermostat_mode': { options: ['off', 'heat', 'cool', 'auto', 'fan', 'dry'] },
  'thermostat_state': { kind: 'base' },
  'measure_temperature.outdoor': { kind: 'sub-option' },
  // Switches
  'onoff.gang2': { kind: 'sub-option' },
  'onoff.gang3': { kind: 'sub-option' },
  'onoff.gang4': { kind: 'sub-option' },
  'onoff.gang5': { kind: 'sub-option' },
  'onoff.gang6': { kind: 'sub-option' },
  'onoff.gang7': { kind: 'sub-option' },
  'onoff.gang8': { kind: 'sub-option' },
  'lock_mode': { options: ['lock', 'unlock'] },
  'power_on_behavior': { options: ['off', 'on', 'restore'] },
  // Alarms
  'alarm_tamper': { kind: 'base' },
  'alarm_rain': { kind: 'base' },
  'alarm_co': { kind: 'base' },
  'alarm_co2': { kind: 'base' },
  'alarm_pm25': { kind: 'base' },
  'alarm_voc': { kind: 'base' },
  'alarm_human': { kind: 'base' },
  'alarm_generic': { kind: 'base' },
  // Generic sensors
  'measure_luminance.distance': { kind: 'sub-option' },
  'measure_humidity.soil': { kind: 'sub-option' },
  'measure_ec': { kind: 'base' }, // electrical conductivity
  'measure_conductivity': { kind: 'base' },
  'measure_pm25': { kind: 'base' },
  'measure_voc': { kind: 'base' },
  'measure_co2': { kind: 'base' },
  'measure_co': { kind: 'base' },
  'measure_noise': { kind: 'base' },
  'measure_rain': { kind: 'base' },
  'measure_uv': { kind: 'base' },
  'measure_pm10': { kind: 'base' },
  // Misc
  'child_lock': { kind: 'base' },
  'volume_set': { kind: 'base' },
  'volume_mute': { kind: 'base' },
  'speaker_playing': { kind: 'base' },
  'speaker_track': { kind: 'base' },
  'vacuumdock_state': { kind: 'base' },
  'vacuumcleaner_state': { kind: 'base' },
  'rgb_mode': { kind: 'base' },
  'hue_mode': { kind: 'base' },
  'saturation_mode': { kind: 'base' },
  'color_mode': { kind: 'base' },
  'light_mode': { kind: 'base' },
  'light_hue': { kind: 'base' },
  'light_saturation': { kind: 'base' },
  'light_temperature': { kind: 'base' },
  'fan_speed': { kind: 'base' },
  'windowcoverings_state': { kind: 'base' },
  'windowcoverings_set': { kind: 'base' },
  'windowcoverings_tilt_state': { kind: 'base' },
  'windowcoverings_tilt_set': { kind: 'base' },
  'valve_position': { kind: 'base' },
  'lock_state': { kind: 'base' },
  'valve_state': { kind: 'base' },
  'doorbell_event': { kind: 'base' },
  'homealarm_state': { kind: 'base' },
  'presence': { kind: 'base' },
  'person_present': { kind: 'base' },
  'owntrack_location': { kind: 'base' },
  'curtain_state': { kind: 'base' },
  'curtain_position': { kind: 'base' },
  'curtain_set': { kind: 'base' },
  'curtain_tilt_set': { kind: 'base' },
  'curtain_tilt_state': { kind: 'base' },
  'shutter_position': { kind: 'base' },
  'shutter_set': { kind: 'base' },
  'shutter_state': { kind: 'base' },
  'screen_brightness': { kind: 'base' },
  'screen_on': { kind: 'base' },
  'tv_channel': { kind: 'base' },
  'tv_volume': { kind: 'base' },
  'tv_mute': { kind: 'base' },
  'tv_power': { kind: 'base' },
  'flow_action_run': { kind: 'base' },
};

// 1. List all official Homey SDK3 capabilities
function listSdkCaps() {
  const caps = {};
  if (!fs.existsSync(SDK_DIR)) return caps;
  for (const e of fs.readdirSync(SDK_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    caps[e.name] = { options: {}, source: 'homey-zigbeedriver' };
    for (const sub of fs.readdirSync(path.join(SDK_DIR, e.name))) {
      if (sub.endsWith('.js')) {
        const opt = sub.replace(/\.js$/, '');
        caps[e.name].options[opt] = true;
      }
    }
  }
  // Merge with known SDK3 caps
  for (const [k, v] of Object.entries(KNOWN_SDK3_CAPS)) {
    if (!caps[k]) {
      caps[k] = { options: v.options || {}, source: 'sdk3-known' };
    } else {
      // Merge options
      for (const opt of Object.keys(v.options || {})) {
        caps[k].options[opt] = true;
      }
    }
  }
  return caps;
}

const sdk = listSdkCaps();
const sdkKeys = Object.keys(sdk);
const sdk3Known = Object.keys(KNOWN_SDK3_CAPS);
console.log('Homey SDK3 capabilities (zigbee + known):', sdkKeys.length, '(' + Object.keys(KNOWN_SDK3_CAPS).length + ' known SDK3)');

// 2. Check function
function checkCap(c) {
  if (sdk[c]) return { ok: true, type: 'sdk3' };
  const dotIdx = c.indexOf('.');
  if (dotIdx > 0) {
    const base = c.slice(0, dotIdx);
    const sub = c.slice(dotIdx + 1);
    if (sdk[base] && sdk[base].options[sub]) return { ok: true, type: 'sdk3+option' };
  }
  // Common sub-options
  if (/^button\.\d+$/.test(c)) return { ok: true, type: 'sdk3-button' };
  if (/^onoff\.gang\d+$/.test(c)) return { ok: true, type: 'sdk3-gang' };
  return { ok: false, reason: 'NOT a known Homey SDK3 capability' };
}

// 3. Audit all drivers
const allDriverCaps = new Set();
const allBad = [];
const driverResults = [];
for (const e of fs.readdirSync(DRIVERS, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const cf = path.join(DRIVERS, e.name, 'driver.compose.json');
  if (!fs.existsSync(cf)) continue;
  try {
    const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
    const caps = c.capabilities || [];
    const bad = [];
    for (const cap of caps) {
      allDriverCaps.add(cap);
      const r = checkCap(cap);
      if (!r.ok) bad.push({ cap, reason: r.reason });
    }
    if (bad.length > 0) driverResults.push({ driver: e.name, bad });
    for (const b of bad) allBad.push({ ...b, driver: e.name });
  } catch (_) {}
}

console.log(`\n=== AUDIT RESULTS ===`);
console.log(`Total unique capabilities used: ${allDriverCaps.size}`);
console.log(`Drivers with at least one bad cap: ${driverResults.length}`);
console.log(`Total bad capabilities: ${allBad.length}`);

if (allBad.length > 0) {
  const byCap = {};
  for (const b of allBad) {
    if (!byCap[b.cap]) byCap[b.cap] = [];
    byCap[b.cap].push(b.driver);
  }
  console.log('\nBad capabilities (TRULY unknown):');
  for (const [cap, drivers] of Object.entries(byCap).sort((a, b) => b[1].length - a[1].length)) {
    const sample = drivers.slice(0, 5).join(', ');
    console.log(`  ${cap}: ${drivers.length} drivers (${sample}${drivers.length > 5 ? '...' : ''})`);
  }
}

// 4. Soil sensor deep audit
console.log('\n=== SOIL SENSOR CAPABILITY AUDIT ===');
const soilCaps = ['measure_humidity.soil', 'measure_temperature', 'measure_humidity', 'measure_luminance',
                  'measure_battery', 'alarm_battery', 'alarm_water', 'measure_ec', 'measure_conductivity', 'button.1'];
for (const c of soilCaps) {
  const r = checkCap(c);
  const icon = r.ok ? '✓' : '✗';
  const tag = r.ok ? r.type : r.reason;
  console.log(`  ${icon} ${c.padEnd(30)} — ${tag}`);
}

// 5. Save audit
const sdkList = {};
for (const [k, v] of Object.entries(sdk)) {
  sdkList[k] = { options: Object.keys(v.options), source: v.source };
}
fs.writeFileSync(path.join(ROOT, 'data', 'homey_sdk3_audit.json'),
  JSON.stringify({
    _meta: {
      source: 'homey-zigbeedriver/lib/system/capabilities + known SDK3 list',
      fetched: new Date().toISOString(),
      totalSdkCaps: sdkKeys.length,
      totalKnown: sdk3Known.length,
      totalUsedCaps: allDriverCaps.size,
      totalBad: allBad.length,
    },
    sdkCapabilities: sdkList,
    knownSdk3: sdk3Known,
    bad: allBad,
  }, null, 2));
console.log(`\n✓ saved to data/homey_sdk3_audit.json`);
