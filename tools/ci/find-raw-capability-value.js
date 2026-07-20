#!/usr/bin/env node
// P76.2: Find drivers using raw setCapabilityValue (not safe variant)
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const list = [];
for (const d of drivers) {
  const file = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  // Find raw setCapabilityValue (not preceded by safe., set., async, etc.)
  const matches = content.match(/(?<!safe\.)setCapabilityValue\s*\(/g) || [];
  if (matches.length > 0) {
    list.push({ driver: d, count: matches.length });
  }
}
list.sort((a, b) => b.count - a.count);
console.log(`Drivers with raw setCapabilityValue: ${list.length}`);
for (const item of list) {
  console.log(`  ${item.driver}: ${item.count} calls`);
}
