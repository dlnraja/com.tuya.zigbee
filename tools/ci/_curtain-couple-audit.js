#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p));
  } catch {
    return null;
  }
}

function normMfr(m) {
  return String(m || '').trim().toLowerCase();
}

function normPid(p) {
  return String(p || '').trim();
}

const TARGET_DRIVERS = [
  'curtain_motor',
  'curtain_motor_tilt',
  'curtain_motor_shutter',
  'wall_curtain_switch',
  'curtain_module',
  'curtain_module_2_gang',
];

const COVER_MODEL_RE =
  /^TS0601_cover|^TS0301_cover|TS0601_cover_with|TS0601_cover_switch|^ZSM-01$|^M3TYW|^ZM79E|^BX82|^MB60L|^EPJ-ZB|^M515EGBZTN|^RM28-LE|^PIMS3028|^ZB-Sm$|^MS-108ZR$|^TS130F_xbexmf8h$/i;
const COVER_DESC_RE =
  /curtain motor|roller blind|cover motor|window pusher|tubular motor|blind motor|curtain\/blind switch(?! module)|smart blind|roller shade|cover plug-in|sliding window pusher|zigbee \+ rf curtain switch|curtain\/blind switch with/i;
const EXCLUDE_DESC_RE =
  /led strip|light controller|rgb|thermostat|fcu|fan and light|environment controller|hvac|smart scene knob|6-way controller|16-way controller|smart panel.*switch|gang switch.*thermostat|hue discover|cellular blind|kadrilj|praktlysing|tredansen/i;

const driverData = {};
for (const d of TARGET_DRIVERS) {
  const compose = readJson(path.join(ROOT, 'drivers', d, 'driver.compose.json'));
  const mfrs = new Set((compose?.zigbee?.manufacturerName || []).map(normMfr));
  const pids = new Set((compose?.zigbee?.productId || []).map((p) => normPid(p).toLowerCase()));
  driverData[d] = { mfrs, pids };
}

function inDriver(driverId, mfr, pid) {
  const d = driverData[driverId];
  return d.mfrs.has(normMfr(mfr)) && d.pids.has(normPid(pid).toLowerCase());
}

function inAnyTarget(mfr, pid) {
  return TARGET_DRIVERS.some((d) => inDriver(d, mfr, pid));
}

const verified = new Map();

function add(mfr, pid, source, hint) {
  if (!mfr || !pid) return;
  const p = normPid(pid);
  if (!/^TS\d/.test(p)) return;
  if (p.includes('\\u0000') || p.length > 24) return;
  const key = `${normMfr(mfr)}|${p.toLowerCase()}`;
  if (!verified.has(key)) {
    verified.set(key, { mfr, pid: p, sources: new Set(), hint: hint || null });
  }
  verified.get(key).sources.add(source);
  if (hint) verified.get(key).hint = hint;
}

function parseHerdsmanDevices(file) {
  const data = readJson(path.join(ROOT, file));
  if (!data?.devices) return;
  for (const d of data.devices) {
    const model = d.model || '';
    const desc = d.description || '';
    if (EXCLUDE_DESC_RE.test(desc)) continue;
    if (!COVER_MODEL_RE.test(model) && !COVER_DESC_RE.test(desc)) continue;
    const pids = (d.modelIds || []).filter((p) => /^TS\d/.test(p));
    const pid =
      pids[0] ||
      (model.startsWith('TS0601')
        ? 'TS0601'
        : model.startsWith('TS0301')
          ? 'TS0301'
          : model.startsWith('TS130F')
            ? 'TS130F'
            : null);
    if (!pid) continue;
    for (const m of d.mfrs || []) add(m, pid, `z2m_herdsman:${model}`, null);
  }
}

parseHerdsmanDevices('data/z2m_herdsman_cache.json');

const z2mCache = readJson(path.join(ROOT, 'data/z2m_cache.json'));
if (z2mCache) {
  for (const [k, v] of Object.entries(z2mCache)) {
    if (k === '_meta' || !v || typeof v !== 'object') continue;
    const blob = JSON.stringify(v);
    if (!/cover|curtain|blind|shutter|window pusher|tubular/i.test(blob)) continue;
    const mfr = v.manufacturerName || v.mfr || k.split('|')[0];
    const pid = v.modelID || v.modelId || v.productId || k.split('|')[1];
    if (mfr && pid && /^TS\d/.test(pid)) add(mfr, pid, 'z2m_cache', null);
  }
}

const z2mFull = readJson(path.join(ROOT, 'lib/data/z2m_devices_full.json'));
const z2mArr = Array.isArray(z2mFull) ? z2mFull : z2mFull?.devices || [];
for (const d of z2mArr) {
  const model = d.model || '';
  const desc = d.description || '';
  if (EXCLUDE_DESC_RE.test(desc)) continue;
  if (!COVER_MODEL_RE.test(model) && !COVER_DESC_RE.test(desc)) continue;
  const pid = (d.modelIds || []).find((p) => /^TS\d/.test(p)) || 'TS0601';
  for (const m of d.mfrs || []) add(m, pid, `z2m_devices_full:${model}`, null);
}

