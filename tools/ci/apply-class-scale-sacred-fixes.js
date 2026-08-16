'use strict';

/**
 * P168 — Apply class-scale sacred-couple / energy honesty fixes.
 * Conservative rules only (Z2M/ZHA-backed or clear battery vs mains).
 *
 *   node tools/ci/apply-class-scale-sacred-fixes.js           # dry-run
 *   node tools/ci/apply-class-scale-sacred-fixes.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function load(d) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  return { p, j: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function save(p, j) {
  if (!APPLY) return;
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}

function stripMfrNamed(d, mfr) {
  const { p, j } = load(d);
  const list = j.zigbee?.manufacturerName;
  if (!Array.isArray(list)) return 0;
  const before = list.length;
  const next = list.filter((m) => norm(m) !== norm(mfr));
  const removed = before - next.length;
  if (!removed) return 0;
  if (next.length === 0) {
    const s = `_hybrid_${d}_needs_device_assignment`;
    j.zigbee.manufacturerName = [s, s.toUpperCase()];
  } else {
    j.zigbee.manufacturerName = next;
  }
  save(p, j);
  return removed;
}

function addMfr(d, mfr, pid) {
  const { p, j } = load(d);
  if (!j.zigbee) j.zigbee = {};
  if (!Array.isArray(j.zigbee.manufacturerName)) j.zigbee.manufacturerName = [];
  if (!j.zigbee.manufacturerName.some((m) => norm(m) === norm(mfr))) {
    j.zigbee.manufacturerName.push(mfr);
  }
  if (pid) {
    if (!Array.isArray(j.zigbee.productId)) j.zigbee.productId = [];
    if (!j.zigbee.productId.some((x) => norm(x) === norm(pid))) {
      j.zigbee.productId.push(pid);
    }
  }
  save(p, j);
}

const log = [];

// 1) False energy.mains on battery-primary devices
const BATTERY_CLASSES = new Set(['button', 'remote', 'sensor']);
const BATTERY_NAME = /^(button_|remote_button_|contact_sensor|climate_sensor|sensor_|air_purifier_|door_controller|flood_|gas_|motion_|presence_|soil|water_leak|doorwindow)/;

for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  let packed;
  try {
    packed = load(d);
  } catch {
    continue;
  }
  const { p, j } = packed;
  const e = j.energy || {};
  const hasBat = Array.isArray(e.batteries) && e.batteries.length;
  if (!hasBat || e.mains !== true) continue;
  const okClass = BATTERY_CLASSES.has(j.class)
    || BATTERY_NAME.test(d)
    || (j.class === 'windowcoverings' && /curtain|contact/.test(d))
    || (j.class === 'lock' && /door|garage/.test(d))
    || (j.class === 'socket' && /button_wireless|remote_button/.test(d));
  if (!okClass) continue;
  delete j.energy.mains;
  save(p, j);
  log.push({ action: 'strip_false_mains', d, class: j.class });
}

// 2) _TZ3000_wkr3jqmr = TS0004 4-gang (ZHA #2538) → switch_4gang only
{
  const n = stripMfrNamed('switch_1gang', '_TZ3000_wkr3jqmr');
  addMfr('switch_4gang', '_TZ3000_wkr3jqmr', 'TS0004');
  log.push({ action: 'gang_lock', mfr: '_TZ3000_wkr3jqmr', keep: 'switch_4gang', stripped: n });
}

// 3) Light exclusivity rules
const lightRules = [
  { mfr: '_TZ3000_jd3z4yig', strip: ['christmas_lights'], keep: 'rgb_led_strip' },
  { mfr: '_TZ3210_jd3z4yig', strip: ['christmas_lights'], keep: 'rgb_led_strip' },
  { mfr: '_TZ3000_qqjaziws', strip: ['dimmable_led_strip'], keep: 'rgb_led_strip_controller' },
  { mfr: '_TZ3210_sroezl0s', strip: ['tunable_bulb_E14'], keep: 'bulb_rgbw' },
  { mfr: '_TZ3000_keabpigv', strip: ['light_bulb_tunable_white'], keep: 'led_strip_rgbw' },
  { mfr: '_TZ3000_12sxjap4', strip: ['rgb_bulb_E27'], keep: 'led_strip_rgbw' },
  { mfr: '_TZ3000_hlijwsai', strip: ['rgb_bulb_E27'], keep: 'led_strip_rgbw' },
];

try {
  const stripList = load('dimmable_led_strip').j.zigbee.manufacturerName || [];
  const bulbSet = new Set((load('light_bulb_rgb_rgbw').j.zigbee.manufacturerName || []).map(norm));
  for (const raw of stripList) {
    if (!bulbSet.has(norm(raw))) continue;
    if (lightRules.some((r) => norm(r.mfr) === norm(raw))) continue;
    lightRules.push({ mfr: raw, strip: ['dimmable_led_strip'], keep: 'light_bulb_rgb_rgbw' });
  }
} catch {
  /* drivers may be missing */
}

for (const r of lightRules) {
  for (const s of r.strip) {
    try {
      const n = stripMfrNamed(s, r.mfr);
      if (n) log.push({ action: 'light_exclusive', mfr: r.mfr, from: s, keep: r.keep, n });
    } catch (e) {
      log.push({ action: 'light_strip_err', mfr: r.mfr, from: s, err: String(e.message) });
    }
  }
  try {
    addMfr(r.keep, r.mfr);
  } catch (e) {
    log.push({ action: 'keep_miss', keep: r.keep, err: String(e.message) });
  }
}

// 4) mfs_db align for registry (object map only)
let mfsChanged = 0;
try {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8'));
  const dbPath = path.join(ROOT, 'data', 'mfs_db.json');
  const raw = fs.readFileSync(dbPath);
  const db = JSON.parse(raw);
  if (db && typeof db === 'object' && !Array.isArray(db)) {
    const keys = Object.keys(db);
    for (const c of reg.cases || []) {
      const canon = c.canonicalDriver;
      const pids = c.productId || [];
      for (const m of c.mfr || []) {
        const key = keys.find((k) => norm(k) === norm(m));
        if (!key) continue;
        const entry = db[key];
        if (!entry || typeof entry !== 'object') continue;
        if (entry.driverId !== canon) {
          entry.driverId = canon;
          mfsChanged += 1;
        }
        if (pids.length) entry.modelIds = [...pids];
      }
    }
    if (APPLY && mfsChanged) {
      fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
    }
  }
} catch (e) {
  log.push({ action: 'mfs_align_err', err: String(e.message) });
}

const summary = {
  apply: APPLY,
  logCount: log.length,
  mfsChanged,
  byAction: log.reduce((acc, x) => {
    acc[x.action] = (acc[x.action] || 0) + 1;
    return acc;
  }, {}),
  log,
};

console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync(
  path.join(ROOT, 'reports', 'P168_APPLY_CLASS_SCALE_LATEST.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);
