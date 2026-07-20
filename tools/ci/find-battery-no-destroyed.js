#!/usr/bin/env node
// P76.4: Find battery drivers missing _destroyed check (potential crash)
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
console.log(`Battery drivers missing _destroyed check: ${battery.length}`);
for (const d of battery) console.log(`  ${d}`);
