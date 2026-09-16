'use strict';

/**
 * P2530b — strip forbidden kq1l5eu5 from curtain_motor; complete on wall_curtain_switch
 */
const fs = require('fs');
const path = require('path');
const { unionStrings, mergeZigbeeIdentity } = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.resolve(__dirname, '../..');

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}
function save(rel, j) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(j, null, 2)}\n`);
}

function stripSuffix(names, suffix) {
  const s = String(suffix).toLowerCase();
  return (names || []).filter((m) => !String(m).toLowerCase().includes(s));
}

function oemTzE(suffix) {
  const out = [];
  for (const p of ['_TZE200_', '_TZE204_', '_TZE284_']) out.push(`${p}${suffix}`);
  for (const p of ['_tze200_', '_tze204_', '_tze284_']) out.push(`${p}${suffix}`);
  return out;
}

// 1) Strip from curtain_motor
const curtainRel = 'drivers/curtain_motor/driver.compose.json';
const curtain = load(curtainRel);
const before = (curtain.zigbee.manufacturerName || []).length;
curtain.zigbee.manufacturerName = stripSuffix(curtain.zigbee.manufacturerName, 'kq1l5eu5');
// Re-front-pin sacred Moes
const front = ['_TZE204_5slehgeo', '_TZE284_5slehgeo', '_TZE200_5slehgeo', '_TZE200_icka1clh', '_TZE284_fodv6bkr'];
let names = curtain.zigbee.manufacturerName;
for (const p of [...front].reverse()) {
  const idx = names.findIndex((m) => String(m).toLowerCase() === p.toLowerCase());
  if (idx > 0) {
    const [h] = names.splice(idx, 1);
    names.unshift(h);
  } else if (idx < 0 && names.some((m) => String(m).toLowerCase().includes(p.split('_').pop()))) {
    names.unshift(p);
  }
}
curtain.zigbee.manufacturerName = unionStrings(names, []);
save(curtainRel, curtain);
console.log('curtain_motor mfr', before, '→', curtain.zigbee.manufacturerName.length, 'front=', curtain.zigbee.manufacturerName[0]);

// 2) Union OEM+case onto wall_curtain_switch
const wallRel = 'drivers/wall_curtain_switch/driver.compose.json';
if (fs.existsSync(path.join(ROOT, wallRel))) {
  const wall = load(wallRel);
  const add = oemTzE('kq1l5eu5');
  wall.zigbee = mergeZigbeeIdentity(wall.zigbee || {}, { manufacturerName: add });
  // front-pin TZE284 (registry canonical)
  const n = wall.zigbee.manufacturerName || [];
  const pin = '_TZE284_kq1l5eu5';
  const i = n.findIndex((m) => String(m).toLowerCase() === pin.toLowerCase());
  if (i > 0) {
    const [h] = n.splice(i, 1);
    n.unshift(h);
  } else if (i < 0) n.unshift(pin);
  wall.zigbee.manufacturerName = unionStrings(n, []);
  // ensure cover caps
  const caps = new Set(wall.capabilities || []);
  for (const c of ['windowcoverings_state', 'windowcoverings_set']) {
    if (!caps.has(c)) (wall.capabilities = wall.capabilities || []).push(c);
  }
  save(wallRel, wall);
  console.log('wall_curtain_switch mfr=', wall.zigbee.manufacturerName.length, 'front=', wall.zigbee.manufacturerName[0]);
} else {
  console.warn('wall_curtain_switch missing');
}

// 3) Remove kq1l5eu5 from completer SEEDS (patch file)
const completer = path.join(ROOT, 'tools/ci/recent-variant-capability-completer.js');
let src = fs.readFileSync(completer, 'utf8');
src = src.replace(/^\s*\{ suffix: 'kq1l5eu5'[\s\S]*?\},\n/m, '');
fs.writeFileSync(completer, src);
console.log('completer seed kq1l5eu5 removed');
