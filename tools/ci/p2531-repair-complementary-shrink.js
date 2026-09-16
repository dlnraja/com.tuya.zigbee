'use strict';
/**
 * P2531 repair — restore shrunk drivers from HEAD, then APPEND OEM overlays
 * without case-collapsing the whole manufacturerName array (Homey needs dual cases).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

function restore(rel) {
  const buf = execSync(`git show HEAD:${rel}`, { cwd: ROOT, maxBuffer: 40e6 });
  fs.writeFileSync(path.join(ROOT, rel), buf);
  return JSON.parse(buf.toString('utf8'));
}

function hasInsensitive(list, want) {
  const k = String(want).toLowerCase();
  return (list || []).some((m) => String(m).toLowerCase() === k);
}

function appendOem(list, forms) {
  const out = Array.isArray(list) ? list.slice() : [];
  for (const f of forms) {
    if (!hasInsensitive(out, f)) out.push(f);
  }
  return out;
}

function oemTze(suffix) {
  return [
    `_TZE200_${suffix}`,
    `_TZE204_${suffix}`,
    `_TZE284_${suffix}`,
    `_tze200_${suffix}`,
    `_tze204_${suffix}`,
    `_tze284_${suffix}`,
  ];
}

{
  const rel = 'drivers/switch_1gang/driver.compose.json';
  const data = restore(rel);
  const before = (data.zigbee.manufacturerName || []).length;
  data.zigbee.manufacturerName = appendOem(data.zigbee.manufacturerName, oemTze('7tdtqgwv'));
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`);
  console.log('switch_1gang', before, '->', data.zigbee.manufacturerName.length);
}

{
  const rel = 'drivers/bed_sensor/driver.compose.json';
  const data = restore(rel);
  const before = (data.zigbee.manufacturerName || []).length;
  data.zigbee.manufacturerName = appendOem(data.zigbee.manufacturerName, oemTze('seq9cm6u'));
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`);
  console.log('bed_sensor', before, '->', data.zigbee.manufacturerName.length);
}

console.log('P2531 shrink repair OK (preserve dual-case generics)');
