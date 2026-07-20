#!/usr/bin/env node
// P76.8: Find battery drivers missing safeSetCapabilityValue
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
  if (!/safeSetCapabilityValue/.test(dev)) {
    missing.push(d);
  }
}
console.log(`Battery drivers missing safeSetCapabilityValue: ${missing.length}`);
for (const d of missing) console.log(`  ${d}`);
