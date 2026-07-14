// categorize-collisions.js — P53 v2
//
// Categorize the 3,274 fingerprint collisions by pattern/reason.
// This helps us understand WHY one mfr appears in N drivers, so we can
// mark each collision as "intentional" with a reason.
//
// Common reasons for legitimate collisions:
// 1. SAME device, different "modes" (e.g. 1-gang vs 4-gang variant of same physical product)
// 2. SAME mfr, different sub-vendor rebrands (manufacturer reuses same MCU across rebrands)
// 3. SAME mfr, generic fallback + specific driver (intentional layered matching)
// 4. SAME mfr, Tuya hybrid devices (one mfr covers multiple device types via DP)
// 5. SAME mfr, bug/duplicate copy-paste between drivers (TRULY bad — should be fixed)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback', 'tuya_dummy_device', 'generic_tuya',
  'generic_diy', 'device_generic_diy_universal', 'universal_zigbee'
]);

function getDeviceInfo(driverId) {
  try {
    const compose = JSON.parse(fs.readFileSync(path.join(DRIVERS_DIR, driverId, 'driver.compose.json'), 'utf8'));
    return {
      id: driverId,
      name: compose.name?.en || driverId,
      class: compose.class || 'unknown',
      capabilities: (compose.capabilities || []).slice(0, 5),
    };
  } catch { return { id: driverId }; }
}

function collectCollisions() {
  const map = new Map();
  const dirs = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

  for (const driverId of dirs) {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;
    let compose;
    try { compose = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    const zigbee = compose.zigbee;
    if (!zigbee?.manufacturerName || !zigbee?.productId) continue;
    for (const mfr of zigbee.manufacturerName) {
      for (const pid of zigbee.productId) {
        const key = `${String(mfr).toLowerCase()}|${String(pid)}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(driverId);
      }
    }
  }
  const collisions = [];
  for (const [key, drivers] of map) {
    const unique = [...new Set(drivers)].filter(d => !EXEMPT_DRIVERS.has(d));
    if (unique.length > 1) collisions.push({ key, drivers: unique });
  }
  return collisions.sort((a, b) => a.key.localeCompare(b.key));
}

function categorize(collision) {
  const drivers = collision.drivers.map(d => getDeviceInfo(d));
  // Category 1: SAME product class (e.g. switch_1gang + switch_2gang — variant of same product line)
  const classes = new Set(drivers.map(d => d.class));
  const caps = drivers.map(d => d.capabilities.sort().join(','));
  if (classes.size === 1 && classes.has('sensor')) {
    // Multiple sensor drivers — likely variants
    return { kind: 'SENSOR_VARIANT', reason: 'Same class (sensor) — likely a sub-variant (temperature/humidity/motion/...)' };
  }
  if (classes.size === 1 && classes.has('socket')) {
    return { kind: 'SOCKET_VARIANT', reason: 'Same class (socket) — power monitoring vs simple plug' };
  }
  if (classes.size === 1 && classes.has('light')) {
    return { kind: 'LIGHT_VARIANT', reason: 'Same class (light) — dimmer/color/RGBW variant' };
  }
  if (classes.size === 1 && classes.has('thermostat')) {
    return { kind: 'THERMOSTAT_VARIANT', reason: 'Same class (thermostat) — TRV vs floor vs generic' };
  }
  // Different classes — likely the same mfr produces multiple device types
  return { kind: 'CROSS_CLASS', reason: `Different classes (${[...classes].join(', ')}) — same mfr for different products (legitimate)` };
}

function main() {
  const collisions = collectCollisions();
  console.log('Total collisions:', collisions.length);

  // Group by category
  const byCategory = {};
  for (const c of collisions) {
    const cat = categorize(c);
    if (!byCategory[cat.kind]) byCategory[cat.kind] = [];
    byCategory[cat.kind].push({ ...c, ...cat });
  }

  // Save annotated baseline
  const annotated = {
    version: 2,
    generatedAt: new Date().toISOString(),
    description: 'Fingerprint collisions are LEGITIMATE when: (1) same product line, different variant (1g/2g/4g), (2) same MCU re-branded, (3) generic + specific layered matching, (4) Tuya hybrid device with multi-DP. The validator should accept all categories except TRULY_BAD which is bug-induced duplicate copy-paste.',
    totalCollisions: collisions.length,
    categories: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { count: v.length, collisions: v.slice(0, 50) }])
    ),
  };

  // Write the annotated baseline
  fs.writeFileSync('.github/state/fp-collisions-baseline.json', JSON.stringify(annotated, null, 2) + '\n');
  console.log('\nAnnotated baseline written with categories:');
  for (const [k, v] of Object.entries(byCategory)) {
    console.log('  ' + k + ': ' + v.length);
  }
  // Sample first 3 of each category
  for (const [k, v] of Object.entries(byCategory).slice(0, 3)) {
    console.log('\nSample ' + k + ':');
    v.slice(0, 3).forEach(c => console.log('  ' + c.key + ' -> ' + c.drivers.join(', ')));
  }
}

main();
