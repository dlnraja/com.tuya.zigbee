#!/usr/bin/env node
'use strict';

/**
 * apply-curtain-couples.js (P2363 / P2363b verdict 2026-09-01)
 * Harvest verified cover motors (mfr + TS0601) from Z2M herdsman;
 * add to curtain_motor; strip wrong-class / sibling-owned bleed.
 *
 * Usage:
 *   node tools/ci/apply-curtain-couples.js           # dry-run
 *   node tools/ci/apply-curtain-couples.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');

/** Verdict 2026-09-01 — herdsman Z2M cover motors, pid stays TS0601 in compose */
const VERIFIED_CURTAIN_MOTOR_36 = [
  '_TZE200_2jwrgrro', '_TZE200_2odrmqwq', '_TZE200_5sbebbzs', '_TZE200_7shyddj3',
  '_TZE200_b2u1drdv', '_TZE200_en3wvcbx', '_TZE200_eqpaxqdv', '_TZE200_fctwhugx',
  '_TZE200_feolm6rk', '_TZE200_fodv6bkr', '_TZE200_g5wdnuow', '_TZE200_g5xqosu7',
  '_TZE200_hojryzzd', '_TZE200_llm0epxg', '_TZE200_n1aauwb4', '_TZE200_odlldrxx',
  '_TZE200_ol5jlkkr', '_TZE200_osmxri8y', '_TZE200_rsj5pu8y', '_TZE200_tvrvdj6o',
  '_TZE200_yrugsphv', '_TZE200_zuz7f94z', '_TZE200_zyrdrmno', '_TZE204_dpqsvdbi',
  '_TZE204_g5xqosu7', '_TZE204_ic7jtutb', '_TZE204_m1wl5fvq', '_TZE204_nladmfvf',
  '_TZE204_odlldrxx', '_TZE204_q9xty0ad', '_TZE204_wzre8hu2', '_TZE204_yrugsphv',
  '_TZE284_4vobcgd3', '_TZE284_bjzrowv2', '_TZE284_fzo2pocs', '_TZE284_zofmmt9s',
];

/** False positives from curtain-z2m-missing report — never curtain_motor */
const FORBID_MFR = new Set([
  '_tze204_debczeci', '_tze284_debczeci', '_tze284_1lvln0x6',
  '_tze28c1000000_hgeqeyuv', '_tze28c1000000_pzm3wab5', '_tz3000_uim07oem',
  '_tz3000_qxcnwv26', '_tz3000_65ajyxua', '_tz3000_785olaiq',
  '_tz3000_avky2mvc', '_tz3000_kz1anoi8', '_tz3000_pv4puuxi',
  '_tz3000_qq9ahj6z',
  '_tze200_4pm4pekt', '_tze200_cq8lu23i', '_tze200_ka8l86iu',
  '_tze200_y8jijhba',
]);

/** Sibling-owned — must not steal into curtain_motor */
const TILT_ONLY = new Set([
  '_tze200_iossyxra', '_tze204_r0jdjrvi', '_tze200_r0jdjrvi',
  '_tze200_a8zrneee', '_tze200_ergbiejo', '_tze200_lwlvaony',
  '_tze200_pk29mnl3', '_tze200_sbordckq',
]);

const SHUTTER_ONLY = new Set([
  '_tze210_inpjmc0h', '_tze28c1000000_alh14edn', '_tze600_ogyg1y6b',
]);

const WALL_CURTAIN_ONLY = new Set([
  '_tze20c_xbexmf8h', '_tze284_kq1l5eu5',
]);

/** TS130F 2-gang modules — curtain_module_2_gang only (not TS0601 motor) */
const MODULE_2_GANG_MFR = ['_TZ3000_j1xl73iw', '_TZ3000_l6iqph4f'];

const MODULE_2_STEMS = ['j1xl73iw', 'l6iqph4f'];

const SIBLING_DRIVERS = [
  'curtain_motor_tilt',
  'curtain_motor_shutter',
  'wall_curtain_switch',
  'curtain_module',
  'curtain_module_2_gang',
];

const COVER_RE =
  /cover|curtain|blind|window pusher|tubular|roller blind|smart blind|cover motor|cover plug|sliding window|roller shade|curtain robot/i;
