#!/usr/bin/env node
/**
 * P117 — Sacred-couple rehomes from forum/Gmail/GitHub triage.
 * - rain FPs → rain_sensor
 * - contact 2imwyigp on contact_sensor (TS0203) AND keep on switch_3gang (TS0601)
 *   Sacred couple: same mfr OK in both drivers; only drop TS0203 from switch_3gang
 * - soil hdml1aav out of climate, fix garbled mfr
 * - gas truncated chbyv06 removed from gas_detector (keep chbyv06x on gas_sensor)
 *
 * Usage:
 *   node tools/ci/apply-p117-sacred-rehomes.js --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');

function variants(mfr) {
  const base = String(mfr).trim();
  const out = new Set([base, base.toLowerCase()]);
  const m = base.match(/^(_[A-Za-z0-9]+)_(.+)$/);
  if (m) {
    out.add(`${m[1].toUpperCase()}_${m[2].toLowerCase()}`);
    out.add(`${m[1].toLowerCase()}_${m[2].toLowerCase()}`);
    out.add(`${m[1].toUpperCase()}_${m[2].toUpperCase()}`);
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
      added += 1;
    }
  }
  save(f, j);
  return added;
}

function removeMfr(driver, mfr) {
  const { f, j } = load(driver);
  if (!j.zigbee?.manufacturerName) return 0;
  const want = new Set(variants(mfr).map((v) => v.toLowerCase()));
  const before = j.zigbee.manufacturerName.length;
  j.zigbee.manufacturerName = j.zigbee.manufacturerName.filter((m) => !want.has(String(m).toLowerCase()));
  const removed = before - j.zigbee.manufacturerName.length;
  if (removed) save(f, j);
  return removed;
}

function removePid(driver, pid) {
  const { f, j } = load(driver);
  if (!j.zigbee?.productId) return 0;
  const before = j.zigbee.productId.length;
  j.zigbee.productId = j.zigbee.productId.filter((p) => String(p).toLowerCase() !== String(pid).toLowerCase());
  const removed = before - j.zigbee.productId.length;
  if (removed) save(f, j);
  return removed;
}

const report = [];

// 1) Rain
for (const mfr of ['_TZ3210_p68kms0l', '_TZ3210_tgvtvdoc']) {
  const a = ensureMfr('rain_sensor', mfr, ['TS0207', 'TS0207_rain', 'TS0601']);
  const r = removeMfr('sensor_contact_rain', mfr);
  report.push({ action: 'rain-rehome', mfr, added: a, removedFromContactRain: r });
}

// 2) P218: 2imwyigp TS0601 → switch_3gang only (contact_sensor compose must NOT list 2imwyigp)
for (const mfr of ['_TZE200_2imwyigp', '_TZE204_2imwyigp']) {
  const aSwitch = ensureMfr('switch_3gang', mfr, ['TS0601']);
  report.push({
    action: 'switch-3gang-2imwyigp',
    mfr,
    switchAdded: aSwitch,
  });
}
report.push({ action: 'switch_3gang-drop-TS0203', removed: removePid('switch_3gang', 'TS0203') });
// P125: contact must not advertise TS0601 (cartesian collision with switch_3gang dual-home)
report.push({ action: 'contact_sensor-drop-TS0601', removed: removePid('contact_sensor', 'TS0601') });

// 3) Soil hdml1aav
{
  const mfr = '_TZE284_hdml1aav';
  const a = ensureMfr('soil_sensor', mfr, ['TS0601', 'ZG-303Z']);
  const r = removeMfr('climate_sensor', mfr);
  // drop garbled
  const g = removeMfr('soil_sensor', '_TZE2841000000_hdml1aav');
  report.push({ action: 'soil-rehome', mfr, added: a, removedFromClimate: r, removedGarbled: g });
}

// 4) Gas truncated
{
  const r = removeMfr('gas_detector', '_TZE204_chbyv06');
  // ensure full id on gas_sensor
  const a = ensureMfr('gas_sensor', '_TZE204_chbyv06x', ['TS0601', 'TS0601_gas']);
  report.push({ action: 'gas-truncate-fix', removedTruncated: r, reinforcedGasSensor: a });
}

const out = path.join(ROOT, '.github', 'state', 'p117-sacred-rehomes-report.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }, null, 2)}\n`);
console.log(`P117 sacred rehomes: ${report.length} ops ${APPLY ? 'APPLIED' : '(dry-run)'}`);
for (const r of report) console.log(' ', JSON.stringify(r));
