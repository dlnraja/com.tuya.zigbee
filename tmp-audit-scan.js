'use strict';
const fs = require('fs');
const path = require('path');

function walk(d, pred, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'obsolete') continue;
      walk(p, pred, acc);
    } else if (pred(e.name, p)) acc.push(p);
  }
  return acc;
}

// 1) Bare ZigBeeDevice drivers (import homey-zigbeedriver, no Tuya/Unified base)
const bases = /TuyaZigbeeDevice|UnifiedSwitchBase|UnifiedSensorBase|UnifiedPlugBase|UnifiedLightBase|UnifiedCoverBase|UnifiedThermostatBase|BaseUnifiedDevice|TuyaSpecificClusterDevice|TuyaZigBeeLightDevice|UniversalZigbeeDevice|ZigBeeLightDevice|WallTouchDevice|ButtonDevice|SwitchDevice|BaseTuyaDPDevice/;
const bare = [];
for (const f of walk('drivers', (n) => n === 'device.js')) {
  const s = fs.readFileSync(f, 'utf8');
  const importsZig = /require\(['"]homey-zigbeedriver['"]\)/.test(s);
  if (!importsZig) continue;
  if (bases.test(s)) continue;
  const m = s.match(/class\s+\w+\s+extends\s+([^{\n]+)/);
  bare.push({ f, extends: (m && m[1].trim()) || '?' });
}
console.log('=== BARE_ZIGBEE_DEVICE', bare.length);
bare.forEach((x) => console.log(x.extends, '|', x.f));

// 2) Raw setTimeout in drivers/*.js (device/driver)
const rawTimers = [];
for (const f of walk('drivers', (n) => n.endsWith('.js'))) {
  const s = fs.readFileSync(f, 'utf8');
  const lines = s.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!/setTimeout\s*\(/.test(line)) return;
    if (/safeSetTimeout|homey\.setTimeout|this\.homey\.setTimeout|req\.setTimeout|scheduler\.setTimeout|this\.setTimeout|clearTimeout|_setTimeout|ZigbeeTimeout|SafeTimer/.test(line)) return;
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return;
    rawTimers.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}
console.log('\n=== RAW_SETTIMEOUT_DRIVERS', rawTimers.length);
rawTimers.slice(0, 60).forEach((l) => console.log(l));

// 3) titleFormatted with [[device]] — check key is titleFormatted
function scanTitleFormatted(root) {
  const hits = [];
  for (const f of walk(root, (n) => n.endsWith('.json'))) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const stack = [{ obj: j, path: '' }];
    while (stack.length) {
      const { obj, path: pth } = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (Array.isArray(obj)) {
        obj.forEach((v, i) => stack.push({ obj: v, path: `${pth}[${i}]` }));
        continue;
      }
      if (obj.titleFormatted && typeof obj.titleFormatted === 'object') {
        const blob = JSON.stringify(obj.titleFormatted);
        if (blob.includes('[[device]]')) {
          hits.push({ f, id: obj.id || pth, sample: blob.slice(0, 100) });
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object') stack.push({ obj: v, path: `${pth}.${k}` });
      }
    }
  }
  return hits;
}
const tfDrivers = scanTitleFormatted('drivers');
const tfCompose = scanTitleFormatted('.homeycompose/flow');
console.log('\n=== TITLEFORMATTED_DEVICE_DRIVERS', tfDrivers.length);
tfDrivers.slice(0, 30).forEach((h) => console.log(h.f, h.id));
console.log('\n=== TITLEFORMATTED_DEVICE_COMPOSE', tfCompose.length);
tfCompose.slice(0, 40).forEach((h) => console.log(h.f, h.id));

// 4) Who requires HomeyCompensation / MultiProtocol / ensureIO
const requireHits = {
  HomeyCompensationLayer: [],
  MultiProtocolBatteryPercent: [],
  DeviceIOFacade: [],
  attachMultiProtocolBattery: [],
  ensureDeviceIO: [],
  wireCompensation: [],
  bootstrapUniversalLayers: [],
};
for (const f of walk('.', (n) => n.endsWith('.js'))) {
  if (f.includes('node_modules') || f.startsWith('tmp-')) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const k of Object.keys(requireHits)) {
    if (s.includes(k) && !f.replace(/\\/g, '/').includes(k.replace(/([A-Z])/g, ''))) {
      // skip self-definition noise lightly
      requireHits[k].push(f);
    }
  }
}
console.log('\n=== WIRING_COUNTS');
for (const [k, v] of Object.entries(requireHits)) {
  const uniq = [...new Set(v)].filter((p) => !p.includes('test') && !p.includes('reports') && !p.includes('docs'));
  console.log(k, 'code_refs', uniq.length);
  uniq.slice(0, 25).forEach((p) => console.log(' ', p));
}

// 5) Critical tests inventory
const crit = walk('test/critical', (n) => n.endsWith('.js') || n.endsWith('.test.js'));
console.log('\n=== CRITICAL_TESTS', crit.length);
crit.forEach((f) => console.log(f));

// 6) measure_battery setCapabilityValue in lib (bypass)
const bypass = [];
for (const f of walk('lib', (n) => n.endsWith('.js'))) {
  const s = fs.readFileSync(f, 'utf8');
  if (!/setCapabilityValue\s*\(/.test(s)) continue;
  const lines = s.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/setCapabilityValue\s*\(/.test(line) && /measure_battery|alarm_battery|measure_power|meter_power|measure_current|measure_voltage/.test(line)) {
      if (/safeSetCapabilityValue|_safeSet|_safeSetCap|safeSetDeviceCapability/.test(line)) return;
      bypass.push(`${f}:${i + 1}: ${line.trim().slice(0, 140)}`);
    }
  });
}
console.log('\n=== CAP_BYPASS_ENERGY_BATTERY', bypass.length);
bypass.forEach((l) => console.log(l));
