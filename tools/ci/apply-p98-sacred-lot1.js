#!/usr/bin/env node
/**
 * P98 Lot1 — sacred-couple rehomes (mfr+pid) from generic/wrong-class drivers.
 * Evidence: GH #439 Z2M enrichment + forum scan + Z2M/Blakadder web.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : process.cwd();

function variants(mfr) {
  const base = String(mfr).trim();
  const out = new Set([base, base.toLowerCase()]);
  const m = base.match(/^(_[A-Za-z0-9]+)_(.+)$/);
  if (m) {
    out.add(`${m[1].toUpperCase()}_${m[2].toLowerCase()}`);
    out.add(`${m[1].toLowerCase()}_${m[2].toLowerCase()}`);
    out.add(`${m[1].toUpperCase()}_${m[2].toUpperCase()}`);
    out.add(`${m[1].toLowerCase()}_${m[2].toUpperCase()}`);
  }
  return [...out];
}

function loadCompose(driver) {
  const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  return { f, j: JSON.parse(fs.readFileSync(f, 'utf8')) };
}

function saveCompose(f, j) {
  fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
}

function ensureCouple(driver, mfr, pid) {
  const { f, j } = loadCompose(driver);
  j.zigbee = j.zigbee || {};
  j.zigbee.manufacturerName = j.zigbee.manufacturerName || [];
  j.zigbee.productId = j.zigbee.productId || [];
  let addedM = 0;
  let addedP = 0;
  for (const v of variants(mfr)) {
    if (!j.zigbee.manufacturerName.some((x) => x === v)) {
      j.zigbee.manufacturerName.push(v);
      addedM += 1;
    }
  }
  if (pid && !j.zigbee.productId.some((p) => p.toLowerCase() === pid.toLowerCase())) {
    j.zigbee.productId.push(pid);
    addedP += 1;
  }
  saveCompose(f, j);
  return { addedM, addedP };
}

function removeMfrEverywhere(mfr, exceptDrivers) {
  const except = new Set(exceptDrivers);
  const want = new Set(variants(mfr).map((v) => v.toLowerCase()));
  const removed = [];
  const driversDir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(driversDir)) {
    if (except.has(d)) continue;
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!j.zigbee || !Array.isArray(j.zigbee.manufacturerName)) continue;
    const before = j.zigbee.manufacturerName.length;
    j.zigbee.manufacturerName = j.zigbee.manufacturerName.filter(
      (m) => !want.has(String(m).toLowerCase()),
    );
    if (j.zigbee.manufacturerName.length !== before) {
      saveCompose(f, j);
      removed.push(`${d}:${before - j.zigbee.manufacturerName.length}`);
    }
  }
  return removed;
}

const MOVES = [
  { mfr: '_TZ3000_pftj0i7z', pid: 'TS004F', to: 'button_wireless_4', evidence: 'Z2M TS004F wireless 4-btn' },
  { mfr: '_TZ3000_8utxxtzr', pid: 'TS0215A', to: 'button_emergency_sos', evidence: 'Z2M TS0215A_sos' },
  { mfr: '_TZ3000_bgtzm4ny', pid: 'TS0044', to: 'button_wireless_4', evidence: 'Forum #1397 ZG-101ZS' },
  { mfr: '_TZ3000_5tqxpine', pid: 'TS0044', to: 'button_wireless_4', evidence: 'Z2M 4-btn scene pattern' },
  { mfr: '_TZE200_a8sdabtg', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M ZG-227ZL' },
  { mfr: '_TZE210_yqwse3h5', pid: 'TS0301', to: 'curtain_motor', evidence: 'Z2M TS0301_dual_rail' },
  { mfr: '_TZE210_m6lwazh9', pid: 'TS0301', to: 'curtain_motor', evidence: 'Z2M TS0301_cover' },
  { mfr: '_TZE200_eegnwoyw', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M cover' },
  { mfr: '_TZE200_cpbo62rn', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M cover_6' },
  { mfr: '_TZE200_mlglxwp3', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M cover_12' },
  { mfr: '_TZE204_tgl8i2np', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M cover_13' },
  { mfr: '_TZE200_9p5xmj5r', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M cover_3; was wall_thermostat' },
  { mfr: '_TZE204_f2rflfa6', pid: 'TS0601', to: 'presence_sensor_radar', evidence: 'Z2M Novato ZIS-04' },
  { mfr: '_TZE204_izy1g1mb', pid: 'TS0601', to: 'presence_sensor_radar', evidence: 'Z2M Novato ZIS-03' },
  { mfr: '_TZ3210_aksyshpw', pid: 'TS0003', to: 'switch_3gang', evidence: 'Z2M 3-gang module' },
  { mfr: '_TZ3210_wts1g2oh', pid: 'TS0004', to: 'switch_4gang', evidence: 'Z2M 4-gang module' },
  { mfr: '_TZ3000_ovbvmhiq', pid: 'TS0726', to: 'switch_1gang', evidence: 'Z2M TS0726_1_gang' },
  { mfr: '_TZ3218_n0jsuogs', pid: 'TS000F', to: 'switch_1gang', evidence: 'Z2M ZRM01' },
  { mfr: '_TZE204_d2zfgtij', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M SPM01V1-GT' },
  { mfr: '_TZE204_s4sa1mcx', pid: 'TS0601', to: 'energy_meter_3phase', evidence: 'Z2M SDM01V1-GT' },
  { mfr: '_TZE284_kv1nvirl', pid: 'TS0601', to: 'smart_breaker', evidence: 'Z2M TOQCB2-80' },
  { mfr: '_TZE200_jt50ea5d', pid: 'TS0601', to: 'ultrasonic_heat_meter', evidence: 'Z2M heat_meter; was valve_irrigation' },
];

const report = [];
for (const move of MOVES) {
  if (!fs.existsSync(path.join(ROOT, 'drivers', move.to, 'driver.compose.json'))) {
    console.error('SKIP missing driver', move.to, move.mfr);
    continue;
  }
  const rem = removeMfrEverywhere(move.mfr, [move.to]);
  const add = ensureCouple(move.to, move.mfr, move.pid);
  report.push({ ...move, rem, add });
  console.log(
    'MOVE',
    move.mfr,
    '->',
    move.to,
    'rem',
    rem.join('|') || '-',
    'addM',
    add.addedM,
    'addP',
    add.addedP,
  );
}

const dbPath = path.join(ROOT, 'data', 'mfs_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const mfsPatches = [
  ['_tz3210_imaccztn', 'relay_board_4_channel', 'TS0004'],
  ['_tyzb01_hlla45kx', 'double_power_point_2', 'TS011F'],
  ['_tze200_jt50ea5d', 'ultrasonic_heat_meter', 'TS0601'],
  ['_tz3000_pftj0i7z', 'button_wireless_4', 'TS004F'],
  ['_tz3000_8utxxtzr', 'button_emergency_sos', 'TS0215A'],
  ['_tz3000_bgtzm4ny', 'button_wireless_4', 'TS0044'],
  ['_tz3000_5tqxpine', 'button_wireless_4', 'TS0044'],
  ['_tze200_a8sdabtg', 'climate_sensor', 'TS0601'],
  ['_tze200_9p5xmj5r', 'curtain_motor', 'TS0601'],
  ['_tze204_f2rflfa6', 'presence_sensor_radar', 'TS0601'],
  ['_tze204_izy1g1mb', 'presence_sensor_radar', 'TS0601'],
  ['_tze204_d2zfgtij', 'energy_meter_din', 'TS0601'],
  ['_tze204_s4sa1mcx', 'energy_meter_3phase', 'TS0601'],
  ['_tze284_kv1nvirl', 'smart_breaker', 'TS0601'],
];
let patched = 0;
for (const [key, driverId, pid] of mfsPatches) {
  if (db[key] && typeof db[key] === 'object') {
    const prev = db[key].driverId;
    db[key].driverId = driverId;
    db[key].pid = pid;
    db[key].source = 'p98-sacred-couple';
    if (prev !== driverId) {
      patched += 1;
      console.log('mfs_db', key, prev, '->', driverId);
    }
  }
}
fs.writeFileSync(dbPath, JSON.stringify(db));
console.log('mfs_db patched', patched);

const tmpDir = path.join(ROOT, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
fs.writeFileSync(path.join(tmpDir, 'p98-lot1-moves.json'), JSON.stringify(report, null, 2));
console.log('done', report.length, 'moves @', ROOT);
