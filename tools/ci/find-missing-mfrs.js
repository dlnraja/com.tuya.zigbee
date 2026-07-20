#!/usr/bin/env node
// P76.8: Find drivers missing manufacturerNames
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const missingMfrs = [];
const missingZigbee = [];
for (const d of drivers) {
  const composeFile = path.join(DRIVERS, d, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) continue;
  const c = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const mfrs = c.zigbee?.manufacturerName || [];
  if (mfrs.length === 0) missingMfrs.push(d);
  if (!c.zigbee) missingZigbee.push(d);
}
console.log(`Drivers missing mfrs: ${missingMfrs.length}`);
for (const d of missingMfrs) console.log(`  ${d}`);
console.log(`\nDrivers missing zigbee.compose: ${missingZigbee.length}`);
for (const d of missingZigbee) console.log(`  ${d}`);
