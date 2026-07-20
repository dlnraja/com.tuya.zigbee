#!/usr/bin/env node
// P76.3 v2: Find drivers using GLOBAL setTimeout/setInterval (not this.homey, not safe variant)
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
  const raws = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const fn of ['setTimeout', 'setInterval']) {
      const re = new RegExp('(?<![a-zA-Z._])' + fn + '\\s*\\(', 'g');
      let m;
      while ((m = re.exec(line)) !== null) {
        // Skip if preceded by . (e.g. this.homey.setTimeout, safe.setTimeout)
        const before = line.substring(Math.max(0, m.index - 1), m.index);
        if (before === '.') continue;
        // Skip clear/this/safe prefixed
        raws.push({ line: i + 1, fn, content: line.trim() });
      }
    }
  }
  if (raws.length > 0) list.push({ driver: d, raws });
}
console.log(`Drivers with GLOBAL (not homey/safe) timers: ${list.length}`);
for (const item of list) {
  console.log(`  ${item.driver}: ${item.raws.length} calls`);
  for (const r of item.raws.slice(0, 3)) {
    console.log(`    L${r.line} ${r.fn}: ${r.content.substring(0, 100)}`);
  }
}
