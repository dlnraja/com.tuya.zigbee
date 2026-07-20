#!/usr/bin/env node
// P76.8 v2: Check if base class has safeSetCapabilityValue
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const missing = [];
for (const d of drivers) {
  const composeFile = path.join(DRIVERS, d, 'driver.compose.json');
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(composeFile) || !fs.existsSync(devFile)) continue;
  const c = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  if (!(c.capabilities || []).some(x => x === 'measure_battery' || x === 'alarm_battery')) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  if (/safeSetCapabilityValue/.test(dev)) continue; // already has it
  // Check base class
  const requires = [...dev.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  let baseHasSafeSet = false;
  for (const req of requires) {
    let resolved;
    if (req.startsWith('.')) {
      resolved = path.resolve(path.dirname(devFile), req);
      if (fs.existsSync(resolved + '.js')) {
        resolved = resolved + '.js';
      } else if (fs.existsSync(resolved + '/index.js')) {
        resolved = resolved + '/index.js';
      } else continue;
    } else continue;
    try {
      const content = fs.readFileSync(resolved, 'utf8');
      if (/safeSetCapabilityValue/.test(content)) {
        baseHasSafeSet = true;
        break;
      }
    } catch {}
  }
  if (!baseHasSafeSet) {
    missing.push(d);
  }
}
console.log(`Battery drivers missing safeSet (device.js AND base class): ${missing.length}`);
for (const d of missing) console.log(`  ${d}`);