const z2mData = readJson(path.join(ROOT, 'scripts/data/z2m-data.json'));
if (z2mData) {
  const entries = Array.isArray(z2mData) ? z2mData : Object.values(z2mData).flat();
  for (const d of entries) {
    if (!d || typeof d !== 'object') continue;
    const blob = JSON.stringify(d);
    if (!/cover|curtain|blind|shutter/i.test(blob)) continue;
    const mfr = d.manufacturerName || d.mfr;
    const pid = d.modelID || d.modelId || d.productId;
    if (mfr && pid && /^TS\d/.test(pid)) add(mfr, pid, 'z2m-data.json', null);
  }
}

const report = readJson(path.join(ROOT, 'reports/curtain-z2m-missing-2026-09-01.json'));
// WHY(P2363): z2mCoverMfrs list mixes switches/presence — verify each against herdsman device class
const herdsmanDevices = readJson(path.join(ROOT, 'data/z2m_herdsman_cache.json'))?.devices || [];
function herdsmanBlob(mfr) {
  const hits = herdsmanDevices.filter((d) => (d.mfrs || []).some((x) => normMfr(x) === normMfr(mfr)));
  return hits.map((d) => `${d.model || ''} ${d.description || ''}`).join(' ');
}
for (const mfr of report?.z2mCoverMfrs || []) {
  const blob = herdsmanBlob(mfr) || `cover ${mfr}`;
  if (!COVER_MODEL_RE.test(blob) && !COVER_DESC_RE.test(blob)) continue;
  if (EXCLUDE_DESC_RE.test(blob) || /presence|switch|valve|motion|radar/i.test(blob)) continue;
  add(mfr, 'TS0601', 'reports/curtain-z2m-missing-2026-09-01.json', 'curtain_motor');
}

const reg = readJson(path.join(ROOT, 'data/user-misattribution-registry.json'));
const cases = reg?.cases || reg?.entries || [];
for (const c of cases) {
  if (!/curtain|cover|blind|shutter|windowcover/i.test(JSON.stringify(c))) continue;
  const mfrs = c.mfr || c.manufacturerNames || (c.manufacturerName ? [c.manufacturerName] : []);
  const ml = Array.isArray(mfrs) ? mfrs : [mfrs];
  const pids = c.productId || c.productIds || [];
  const pl = Array.isArray(pids) ? pids : [pids];
  for (const m of ml) {
    for (const p of pl) {
      if (m && p) add(m, p, `misattribution:${c.id}`, c.canonicalDriver);
    }
  }
}

const dt = readJson(path.join(ROOT, 'docs/knowledge/device-truth.json'));
for (const [drv, info] of Object.entries(dt?.drivers || {})) {
  if (
    !TARGET_DRIVERS.includes(drv) &&
    info.class !== 'windowcoverings' &&
    info.class !== 'curtain'
  ) {
    continue;
  }
  for (const m of info.misattribution || []) {
    if (m.manufacturerName && m.productId) {
      add(m.manufacturerName, m.productId, `device-truth:${drv}`, m.canonicalDriver || drv);
    }
  }
}

for (const f of ['scripts/data/zha-data.json', 'scripts/data/zha-full-data.json']) {
  const zha = readJson(path.join(ROOT, f));
  if (!zha) continue;
  const quirks = zha.quirks || zha.devices || [];
  for (const q of quirks) {
    const mod = q.file || q.module || '';
    if (!/cover|curtain|blind|shutter/i.test(mod + JSON.stringify(q))) continue;
    const sigs = q.signature ? [q.signature] : q.signatures || [];
    for (const s of sigs) {
      const m = s?.manufacturer || s?.manufacturerName;
      const p = s?.model || s?.modelId || s?.modelID;
      if (m && p) add(m, p, `zha:${mod}`, null);
    }
  }
}

const CANONICAL = {
  '_tze204_r0jdjrvi|ts0601': 'curtain_motor_tilt',
  '_tze200_r0jdjrvi|ts0601': 'curtain_motor_tilt',
  '_tze20c_xbexmf8h|ts0601': 'wall_curtain_switch',
  '_tze20c_xbexmf8h|ts130f': 'wall_curtain_switch',
  '_tze284_kq1l5eu5|ts0601': 'wall_curtain_switch',
  '_tze284_kq1l5eu5|ts130f': 'wall_curtain_switch',
  '_tze210_m6lwazh9|ts0301': 'curtain_motor',
  '_tze200_m6lwazh9|ts0601': 'curtain_motor',
};

