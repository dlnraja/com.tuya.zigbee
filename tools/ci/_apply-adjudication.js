'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const { moves } = require(path.join(ROOT, '.github/state/adjudication-final.json'));
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));

function variants(base) {
  const m = String(base).match(/^(_t[zy][a-z0-9]+)_(.+)$/i);
  if (!m) {return [base];}
  return [...new Set([
    `${m[1].toLowerCase()}_${m[2].toLowerCase()}`,
    `${m[1].toUpperCase()}_${m[2].toUpperCase()}`,
    `${m[1].toUpperCase()}_${m[2].toLowerCase()}`,
    `${m[1].toLowerCase()}_${m[2].toUpperCase()}`
  ])];
}

let moved = 0;
for (const m of moves) {
  const target = m.mfr.toLowerCase();
  for (const from of m.from) {
    const p = path.join(ROOT, 'drivers', from, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    c.zigbee.manufacturerName = (c.zigbee.manufacturerName || [])
      .filter(x => String(x).toLowerCase() !== target);
    fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
  }
  const p2 = path.join(ROOT, 'drivers', m.to, 'driver.compose.json');
  if (!fs.existsSync(p2)) {continue;}
  const c2 = JSON.parse(fs.readFileSync(p2, 'utf8'));
  c2.zigbee = c2.zigbee || {};
  c2.zigbee.manufacturerName = c2.zigbee.manufacturerName || [];
  const set = new Set(c2.zigbee.manufacturerName.map(x => String(x).toLowerCase()));
  for (const v of variants(m.mfr)) {
    if (!set.has(v.toLowerCase())) {c2.zigbee.manufacturerName.push(v);}
  }
  fs.writeFileSync(p2, JSON.stringify(c2, null, 2) + '\n');

  const key = Object.keys(db).find(k => k.toLowerCase() === target);
  if (key) {
    db[key].driverId = m.to;
    db[key].source = `${db[key].source || ''}|adjudicated-z2m-arbiter`;
  }
  moved++;
}
fs.writeFileSync(path.join(ROOT, 'data', 'mfs_db.json'), JSON.stringify(db, null, 2) + '\n');
console.log(`mouvements appliqués: ${moved}`);
