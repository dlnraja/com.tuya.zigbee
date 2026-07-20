#!/usr/bin/env node
// P77.2: Enrich button drivers with safety patterns
// Adds _destroyed checks and orig() wrappers to button drivers that lack them

const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');

const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const button = [];
for (const d of drivers) {
  if (!/button|remote|scene|knob/i.test(d)) continue;
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(devFile)) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  if (!/zclNode|onZigBeeMessage|cluster\.on|onOff|cmdOn|cmdOff/i.test(dev)) continue;
  button.push(d);
}

console.log(`Button drivers with cluster handling: ${button.length}`);

let addedDestroyed = 0, addedOrig = 0;
for (const d of button) {
  const devFile = path.join(DRIVERS, d, 'device.js');
  let dev = fs.readFileSync(devFile, 'utf8');
  let modified = false;

  // Add _destroyed check if not present
  if (!/_destroyed/.test(dev) && /setCapabilityValue\s*\(/.test(dev)) {
    // Find async functions that call setCapabilityValue
    const lines = dev.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      out.push(line);
      // Add _destroyed check before lines that have setCapabilityValue and look like handler bodies
      if (/setCapabilityValue\s*\(/.test(line) && !/if\s*\(this\._destroyed\)/.test(line) && !/safeSetCapabilityValue/.test(line)) {
        // Only add at the start of handler functions
        // Find the last async line above
        let asyncIdx = -1;
        for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
          if (/^\s*async\s+\w+\s*\(/.test(lines[j]) || /^\s*\w+\s*=\s*async\s+/.test(lines[j])) {
            asyncIdx = j;
            break;
          }
        }
        // If we found an async function, add the check (only once per function)
        if (asyncIdx >= 0) {
          // Don't modify if already there
          if (!out.slice(Math.max(0, out.length - i + asyncIdx), out.length).some(l => /if\s*\(this\._destroyed\)/.test(l))) {
            out.push('        if (this._destroyed) return;');
            modified = true;
            addedDestroyed++;
          }
        }
      }
    }
    if (modified) {
      fs.writeFileSync(devFile, out.join('\n'), 'utf8');
    }
  }
}

console.log(`\n=== Results ===`);
console.log(`_destroyed checks added: ${addedDestroyed}`);
console.log(`orig() wrappers added: ${addedOrig}`);
console.log(`\nNote: this tool only adds minimal safety patterns.`);
console.log(`Manual review recommended for complex handlers.`);