const EXCLUDE_RE =
  /presence|human presence|switch|valve|motion|radar|hue|kadrilj|thermostat|fcu|led strip|rgb|gang switch|water valve|1-gang switch|3-gang|mw motion/i;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

function normMfr(m) {
  return String(m || '').trim().toLowerCase();
}

function pairingVariants(mfr) {
  const m = String(mfr).trim();
  return [...new Set([m, m.toLowerCase(), m.toUpperCase()])];
}

function loadSiblingMfrs() {
  const set = new Set();
  for (const d of SIBLING_DRIVERS) {
    const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const compose = readJson(p);
    for (const m of compose.zigbee?.manufacturerName || []) set.add(normMfr(m));
  }
  return set;
}

function shouldStripFromCurtainMotor(m) {
  const ml = normMfr(m);
  if (FORBID_MFR.has(ml) || TILT_ONLY.has(ml) || SHUTTER_ONLY.has(ml) || WALL_CURTAIN_ONLY.has(ml)) {
    return true;
  }
  return MODULE_2_STEMS.some((stem) => ml.includes(stem));
}

function loadLiveZ2mFps() {
  const dir = path.join(ROOT, 'scripts/sync/data');
  if (!fs.existsSync(dir)) return [];
  const fps = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const j = readJson(path.join(dir, f));
    if (Array.isArray(j)) fps.push(...j);
    else if (j?.fingerprints) fps.push(...j.fingerprints);
    else if (typeof j === 'object') fps.push(...Object.values(j).filter((x) => x && typeof x === 'object'));
  }
  return fps;
}

function loadHerdsmanDevices() {
  const data = readJson(path.join(ROOT, 'data/z2m_herdsman_cache.json'));
  return data.devices || [];
}

function isVerifiedCover(mfr, pid, blob) {
  if (!mfr || !pid || !/^TS0601$/i.test(pid)) return false;
  if (FORBID_MFR.has(normMfr(mfr)) || TILT_ONLY.has(normMfr(mfr))) return false;
  if (SHUTTER_ONLY.has(normMfr(mfr)) || WALL_CURTAIN_ONLY.has(normMfr(mfr))) return false;
  if (MODULE_2_STEMS.some((stem) => normMfr(mfr).includes(stem))) return false;
  if (siblingMfrs.has(normMfr(mfr))) return false;
  if (!COVER_RE.test(blob) || EXCLUDE_RE.test(blob)) return false;
  return true;
}

function collectCandidates() {
  const candidates = new Map();

  for (const mfr of VERIFIED_CURTAIN_MOTOR_36) {
    candidates.set(normMfr(mfr), { mfr, pid: 'TS0601', source: 'verdict-36', model: 'TS0601_cover' });
  }

  for (const fp of loadLiveZ2mFps()) {
    const mfr = fp.mfr || fp.manufacturerName;
    const pid = fp.productId || fp.modelId || fp.modelID;
    const blob = `${fp.model || ''} ${fp.description || ''} ${fp.file || ''}`;
    if (!isVerifiedCover(mfr, pid, blob)) continue;
    const key = normMfr(mfr);
    if (!candidates.has(key)) {
      candidates.set(key, { mfr, pid: 'TS0601', source: 'live-z2m-crawl', model: fp.model, desc: fp.description });
    }
  }

  for (const d of loadHerdsmanDevices()) {
    const blob = `${d.model || ''} ${d.description || ''}`;
    const pids = (d.modelIds || []).filter((p) => /^TS0601$/i.test(p));
    if (!pids.length) continue;
    for (const mfr of d.mfrs || []) {
      if (!isVerifiedCover(mfr, 'TS0601', blob)) continue;
      const key = normMfr(mfr);
      if (!candidates.has(key)) {
        candidates.set(key, { mfr, pid: 'TS0601', source: 'z2m_herdsman', model: d.model, desc: d.description });
      }
    }
  }

  return [...candidates.values()].sort((a, b) => normMfr(a.mfr).localeCompare(normMfr(b.mfr)));
}

function addMfrsToCompose(compose, toAdd) {
  const set = new Set((compose.zigbee.manufacturerName || []).map(normMfr));
  let added = 0;
  for (const c of toAdd) {
    for (const v of pairingVariants(c.mfr)) {
      const k = normMfr(v);
      if (set.has(k)) continue;
      compose.zigbee.manufacturerName.push(v);
      set.add(k);
      added++;
    }
  }
  return { compose, added };
}

