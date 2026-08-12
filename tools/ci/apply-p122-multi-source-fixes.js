#!/usr/bin/env node
/**
 * P122 — Multi-source sacred/data fixes from forum/GH/diag sweep.
 * - fzo2pocs: curtain TS0601 only (off switch_1gang)
 * - curtain_motor: drop ZBMINI* productIds (false pairing / collision)
 * - mmWave compose: strip phantom climate/battery caps; add clrdrnya
 * - EF00: _generic must not invent alarm_motion
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const report = [];

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

function load(driver) {
  const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  return { f, j: JSON.parse(fs.readFileSync(f, 'utf8')) };
}

function save(f, j) {
  if (APPLY) fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
}

function removeMfr(driver, mfr) {
  const { f, j } = load(driver);
  if (!j.zigbee?.manufacturerName) return 0;
  const want = new Set(variants(mfr).map((v) => v.toLowerCase()));
  const before = j.zigbee.manufacturerName.length;
  j.zigbee.manufacturerName = j.zigbee.manufacturerName.filter(
    (x) => !want.has(String(x).toLowerCase()),
  );
  const rem = before - j.zigbee.manufacturerName.length;
  if (rem) save(f, j);
  return rem;
}

function ensureMfr(driver, mfr, pids = []) {
  const { f, j } = load(driver);
  j.zigbee = j.zigbee || {};
  j.zigbee.manufacturerName = j.zigbee.manufacturerName || [];
  j.zigbee.productId = j.zigbee.productId || [];
  let added = 0;
  for (const v of variants(mfr)) {
    if (!j.zigbee.manufacturerName.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
      j.zigbee.manufacturerName.push(v);
      added += 1;
    }
  }
  for (const pid of pids) {
    if (!j.zigbee.productId.some((p) => String(p).toLowerCase() === String(pid).toLowerCase())) {
      j.zigbee.productId.push(pid);
    }
  }
  if (added || pids.length) save(f, j);
  return added;
}

function removePids(driver, pidPrefixOrList) {
  const { f, j } = load(driver);
  if (!j.zigbee?.productId) return 0;
  const before = j.zigbee.productId.length;
  const list = Array.isArray(pidPrefixOrList) ? pidPrefixOrList : null;
  j.zigbee.productId = j.zigbee.productId.filter((p) => {
    const s = String(p);
    if (list) return !list.some((x) => s.toLowerCase() === String(x).toLowerCase());
    return !/^ZBMINI/i.test(s);
  });
  const rem = before - j.zigbee.productId.length;
  if (rem) save(f, j);
  return rem;
}

// 1) fzo2pocs off switch_1gang — curtain owns TS0601 couple (P101)
for (const mfr of ['_TZE200_fzo2pocs', '_TZE204_fzo2pocs', '_TYST11_fzo2pocs']) {
  const rem = removeMfr('switch_1gang', mfr);
  const add = ensureMfr('curtain_motor', mfr, ['TS0601']);
  report.push({ action: 'fzo2pocs-curtain', mfr, removedFromSwitch: rem, curtainAdded: add });
}

// 2) Drop ZBMINI* from curtain (Sonoff mini IDs don't belong on curtain motor)
{
  const rem = removePids('curtain_motor', null);
  report.push({ action: 'curtain-drop-ZBMINI', removed: rem });
}

// 3) mmWave: strip phantom caps + add clrdrnya
{
  const { f, j } = load('motion_sensor_radar_mmwave');
  const phantoms = new Set(['measure_temperature', 'measure_humidity', 'measure_battery']);
  const beforeCaps = (j.capabilities || []).length;
  j.capabilities = (j.capabilities || []).filter((c) => !phantoms.has(c));
  if (j.energy?.batteries) delete j.energy;
  let added = 0;
  j.zigbee = j.zigbee || {};
  j.zigbee.manufacturerName = j.zigbee.manufacturerName || [];
  for (const mfr of ['_TZE200_clrdrnya', '_TZE204_clrdrnya', '_TZE284_clrdrnya']) {
    for (const v of variants(mfr)) {
      if (!j.zigbee.manufacturerName.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
        j.zigbee.manufacturerName.push(v);
        added += 1;
      }
    }
  }
  save(f, j);
  report.push({
    action: 'mmwave-phantoms-clrdrnya',
    capsRemoved: beforeCaps - (j.capabilities || []).length,
    mfrAdded: added,
  });
}

// 4) Ensure soil has TZE204_pay2byax (already) + contact keeps TZE200_pay2byax
{
  const soilAdd = ensureMfr('soil_sensor', '_TZE204_pay2byax', ['TS0601', 'ZG-303Z']);
  const contactKeep = ensureMfr('contact_sensor', '_TZE200_pay2byax', ['TS0203', 'ZG-102Z', 'ZG-102ZL']);
  report.push({ action: 'pay2byax-dual', soilAdd, contactKeep });
}

const out = path.join(ROOT, '.github', 'state', 'p122-multi-source-fixes.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }, null, 2)}\n`);
console.log(`P122 fixes: ${report.length} ops ${APPLY ? 'APPLIED' : '(dry-run)'}`);
for (const r of report) console.log(' ', JSON.stringify(r));