function resolveTarget(entry) {
  const key = `${normMfr(entry.mfr)}|${entry.pid.toLowerCase()}`;
  if (CANONICAL[key]) return CANONICAL[key];
  if (entry.hint && TARGET_DRIVERS.includes(entry.hint)) return entry.hint;
  const m = normMfr(entry.mfr);
  const p = entry.pid.toLowerCase();
  if (p === 'ts0601_curtain_tilt' || m.includes('r0jdjrvi')) return 'curtain_motor_tilt';
  if (p === 'ts130f') {
    if (driverData.curtain_module.mfrs.has(m)) return 'curtain_module';
    if (driverData.curtain_module_2_gang.mfrs.has(m)) return 'curtain_module_2_gang';
    return entry.hint === 'curtain_module' ? 'curtain_module' : 'wall_curtain_switch';
  }
  if (p === 'ts0726') return 'curtain_module';
  if (p === 'ts0301') return 'curtain_motor';
  if (p === 'ts0601') {
    if (entry.hint === 'wall_curtain_switch') return 'wall_curtain_switch';
    if (driverData.curtain_motor_shutter.mfrs.has(m) && !driverData.curtain_motor.mfrs.has(m)) {
      return 'curtain_motor_shutter';
    }
    return 'curtain_motor';
  }
  return entry.hint;
}

const add_to_curtain_motor = [];
const add_to_other_driver = [];
const still_missing_count = {};
for (const d of TARGET_DRIVERS) still_missing_count[d] = 0;

const motorSeen = new Set();
const otherSeen = new Set();

for (const entry of verified.values()) {
  if (inAnyTarget(entry.mfr, entry.pid)) continue;
  const target = resolveTarget(entry);
  const source = [...entry.sources].sort().join('; ');
  const key = `${normMfr(entry.mfr)}|${entry.pid.toLowerCase()}`;

  if (target === 'curtain_motor' && entry.pid.toUpperCase() === 'TS0601') {
    if (!motorSeen.has(key)) {
      motorSeen.add(key);
      add_to_curtain_motor.push({ mfr: entry.mfr, pid: 'TS0601', source });
      still_missing_count.curtain_motor++;
    }
  } else if (TARGET_DRIVERS.includes(target)) {
    const ok = `${key}|${target}`;
    if (!otherSeen.has(ok)) {
      otherSeen.add(ok);
      add_to_other_driver.push({ mfr: entry.mfr, pid: entry.pid, driver: target, source });
      still_missing_count[target]++;
    }
  }
}

const forbidden_do_not_add = [];
const forbiddenSeen = new Set();
for (const c of cases) {
  if (!/curtain|cover|blind|shutter|windowcover/i.test(JSON.stringify(c))) continue;
  const mfrs = c.mfr || c.manufacturerNames || [];
  const ml = Array.isArray(mfrs) ? mfrs : [mfrs];
  const pids = c.productId || c.productIds || [];
  const pl = Array.isArray(pids) ? pids : [pids];
  for (const m of ml) {
    for (const p of pl) {
      if (!m || !p) continue;
      for (const fd of c.forbiddenDrivers || []) {
        const row = {
          mfr: m,
          pid: p,
          reason: `${c.id}: canonical ${c.canonicalDriver}, never ${fd}`,
        };
        const fk = `${normMfr(m)}|${p}|${row.reason}`;
        if (!forbiddenSeen.has(fk)) {
          forbiddenSeen.add(fk);
          forbidden_do_not_add.push(row);
        }
      }
    }
  }
}

// Explicit high-signal forbids: r0jdjrvi bleed on curtain_motor
if (inDriver('curtain_motor', '_TZE200_r0jdjrvi', 'TS0601')) {
  const row = {
    mfr: '_TZE200_r0jdjrvi',
    pid: 'TS0601',
    reason: 'curtain-r0jdjrvi-tilt: _TZE200_r0jdjrvi is tilt motor — remove from curtain_motor, keep curtain_motor_tilt only',
  };
  forbidden_do_not_add.push(row);
}

add_to_curtain_motor.sort((a, b) => normMfr(a.mfr).localeCompare(normMfr(b.mfr)));
add_to_other_driver.sort(
  (a, b) => normMfr(a.mfr).localeCompare(normMfr(b.mfr)) || a.driver.localeCompare(b.driver),
);
forbidden_do_not_add.sort((a, b) => normMfr(a.mfr).localeCompare(normMfr(b.mfr)));

const out = {
  add_to_curtain_motor,
  add_to_other_driver,
  forbidden_do_not_add,
  still_missing_count,
  meta: {
    verified_couples_total: verified.size,
    already_in_target_drivers: [...verified.values()].filter((e) => inAnyTarget(e.mfr, e.pid)).length,
    z2m_cover_mfrs_in_report: report?.z2mCoverMfrs?.length || 0,
    sources_scanned: [
      'data/z2m_herdsman_cache.json',
      'data/z2m_cache.json',
      'lib/data/z2m_devices_full.json',
      'scripts/data/z2m-data.json',
      'reports/curtain-z2m-missing-2026-09-01.json',
      'docs/knowledge/device-truth.json',
      'data/user-misattribution-registry.json',
      'scripts/data/zha-data.json',
      'scripts/data/zha-full-data.json',
    ],
    github_state_note: 'No blakadder/zha cover cache under .github/state/ (only diagnostics-report.json)',
    generatedAt: new Date().toISOString(),
  },
};

const outPath = path.join(ROOT, 'reports/curtain-couple-audit-2026-09-01.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
