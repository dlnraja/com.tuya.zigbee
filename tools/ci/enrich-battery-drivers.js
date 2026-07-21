#!/usr/bin/env node
// P79.2: Enrich battery drivers - add UnifiedBatteryHandler to drivers
// that have measure_battery but don't have it yet.
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');

const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const targets = [];
for (const d of drivers) {
  const composeFile = path.join(DRIVERS, d, 'driver.compose.json');
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(composeFile) || !fs.existsSync(devFile)) continue;
  const c = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  if (!(c.capabilities || []).some(x => x === 'measure_battery' || x === 'alarm_battery')) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  // Skip if already has UnifiedBatteryHandler
  if (/UnifiedBatteryHandler/.test(dev)) continue;
  // Skip if device.js is a stub (very small file)
  if (dev.length < 200) continue;
  // Skip if it's a re-export
  if (dev.match(/module\.exports\s*=\s*require\s*\(/)) continue;
  targets.push(d);
}

console.log(`Battery drivers missing UnifiedBatteryHandler (excluding stubs): ${targets.length}`);
for (const d of targets.slice(0, 20)) console.log(`  ${d}`);