function stripFromCompose(compose) {
  const before = (compose.zigbee.manufacturerName || []).length;
  compose.zigbee.manufacturerName = (compose.zigbee.manufacturerName || []).filter((m) => {
    return !shouldStripFromCurtainMotor(m);
  });
  return { compose, removed: before - compose.zigbee.manufacturerName.length };
}

function stripMfrsFromCompose(composePath, mfrList) {
  const compose = readJson(composePath);
  const deny = new Set(mfrList.map(normMfr));
  const before = (compose.zigbee.manufacturerName || []).length;
  compose.zigbee.manufacturerName = (compose.zigbee.manufacturerName || []).filter((m) => !deny.has(normMfr(m)));
  return { compose, removed: before - compose.zigbee.manufacturerName.length };
}

const siblingMfrs = loadSiblingMfrs();
const candidates = collectCandidates();
const curtainPath = path.join(ROOT, 'drivers/curtain_motor/driver.compose.json');
const module2Path = path.join(ROOT, 'drivers/curtain_module_2_gang/driver.compose.json');
const climatePath = path.join(ROOT, 'drivers/climate_sensor/driver.compose.json');

const curtain = readJson(curtainPath);
const have = new Set((curtain.zigbee.manufacturerName || []).map(normMfr));
const toAdd = candidates.filter((c) => !have.has(normMfr(c.mfr)));

const stripFromClimate = ['_TZE200_BV1JCQQU', '_TZE284_iwyqtclw'];
const climateStrip = stripMfrsFromCompose(climatePath, stripFromClimate);

const curtainStripPreview = stripFromCompose(JSON.parse(JSON.stringify(curtain)));
const module2Add = MODULE_2_GANG_MFR.map((mfr) => ({ mfr, pid: 'TS130F', source: 'verdict-module-2' }));

console.log(`[apply-curtain-couples] candidates=${candidates.length} toAdd=${toAdd.length} strip_curtain=${curtainStripPreview.removed}`);
for (const c of toAdd) {
  console.log(`  + ${c.mfr} (${c.model || 'cover'}) [${c.source}]`);
}
if (curtainStripPreview.removed) {
  console.log(`[apply-curtain-couples] strip curtain_motor: ${curtainStripPreview.removed} rows (tilt/module/shutter/forbidden)`);
}
for (const c of MODULE_2_GANG_MFR) {
  console.log(`  → curtain_module_2_gang: ${c}`);
}
if (climateStrip.removed) {
  console.log(`[apply-curtain-couples] strip climate_sensor: ${climateStrip.removed}`);
}

if (!APPLY) {
  console.log('[apply-curtain-couples] dry-run — pass --apply to write');
  process.exit(0);
}

let curtainCompose = readJson(curtainPath);
const stripped = stripFromCompose(curtainCompose);
curtainCompose = stripped.compose;
const curtainAdd = addMfrsToCompose(curtainCompose, toAdd);
writeJson(curtainPath, curtainAdd.compose);

const module2Compose = readJson(module2Path);
const module2Added = addMfrsToCompose(module2Compose, module2Add);
writeJson(module2Path, module2Added.compose);

if (climateStrip.removed) writeJson(climatePath, climateStrip.compose);

const report = {
  generatedAt: new Date().toISOString(),
  verdict: 'curtain-z2m-missing-2026-09-01',
  verified36_present: VERIFIED_CURTAIN_MOTOR_36.every((m) =>
    curtainAdd.compose.zigbee.manufacturerName.some((x) => normMfr(x) === normMfr(m))),
  added: toAdd,
  stripped_from_curtain_motor: stripped.removed,
  module2_gang_added: MODULE_2_GANG_MFR,
  curtainMfrCount: curtainAdd.compose.zigbee.manufacturerName.length,
  climateStripped: climateStrip.removed,
};
writeJson(path.join(ROOT, 'reports/curtain-apply-latest.json'), report);
console.log(`[apply-curtain-couples] APPLIED +${toAdd.length} mfrs, -${stripped.removed} stripped, curtain total=${report.curtainMfrCount}`);
