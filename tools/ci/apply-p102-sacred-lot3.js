#!/usr/bin/env node
/**
 * P102 Lot3 — sacred-couple rehomes (mfr+pid) still wrong-class or stuck in
 * generic_tuya / button_wireless_* / climate_sensor.
 * Evidence: GH #439 leftovers + Z2M herdsman cache + TYST11 siblings of P101.
 * Never dump into generic_tuya.
 *
 * Usage:
 *   node tools/ci/apply-p102-sacred-lot3.js
 *   node tools/ci/apply-p102-sacred-lot3.js --apply
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

/** HIGH-confidence sacred couples only (unique Z2M class + typed target). */
const MOVES = [
  // --- generic_tuya leftovers ---
  { mfr: '_TZE204_trwaxi57', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M TS0601_cover_switch_2 cover+switch panel' },
  { mfr: '_TZE28C1000000_81yrt3lo', pid: 'TS0601', to: 'power_clamp_meter', evidence: 'Z2M PJ-1203A; sibling of _TZE204/_TZE284_81yrt3lo' },
  { mfr: '_TZE20C_xbexmf8h', pid: 'TS130F', to: 'wall_curtain_switch', evidence: 'Z2M TS130F_xbexmf8h; strip generic' },

  // --- TYST11 / climate wrong-class (P101 fzo2pocs herd) ---
  { mfr: '_TYST11_udank5zs', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M TS0601_cover_1' },
  { mfr: '_TZE200_udank5zs', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M TS0601_cover_1' },
  { mfr: '_TZE284_udank5zs', pid: 'TS0601', to: 'curtain_motor', evidence: 'Z2M TS0601_cover_1' },
  { mfr: '_TYST11_wv90ladg', pid: 'TS0601', to: 'wall_thermostat', evidence: 'Z2M HT-08 wall-mount thermostat' },
  { mfr: '_TZE200_wv90ladg', pid: 'TS0601', to: 'wall_thermostat', evidence: 'Z2M HT-08' },
  { mfr: '_TYST11_2dpplnsn', pid: 'TS0601', to: 'radiator_valve', evidence: 'Z2M HT-10 TRV' },
  { mfr: '_TZE200_2dpplnsn', pid: 'TS0601', to: 'radiator_valve', evidence: 'Z2M HT-10 TRV' },
  { mfr: '_TZE204_2dpplnsn', pid: 'TS0601', to: 'radiator_valve', evidence: 'Z2M HT-10 TRV' },
  { mfr: '_TYST11_pisltm67', pid: 'TS0601', to: 'light_sensor_outdoor', evidence: 'Z2M S-LUX-ZB light sensor' },
  { mfr: '_TZE200_pisltm67', pid: 'TS0601', to: 'light_sensor_outdoor', evidence: 'Z2M S-LUX-ZB' },
  { mfr: '_TZE204_pisltm67', pid: 'TS0601', to: 'light_sensor_outdoor', evidence: 'Z2M S-LUX-ZB sibling' },
  { mfr: '_TZ3000_l8fsgo6p', pid: 'TS0011', to: 'switch_1gang', evidence: 'Z2M TS0011 1-gang switch' },

  // --- button_wireless_plug metering/switch misroutes ---
  { mfr: '_TZE200_byzdayie', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din DDS238' },
  { mfr: '_TZE204_byzdayie', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M DDS238-1-Z1' },
  { mfr: '_TZE200_fsb6zw01', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din' },
  { mfr: '_TZE200_ewxhg6o9', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din' },
  { mfr: '_TZE200_bkkmqmyo', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din_1' },
  { mfr: '_TZE204_bkkmqmyo', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din_1' },
  { mfr: '_TZE200_eaac7dkw', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din_1' },
  { mfr: '_TZE200_lsanae15', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din_2' },
  { mfr: '_TZE204_lsanae15', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_din_2' },
  { mfr: '_TZE200_nkjintbl', pid: 'TS0601', to: 'switch_2gang', evidence: 'Z2M TS0601_switch_2_gang' },

  // --- button_wireless_2 wrong-class ---
  { mfr: '_TZE204_muvkrjr5', pid: 'TS0601', to: 'presence_sensor_radar', evidence: 'Z2M SZR07U 24GHz mmWave' },
  { mfr: '_TZE200_hkdl5fmv', pid: 'TS0601', to: 'energy_meter_din', evidence: 'Z2M TS0601_rcbo DIN RCBO meter' },
  { mfr: '_TZ3000_fisb3ajo', pid: 'TS0002', to: 'switch_2gang', evidence: 'Z2M TS0002_limited 2-gang module' },
  { mfr: '_TZ3000_aa5t61rh', pid: 'TS0002', to: 'switch_2gang', evidence: 'Z2M TS0002_limited 2-gang module' },
  { mfr: '_TZ3000_rul9yxcc', pid: 'TS011F', to: 'switch_2gang', evidence: 'Z2M SM-PW801EZ / ZG-305Z' },
  { mfr: '_TZ3000_ji4araar', pid: 'TS0011', to: 'switch_1gang', evidence: 'Z2M TS0011_switch_module' },
  { mfr: '_TZ3000_prits6g4', pid: 'TS0001', to: 'switch_1gang', evidence: 'Z2M TS0001_switch_module' },
  { mfr: '_TZ3000_tqlv4ug4', pid: 'TS0001', to: 'switch_1gang', evidence: 'Z2M TS0001_switch_module' },
  { mfr: '_TZ3210_tqlv4ug4', pid: 'TS0001', to: 'switch_1gang', evidence: 'Z2M TS0001_switch_module' },
  { mfr: '_TZ3000_qmi1cfuq', pid: 'TS0011', to: 'switch_1gang', evidence: 'Z2M TS0011_switch_module' },
  { mfr: '_TZ3000_4o16jdca', pid: 'TS0003', to: 'switch_3gang', evidence: 'Z2M TS0003_switch_module_2' },
  { mfr: '_TZ3000_lvhy15ix', pid: 'TS0003', to: 'switch_3gang', evidence: 'Z2M TS0003_switch_module_2' },
  { mfr: '_TZ3000_odzoiovu', pid: 'TS0003', to: 'switch_3gang', evidence: 'Z2M TS0003_switch_module_2' },
  { mfr: '_TZE200_44af8vyi', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M TS0601 temp+humidity' },
  { mfr: '_TZE200_bjawzodf', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M TS0601 temp+humidity' },
  { mfr: '_TZE200_bq5c8xfe', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M TS0601 temp+humidity' },
  { mfr: '_TZE200_d7lpruvi', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M TS0601 temp+humidity_2' },
  { mfr: '_TZE204_d7lpruvi', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M TS0601 temp+humidity_2' },
  { mfr: '_TZE284_d7lpruvi', pid: 'TS0601', to: 'climate_sensor', evidence: 'Z2M TS0601 temp+humidity_2' },
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

const out = path.join(ROOT, '.github', 'state', 'p102-sacred-lot3-report.json');
try {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), apply: APPLY, report }, null, 2));
} catch (_e) { /* state may be gitignored */ }

console.log(`\nP102 lot3: ${report.length} couples ${APPLY ? 'APPLIED' : '(dry-run — pass --apply)'}`);
