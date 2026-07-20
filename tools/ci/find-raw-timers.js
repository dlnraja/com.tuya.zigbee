#!/usr/bin/env node
// P76.3: Find drivers using raw setTimeout/setInterval (not safe variant)
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
    // Match setTimeout( or setInterval( not preceded by safe./clear/this. etc.
    for (const fn of ['setTimeout', 'setInterval']) {
      const re = new RegExp('\\b' + fn + '\\s*\\(', 'g');
      let m;
      while ((m = re.exec(line)) !== null) {
        const idx = m.index;
        const prefix = line.substring(Math.max(0, idx - 15), idx);
        if (!/safe\.$/.test(prefix) && !/clear[A-Z]?\.$/.test(prefix) && !/this\.$/.test(prefix) && !/self\.$/.test(prefix)) {
          raws.push({ line: i + 1, fn, content: line.trim() });
        }
      }
    }
  }
  if (raws.length > 0) list.push({ driver: d, raws });
}
console.log(`Drivers with raw timers: ${list.length}`);
for (const item of list) {
  console.log(`  ${item.driver}: ${item.raws.length} calls`);
  for (const r of item.raws.slice(0, 2)) {
    console.log(`    L${r.line} ${r.fn}: ${r.content.substring(0, 90)}`);
  }
}
