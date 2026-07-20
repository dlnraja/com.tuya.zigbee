#!/usr/bin/env node
// P76.4 v2: Check if base class has _destroyed check
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const battery = [];
for (const d of drivers) {
  const composeFile = path.join(DRIVERS, d, 'driver.compose.json');
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(composeFile) || !fs.existsSync(devFile)) continue;
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  if (!(compose.capabilities || []).some(c => c === 'measure_battery' || c === 'alarm_battery')) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  if (!/_destroyed/.test(dev)) {
    battery.push(d);
  }
}

// For each, find the require'd base class file
const needsBaseClassCheck = [];
for (const d of battery) {
  const devFile = path.join(DRIVERS, d, 'device.js');
  const dev = fs.readFileSync(devFile, 'utf8');
  // Find require statements
  const requires = [...dev.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  let baseClassHasDestroy = false;
  for (const req of requires) {
    let resolved;
    if (req.startsWith('.')) {
      resolved = path.resolve(path.dirname(devFile), req);
      if (fs.existsSync(resolved + '.js')) {
        resolved = resolved + '.js';
      } else if (fs.existsSync(resolved + '/index.js')) {
        resolved = resolved + '/index.js';
      } else continue;
    } else continue; // skip node_modules
    try {
      const content = fs.readFileSync(resolved, 'utf8');
      if (/_destroyed/.test(content)) {
        baseClassHasDestroy = true;
        break;
      }
    } catch {}
  }
  if (!baseClassHasDestroy) {
    needsBaseClassCheck.push(d);
  }
}
console.log(`Battery drivers missing _destroyed in BOTH device.js AND base class: ${needsBaseClassCheck.length}`);
for (const d of needsBaseClassCheck) console.log(`  ${d}`);
