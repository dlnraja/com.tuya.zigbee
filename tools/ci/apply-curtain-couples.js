#!/usr/bin/env node
'use strict';

/**
 * apply-curtain-couples.js (P2363+)
 * Harvest verified cover motors from live Z2M crawl + local caches;
 * add to curtain_motor; strip wrong-class bleed (climate/switch).
 *
 * Usage:
 *   node tools/ci/apply-curtain-couples.js           # dry-run
 *   node tools/ci/apply-curtain-couples.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');

const FORBID_MFR = new Set([
  '_tze204_debczeci', '_tze284_debczeci', '_tze284_1lvln0x6',
  '_tze284_hgeqeyuv', '_tze284_pzm3wab5', '_tz3000_uim07oem',
  '_tz3000_qxcnwv26', '_tz3000_65ajyxua', '_tz3000_785olaiq',
  '_tz3000_avky2mvc', '_tz3000_kz1anoi8', '_tz3000_pv4puuxi',
  '_tz3000_qq9ahj6z',
  '_tze200_4pm4pekt', '_tze200_cq8lu23i', '_tze200_ka8l86iu',
  '_tze200_y8jijhba',
]);

const TILT_ONLY = new Set([
  '_tze200_iossyxra', '_tze204_r0jdjrvi', '_tze200_r0jdjrvi',
  '_tze200_a8zrneee', '_tze200_ergbiejo', '_tze200_lwlvaony',
  '_tze200_pk29mnl3', '_tze200_sbordckq',
]);

const SIBLING_DRIVERS = [
  'curtain_motor_tilt',
  'curtain_motor_shutter',
  'wall_curtain_switch',
  'curtain_module',
  'curtain_module_2_gang',
];

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

const COVER_RE =
  /cover|curtain|blind|window pusher|tubular|roller blind|smart blind|cover motor|cover plug|sliding window|roller shade|curtain robot/i;
const EXCLUDE_RE =
  /presence|human presence|switch|valve|motion|radar|hue|kadrilj|thermostat|fcu|led strip|rgb|gang switch|water valve|1-gang switch|3-gang|mw motion/i;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data, pretty = true) {
  fs.writeFileSync(p, pretty ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data));
}

function normMfr(m) {
  return String(m || '').trim().toLowerCase();
}

function pairingVariants(mfr) {
  const m = String(mfr).trim();
  const out = new Set([m, m.toLowerCase(), m.toUpperCase()]);
  return [...out];
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
  if (siblingMfrs.has(normMfr(mfr))) return false;
  if (!COVER_RE.test(blob) || EXCLUDE_RE.test(blob)) return false;
  return true;
}

function collectCandidates() {
  const candidates = new Map();

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

function addMfrsToCompose(composePath, toAdd) {
  const compose = readJson(composePath);
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

function stripMfrsFromCompose(composePath, patterns) {
  const compose = readJson(composePath);
  const before = (compose.zigbee.manufacturerName || []).length;
  compose.zigbee.manufacturerName = (compose.zigbee.manufacturerName || []).filter((m) => {
    const ml = normMfr(m);
    return !patterns.some((p) => (typeof p === 'string' ? ml === normMfr(p) : p.test(m)));
  });
  return { compose, removed: before - compose.zigbee.manufacturerName.length };
}

const siblingMfrs = loadSiblingMfrs();
const candidates = collectCandidates();
const curtainPath = path.join(ROOT, 'drivers/curtain_motor/driver.compose.json');
const curtain = readJson(curtainPath);
const have = new Set((curtain.zigbee.manufacturerName || []).map(normMfr));
const toAdd = candidates.filter((c) => !have.has(normMfr(c.mfr)));

const stripFromClimate = ['_TZE200_BV1JCQQU', '_TZE284_iwyqtclw'];

console.log(`[apply-curtain-couples] candidates=${candidates.length} toAdd=${toAdd.length}`);
for (const c of toAdd) {
  console.log(`  + ${c.mfr} (${c.model || 'cover'}) [${c.source}]`);
}

const climatePath = path.join(ROOT, 'drivers/climate_sensor/driver.compose.json');
const climateStrip = stripMfrsFromCompose(climatePath, stripFromClimate.map(normMfr));
if (climateStrip.removed) {
  console.log(`[apply-curtain-couples] strip climate_sensor: ${climateStrip.removed} (${stripFromClimate.join(', ')})`);
}

if (!APPLY) {
  console.log('[apply-curtain-couples] dry-run — pass --apply to write');
  process.exit(0);
}

const curtainAdd = addMfrsToCompose(curtainPath, toAdd);
writeJson(curtainPath, curtainAdd.compose);
if (climateStrip.removed) writeJson(climatePath, climateStrip.compose);

const report = {
  generatedAt: new Date().toISOString(),
  added: toAdd,
  curtainMfrCount: curtainAdd.compose.zigbee.manufacturerName.length,
  climateStripped: climateStrip.removed,
};
writeJson(path.join(ROOT, 'reports/curtain-apply-latest.json'), report);
console.log(`[apply-curtain-couples] APPLIED +${toAdd.length} mfrs (${curtainAdd.added} variant rows), curtain total=${report.curtainMfrCount}`);
