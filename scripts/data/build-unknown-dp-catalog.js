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
 * Output shape: { v, generated, src, names: [..], profiles: [[dp, nameIdx, dp, nameIdx, ..]], idx: { 'mfr|PID': profileIdx } }
 * Keys: lower-cased mfr, upper-cased PID. Deterministic (sorted) so re-runs diff cleanly.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'lib', 'zigbee', 'data', 'unknown-dp-catalog.json');

function build({ z2m, knowledge }) {
  const couples = new Map(); // key -> Map(dp -> name)
  const put = (mfr, pid, dp, name) => {
    if (!mfr || !pid || !Number.isFinite(Number(dp)) || !name) { return; }
    const key = `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
    if (!couples.has(key)) { couples.set(key, new Map()); }
    couples.get(key).set(Number(dp), String(name).slice(0, 48));
  };
  for (const [mfr, row] of Object.entries((z2m && z2m.dp) || {})) {
    for (const d of (row && row.dps) || []) { put(mfr, row.model || 'TS0601', d.d, d.n); }
  }
  for (const [key, row] of Object.entries((knowledge && knowledge.couples) || {})) {
    const [mfr, pid] = key.split('|');
    for (const [dp, info] of Object.entries((row && row.dps) || {})) { put(mfr, pid, dp, info && info.name); }
  }
  const names = [...new Set([...couples.values()].flatMap((m) => [...m.values()]))].sort();
  const nameIdx = new Map(names.map((n, i) => [n, i]));
  const profiles = [];
  const profKey = new Map();
  const idx = {};
  for (const key of [...couples.keys()].sort()) {
    const flat = [...couples.get(key).entries()].sort((a, b) => a[0] - b[0]).flatMap(([dp, n]) => [dp, nameIdx.get(n)]);
    const k = flat.join(',');
    if (!profKey.has(k)) { profKey.set(k, profiles.length); profiles.push(flat); }
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
    v: 1,
    caps,
    src: 'z2m tuyaDatapoints names (zigbee-herdsman-converters, MIT) + data/dp_couple_knowledge.json',
    names,
    profiles,
    idx,
  };
}

if (require.main === module) {
  const z2m = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'z2m-data.json'), 'utf8'));
  const knowledge = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dp_couple_knowledge.json'), 'utf8'));
  const out = build({ z2m, knowledge });
  out.generated = (z2m && z2m.date) || null;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`unknown-dp-catalog: ${Object.keys(out.idx).length} couples, ${out.profiles.length} profiles, ${out.names.length} names, ${fs.statSync(OUT).size} bytes`);
}

module.exports = { build };
