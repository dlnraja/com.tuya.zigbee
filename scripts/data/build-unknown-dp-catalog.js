#!/usr/bin/env node
'use strict';

/**
 * P3017: build lib/zigbee/data/unknown-dp-catalog.json — compact per-couple DP NAME catalogue
 * used by UnknownCommandInterpreter.interpretDp (step 1b) to turn an "unknown" EF00 DP into a
 * sourced semantic (button press / state / measurement / alarm / config echo).
 *
 * Inputs (rewritten facts only, no code copied):
 *  - scripts/data/z2m-data.json `dp` — names harvested from Koenkk/zigbee-herdsman-converters
 *    src/devices/*.ts tuyaDatapoints (MIT), see docs/knowledge/KB_SOURCES.md for the pointer;
 *  - data/dp_couple_knowledge.json — project-owned per-couple research (overrides Z2M names).
 * Output shape: { v, generated, src, names: [..], profiles: [[dp, nameIdx, dp, nameIdx, ..]], idx: { 'mfr|PID': profileIdx },
 *                 convs: [token..], cv: [[convIdx|-1 per DP of profiles[i]]] }   (convs/cv: P3018, additive)
 * P3018 input: scripts/data/z2m-tuya-dps.json (scripts/data/harvest-z2m-tuya-dps.js) — exact couples + converters.
 * Keys: lower-cased mfr, upper-cased PID. Deterministic (sorted) so re-runs diff cleanly.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { NAME_CAP } = require('../../lib/zigbee/DpCatalogDecoder');
const OUT = path.join(ROOT, 'lib', 'zigbee', 'data', 'unknown-dp-catalog.json');

function build({ z2m, knowledge, tuyaDps }) {
  const couples = new Map(); // key -> Map(dp -> name)
  const convs = new Map(); // key -> Map(dp -> converter token)  (P3018)
  const put = (mfr, pid, dp, name, conv, override = true) => {
    if (!mfr || !pid || !Number.isFinite(Number(dp)) || !name) { return; }
    const key = `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
    if (!couples.has(key)) { couples.set(key, new Map()); convs.set(key, new Map()); }
    if (!override && couples.get(key).has(Number(dp))) { return; }
    couples.get(key).set(Number(dp), String(name).slice(0, 48));
    // WHY: 'other:*' converters (schedules, local helpers) have no generic decoder → keep the DP
    // as a generic typed value instead of shipping an unusable token (bounded catalog size).
    if (conv && /^other\b|^lookup$/.test(String(conv))) { conv = null; }
    if (conv) { convs.get(key).set(Number(dp), String(conv).slice(0, 160)); } else if (override) { convs.get(key).delete(Number(dp)); }
  };
  for (const [mfr, row] of Object.entries((z2m && z2m.dp) || {})) {
    for (const d of (row && row.dps) || []) { put(mfr, row.model || 'TS0601', d.d, d.n); }
  }
  // P3018: exact per-couple harvest (every fingerprint of the definition + converter token).
  // Same upstream facts, so it overrides the older name-only row for the same couple+DP.
  for (const [key, rows] of Object.entries((tuyaDps && tuyaDps.couples) || {})) {
    const [mfr, pid] = key.split('|');
    for (const [dp, name, conv] of rows || []) { put(mfr, pid, dp, name, conv); }
  }
  for (const [key, row] of Object.entries((knowledge && knowledge.couples) || {})) {
    const [mfr, pid] = key.split('|');
    for (const [dp, info] of Object.entries((row && row.dps) || {})) {
      const div = info && Number(info.divisor);
      const k = `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
      const prev = convs.has(k) ? convs.get(k).get(Number(dp)) : undefined;
      const prevName = couples.has(k) ? couples.get(k).get(Number(dp)) : undefined;
      // project research wins on the name; its divisor (when present) is the exact decoder.
      // WHY: the upstream converter is only kept when both sources agree on the meaning
      // (same name or same Homey capability) — never decode with a converter for another DP meaning.
      const sameMeaning = prevName && info && (prevName === info.name || (NAME_CAP[prevName] && (NAME_CAP[prevName] === info.name || NAME_CAP[prevName] === info.capability)));
      put(mfr, pid, dp, info && info.name, Number.isFinite(div) && div > 1 ? `div:${div}` : (sameMeaning ? prev : null));
    }
  }
  const names = [...new Set([...couples.values()].flatMap((m) => [...m.values()]))].sort();
  const nameIdx = new Map(names.map((n, i) => [n, i]));
  const convList = [...new Set([...convs.values()].flatMap((m) => [...m.values()]))].sort();
  const convIdx = new Map(convList.map((c, i) => [c, i]));
  const profiles = [];
  const cv = []; // P3018: parallel to profiles — converter index per DP (-1 = unknown → generic typed value)
  const profKey = new Map();
  const idx = {};
  for (const key of [...couples.keys()].sort()) {
    const ent = [...couples.get(key).entries()].sort((a, b) => a[0] - b[0]);
    const flat = ent.flatMap(([dp, n]) => [dp, nameIdx.get(n)]);
    const cflat = ent.map(([dp]) => (convs.get(key).has(dp) ? convIdx.get(convs.get(key).get(dp)) : -1));
    const k = `${flat.join(',')}/${cflat.join(',')}`;
    if (!profKey.has(k)) { profKey.set(k, profiles.length); profiles.push(flat); cv.push(cflat); }
    idx[key] = profKey.get(k);
  }
  // P3017: capability → DP for refresh chains (project-owned research only, sorted).
  const caps = {};
  for (const key of Object.keys((knowledge && knowledge.couples) || {}).sort()) {
    const [mfr, pid] = key.split('|');
    const row = knowledge.couples[key];
    const m = {};
    for (const [dp, info] of Object.entries((row && row.dps) || {})) {
      if (info && typeof info.capability === 'string' && m[info.capability] === undefined) { m[info.capability] = Number(dp); }
    }
    if (mfr && pid && Object.keys(m).length) { caps[`${mfr.toLowerCase()}|${pid.toUpperCase()}`] = m; }
  }
  return {
    v: 2,
    caps,
    src: 'z2m tuyaDatapoints names+converters (zigbee-herdsman-converters, MIT) + data/dp_couple_knowledge.json',
    names,
    profiles,
    idx,
    convs: convList,
    cv,
  };
}

if (require.main === module) {
  const z2m = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'z2m-data.json'), 'utf8'));
  const knowledge = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dp_couple_knowledge.json'), 'utf8'));
  const tdPath = path.join(ROOT, 'scripts', 'data', 'z2m-tuya-dps.json');
  const tuyaDps = fs.existsSync(tdPath) ? JSON.parse(fs.readFileSync(tdPath, 'utf8')) : null;
  const out = build({ z2m, knowledge, tuyaDps });
  out.generated = (tuyaDps && tuyaDps.date) || (z2m && z2m.date) || null;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`unknown-dp-catalog: ${Object.keys(out.idx).length} couples, ${out.profiles.length} profiles, ${out.names.length} names, ${fs.statSync(OUT).size} bytes`);
}

module.exports = { build };
