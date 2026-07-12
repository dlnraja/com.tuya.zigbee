#!/usr/bin/env node
// verify-icons.js
const fs = require('fs');
const path = require('path');

console.log('=== ICON VERIFICATION ===\n');

const targets = ['door_sensor', 'thermostat'];
for (const d of targets) {
  const dir = 'drivers/' + d + '/assets';
  console.log('---', d, '---');
  if (!fs.existsSync(dir)) { console.log('  MISSING dir'); continue; }
  // SVG
  const svg = path.join(dir, 'icon.svg');
  if (fs.existsSync(svg)) {
    const c = fs.readFileSync(svg, 'utf8');
    const vb = (c.match(/viewBox="([^"]+)"/) || [])[1];
    const hasMoji = ['Ǹ', 'Ǭ', 'Ǡ', 'Ǧ', 'Ã©', 'Ã¨', '��'].some(m => c.includes(m));
    console.log('  icon.svg: viewBox=' + (vb || '?') + ', ' + c.length + ' bytes, mojibake=' + hasMoji);
  } else {
    console.log('  icon.svg MISSING');
  }
  // PNGs
  for (const f of ['small.png', 'large.png']) {
    const fp = path.join(dir, 'images', f);
    if (fs.existsSync(fp)) {
      const buf = fs.readFileSync(fp);
      if (buf[0] === 0x89 && buf[1] === 0x50) {
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        console.log('  ' + f + ': ' + w + 'x' + h + ', ' + buf.length + ' bytes');
      } else {
        console.log('  ' + f + ': INVALID PNG');
      }
    } else {
      console.log('  ' + f + ': MISSING');
    }
  }
}
