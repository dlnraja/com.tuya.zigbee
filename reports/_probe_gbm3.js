'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const drivers = fs.readdirSync(path.join(ROOT, 'drivers'));
const hits = [];
for (const id of drivers) {
  const fp = path.join(ROOT, 'drivers', id, 'driver.compose.json');
  if (!fs.existsSync(fp)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { continue; }
  const names = j.zigbee && j.zigbee.manufacturerName;
  if (!Array.isArray(names)) continue;
  if (names.some((m) => /gbm10jnj/i.test(String(m)))) hits.push(id);
}
console.log('compose claimants:', hits.join(', ') || '(none)');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
const e = m._TZ3000_gbm10jnj || m._tz3000_gbm10jnj;
console.log('mfs entry:', JSON.stringify(e));
