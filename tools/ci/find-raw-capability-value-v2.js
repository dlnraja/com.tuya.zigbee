#!/usr/bin/env node
// P76.2 v2: Find ACTUAL raw setCapabilityValue (not super, not this.setCapabilityValue)
// P76.2 fix: use line-by-line analysis to find calls NOT in the safe set
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
  const lines = content.split('\n');
  let rawCalls = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match setCapabilityValue( not preceded by safe., super., this., SDK3 chain, etc.
    // Negative lookbehind doesn't work in JS regex on all engines, so we do post-filter
    if (/setCapabilityValue\s*\(/.test(line)) {
      // Strip whitespace and look at prefix
      const idx = line.indexOf('setCapabilityValue');
      const prefix = line.substring(Math.max(0, idx - 15), idx);
      // Skip if preceded by safe. super. this. (SDK3 method)
      if (!/safe\.$/.test(prefix) && !/super\.$/.test(prefix) && !/this\.$/.test(prefix) && !/that\.$/.test(prefix)) {
        rawCalls.push({ line: i + 1, content: line.trim() });
      }
    }
  }
  if (rawCalls.length > 0) {
    list.push({ driver: d, calls: rawCalls });
  }
}
console.log(`Drivers with truly raw setCapabilityValue: ${list.length}`);
for (const item of list) {
  console.log(`\n  ${item.driver}: ${item.calls.length} calls`);
  for (const c of item.calls.slice(0, 3)) {
    console.log(`    L${c.line}: ${c.content.substring(0, 100)}`);
  }
}
