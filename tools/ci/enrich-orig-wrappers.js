#!/usr/bin/env node
// P77.3: Add orig() wrapper to button drivers that lack it
// The orig() pattern preserves the original function so SDK3 auto-registration
// still works for capabilities that aren't manually handled.

const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');

const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const button = [];
for (const d of drivers) {
  if (!/button|remote|scene|knob|switch.*button/i.test(d)) continue;
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(devFile)) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  if (/orig\(\.\.\.args\)|orig\.call\(/.test(dev)) continue; // already has it
  if (!/zclNode|onZigBeeMessage|cluster\.on|cmdOn|cmdOff|registerCapabilityListener/.test(dev)) continue;
  button.push(d);
}

console.log(`Button drivers needing orig() wrapper: ${button.length}`);
for (const d of button) console.log(`  ${d}`);
