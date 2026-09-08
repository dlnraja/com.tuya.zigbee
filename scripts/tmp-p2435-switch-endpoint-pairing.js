'use strict';

/**
 * P2435 — Homey pairing fixes for GH #540–#544 (BOTH / reliability)
 *
 * WHY: Homey Zigbee match requires driver endpoint clusters ⊆ device clusters.
 * - switch_4gang required 61184 (EF00) → ZCL TS0004 fail (#541 enmfaave)
 * - wall_switch_2gang_1way listed Basic/Identify on ep2 → TS0012 fail (#542 xk5udnd6)
 * - switch_1gang / switch_2gang too thin + missing bindings for BSEED ZCL (#540/#544)
 * - ptjcjise+TS0002 wrongly on switch_1gang (#543)
 * - xk5udnd6 wrongly on water_leak_sensor (#542 collision)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function stripMfr(arr, needle) {
  const re = new RegExp(needle, 'i');
  return (arr || []).filter((m) => !re.test(String(m)));
}

function ensureMfrCasings(arr, canonical) {
  const lower = canonical.toLowerCase();
  const upper = canonical.toUpperCase();
  const mixed = canonical; // _TZ3000_xxx style
  const variants = [
    lower,
    lower.replace(/^_tz/, '_TZ'),
    upper,
    mixed,
    `_tz3000_${canonical.slice(8)}`.replace(/_TZ3000_/i, '_tz3000_'),
  ];
  // Standard 4 casings used in this repo for TZ3000
  const base = canonical.replace(/^_TZ3000_/i, '').toLowerCase();
  const out = new Set(arr || []);
  for (const v of [
    `_tz3000_${base}`,
    `_tz3000_${base.toUpperCase()}`,
    `_TZ3000_${base}`,
    `_TZ3000_${base.toUpperCase()}`,
  ]) {
    out.add(v);
  }
  return Array.from(out);
}

const ZCL_4GANG_EPS = {
  '1': { clusters: [0, 4, 5, 6], bindings: [6] },
  '2': { clusters: [4, 5, 6], bindings: [6] },
  '3': { clusters: [4, 5, 6], bindings: [6] },
  '4': { clusters: [4, 5, 6], bindings: [6] },
};

const ZCL_2GANG_EPS = {
  '1': { clusters: [0, 4, 5, 6], bindings: [6] },
  '2': { clusters: [4, 5, 6], bindings: [6] },
};

const ZCL_1GANG_EPS = {
  '1': { clusters: [0, 4, 5, 6], bindings: [6] },
};

// --- switch_4gang ---
{
  const p = path.join(ROOT, 'drivers', 'switch_4gang', 'driver.compose.json');
  const c = readJson(p);
  c.zigbee.endpoints = ZCL_4GANG_EPS;
  writeJson(p, c);
  console.log('OK switch_4gang endpoints (no EF00 61184 required)');
}

// --- wall_switch_2gang_1way ---
{
  const p = path.join(ROOT, 'drivers', 'wall_switch_2gang_1way', 'driver.compose.json');
  const c = readJson(p);
  c.zigbee.endpoints = ZCL_2GANG_EPS;
  writeJson(p, c);
  console.log('OK wall_switch_2gang_1way endpoints (ep2 without Basic/Identify)');
}

// --- switch_2gang ---
{
  const p = path.join(ROOT, 'drivers', 'switch_2gang', 'driver.compose.json');
  const c = readJson(p);
  c.zigbee.endpoints = ZCL_2GANG_EPS;
  // Move ptjcjise here (#543)
  c.zigbee.manufacturerName = ensureMfrCasings(c.zigbee.manufacturerName, '_TZ3000_ptjcjise');
  c.zigbee.manufacturerName = ensureMfrCasings(c.zigbee.manufacturerName, '_TZ3000_l9brjwau');
  if (!c.zigbee.productId.includes('TS0002')) c.zigbee.productId.push('TS0002');
  writeJson(p, c);
  console.log('OK switch_2gang endpoints + ptjcjise');
}

// --- switch_1gang ---
{
  const p = path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json');
  const c = readJson(p);
  c.zigbee.endpoints = ZCL_1GANG_EPS;
  c.zigbee.manufacturerName = stripMfr(c.zigbee.manufacturerName, 'ptjcjise');
  c.zigbee.manufacturerName = ensureMfrCasings(c.zigbee.manufacturerName, '_TZ3000_blhvsaqf');
  writeJson(p, c);
  console.log('OK switch_1gang endpoints + strip ptjcjise');
}

// --- water_leak_sensor ---
{
  const p = path.join(ROOT, 'drivers', 'water_leak_sensor', 'driver.compose.json');
  const c = readJson(p);
  c.zigbee.manufacturerName = stripMfr(c.zigbee.manufacturerName, 'xk5udnd6');
  writeJson(p, c);
  console.log('OK water_leak_sensor strip xk5udnd6');
}

// --- mfs_db: top-level driverId was water_leak_sensor (wrong) ---
{
  const p = path.join(ROOT, 'data', 'mfs_db.json');
  const db = readJson(p);

  // Top-level couple-exclusive entry stole TS0012 switches onto water_leak
  db['_tz3000_xk5udnd6'] = {
    driverId: 'wall_switch_2gang_1way',
    source: 'p2435-gh542',
    addedAt: new Date().toISOString(),
    modelIds: ['TS0012', 'TS0002'],
    pid: 'TS0012',
    modelIdsCount: 2,
    variants: [],
    variantsCount: 0,
    notes: 'P2435 GH#542 — was wrongly water_leak_sensor',
  };

  if (db.devices && db.devices['_tz3000_xk5udnd6']) {
    const e = db.devices['_tz3000_xk5udnd6'];
    e.driverHint = 'wall_switch_2gang_1way';
    e.deviceType = 'switch';
    e.powerSource = 'mains';
    const ids = new Set((e.modelIds || []).map(String));
    ids.add('TS0012');
    e.modelIds = Array.from(ids);
  }

  for (const key of ['_tz3000_ptjcjise', '_TZ3000_ptjcjise']) {
    if (db.devices && db.devices[key]) {
      db.devices[key].driverHint = 'switch_2gang';
      db.devices[key].modelIds = ['TS0002'];
    }
  }

  writeJson(p, db);
  console.log('OK mfs_db xk5udnd6 top+devices + ptjcjise');
}

console.log('P2435 compose/mfs patches applied');
