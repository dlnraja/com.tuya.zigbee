#!/usr/bin/env node
/**
 * P101 Lot2 — sacred-couple rehomes (mfr+pid) still stuck in generic_tuya.
 * Evidence: GH #439 remainder + Z2M herdsman cache + P98 siblings.
 * Never dump into generic_tuya.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : process.cwd();
const APPLY = process.argv.includes('--apply');

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
  if (pid && !j.zigbee.productId.some((p) => String(p).toLowerCase() === pid.toLowerCase())) {
    j.zigbee.productId.push(pid);
    addedP += 1;
  }
  if (APPLY) saveCompose(f, j);
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
      if (APPLY) saveCompose(f, j);
      removed.push(`${d}:${before - j.zigbee.manufacturerName.length}`);
    }
  }
  return removed;
}

const MOVES = [
  { mfr: '_TZ3002_eda6eitk', pid: 'TS0726', to: 'switch_4gang', evidence: 'Z2M TS0726_4_gang_scene_switch' },
  { mfr: '_TZ3002_vsom92pp', pid: 'TS0726', to: 'switch_3gang', evidence: 'Z2M TS0726_3_gang_scene_switch' },
  { mfr: '_TZE200_0hb4rdnp', pid: 'TS0601', to: 'dimmer_1_gang_tuya', evidence: 'Z2M TS0601_dimmer_1_gang_1' },
  { mfr: '_TZE200_gne0e6mk', pid: 'TS0601', to: 'dimmer_1_gang_tuya', evidence: 'Z2M TS0601_dimmer_1_gang_1' },
  { mfr: '_TZE200_2imwyigp', pid: 'TS0601', to: 'switch_3gang', keepAlso: ['contact_sensor'], evidence: 'Z2M MG-ZG03W 3-gang; TS0203 contact shares mfr' },
  { mfr: '_TZE204_2imwyigp', pid: 'TS0601', to: 'switch_3gang', keepAlso: ['contact_sensor'], evidence: 'Z2M MG-ZG03W 3-gang; TS0203 contact shares mfr' },
  { mfr: '_TZE200_2hf7x9n3', pid: 'TS0601', to: 'switch_3gang', evidence: 'Z2M TS0601_switch_3_gang' },
  { mfr: '_TZE200_rqhnxkqu', pid: 'TS0601', to: 'switch_wall_6gang', evidence: 'Z2M TO-6 6-gang wall' },
  { mfr: '_TZE284_hyssaqjk', pid: 'TS0601', to: 'switch_wall_6gang', evidence: 'Z2M QZ-4x4-6 6-gang' },
  { mfr: '_TZ3218_sgbsg6mr', pid: 'TS000F', to: 'switch_2gang', evidence: 'Z2M ZRM02 2ch relay' },
  { mfr: '_TZE204_xu4a5rhj', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M M3TYW curtain motor' },
  { mfr: '_TYST11_fzo2pocs', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M TS0601_cover_1; was climate misroute' },
  { mfr: '_TZE284_d2zfgtij', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M SPM01V1-GT; P98 sibling d2zfgtij' },
  { mfr: '_TZE284_s4sa1mcx', pid: 'TS0601', to: 'energy_meter_3phase', evidence: 'Z2M SDM01V1-GT; P98 sibling' },
  { mfr: '_TZE204_x8diwkqb', pid: 'TS0601', to: 'energy_meter_3phase', evidence: 'Z2M SDM02V1-GT' },
  { mfr: '_TZE284_x8diwkqb', pid: 'TS0601', to: 'energy_meter_3phase', evidence: 'Z2M SDM02V1-GT' },
  { mfr: '_TZE204_lawxy9e2', pid: 'TS0601', to: 'ceiling_fan', evidence: 'Z2M fan_5_levels_and_light' },
  { mfr: '_TZE204_2jnoy8dj', pid: 'TS0601', to: 'fan_controller', evidence: 'Z2M fan_dimmer_and_light' },
  { mfr: '_TZE200_xixlazkg', pid: 'TS0601', to: 'wall_thermostat', evidence: 'Z2M thermostat_fancoil' },
];

const report = [];
for (const move of MOVES) {
  if (!fs.existsSync(path.join(ROOT, 'drivers', move.to, 'driver.compose.json'))) {
    console.error('SKIP missing driver', move.to, move.mfr);
    continue;
  }
  const rem = removeMfrEverywhere(move.mfr, [move.to, ...(move.keepAlso || [])]);
  const add = ensureCouple(move.to, move.mfr, move.pid);
  if (Array.isArray(move.keepAlso)) {
    for (const also of move.keepAlso) {
      if (also === 'contact_sensor' && /2imwyigp/i.test(move.mfr)) {
        ensureCouple(also, move.mfr, 'TS0203');
      }
    }
  }
  report.push({ ...move, rem, add });
  console.log(
    APPLY ? 'MOVE' : 'DRY',
    move.mfr,
    '->',
    move.to,
    'rem',
    rem.join(',') || '-',
    'addM',
    add.addedM,
    'addP',
    add.addedP,
  );
}

const out = path.join(ROOT, '.github', 'state', 'p101-sacred-lot2-report.json');
try {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), apply: APPLY, report }, null, 2));
} catch (_e) { /* state may be gitignored */ }

console.log(`\nP101 lot2: ${report.length} couples ${APPLY ? 'APPLIED' : '(dry-run — pass --apply)'}`);
