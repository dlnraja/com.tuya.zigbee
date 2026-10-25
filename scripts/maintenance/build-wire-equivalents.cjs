#!/usr/bin/env node
'use strict';
/**
 * WHY(P3027b): record, next to each pinned couple of the P3024b fixture, the
 * wire-shaped spelling of a minted case form (_tz3000_abcd / _TZ3000_ABCD /
 * ts0601 -> _TZ3000_abcd / TS0601). Additive: the pinned strings stay in
 * fixture.drivers untouched; only fixture.wireEquivalents is (re)written.
 *
 * A mapping is recorded only when the wire form already exists, byte-exact, in
 * the same driver (fixture or app.json source) and is the single wire-shaped
 * spelling of that caseless key. Nothing is invented. Evidence outliers
 * (data/case-variant-wire-evidence.json) are never mapped.
 *
 * The compactor uses the map only when HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT=1
 * (default off). Rule: docs/knowledge/KB/CASE_VARIANTS.md
 *
 * Usage: node scripts/maintenance/build-wire-equivalents.cjs [--check]
 */
const fs = require('fs');
const path = require('path');
const ev = require('./case-variant-evidence.cjs');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'athom-last-test-package-couples.json');

function buildWireEquivalents(fixture, manifest, evidence) {
  const src = new Map();
  for (const d of (manifest && manifest.drivers) || []) {
    if (d && d.zigbee) src.set(d.id, d.zigbee);
  }
  const keep = evidence || new Set();
  const out = {};
  let mfr = 0;
  let pid = 0;
  for (const [id, entry] of Object.entries((fixture && fixture.drivers) || {})) {
    const z = src.get(id) || {};
    const pick = (value, pool, isTuya, isWire, key) => {
      if (typeof value !== 'string' || keep.has(value) || !isTuya(value) || isWire(value)) return null;
      const want = key(value);
      const cands = [...new Set(pool)].filter((v) => typeof v === 'string' && isWire(v) && key(v) === want);
      return cands.length === 1 ? cands[0] : null;
    };
    const mPool = [...(entry.m || []), ...(z.manufacturerName || [])];
    const pPool = [...(entry.p || []), ...(z.productId || [])];
    const m = {};
    const p = {};
    for (const v of entry.m || []) {
      const w = pick(v, mPool, ev.isTuyaMfr, ev.isWireShapedMfr, (s) => s.toLowerCase());
      if (w) m[v] = w;
    }
    for (const v of entry.p || []) {
      const w = pick(v, pPool, ev.isTuyaPid, ev.isWireShapedPid, (s) => s.toUpperCase());
      if (w) p[v] = w;
    }
    const nm = Object.keys(m).length;
    const np = Object.keys(p).length;
    if (nm || np) {
      out[id] = {};
      if (nm) out[id].m = m;
      if (np) out[id].p = p;
      mfr += nm;
      pid += np;
    }
  }
  return {
    _doc: 'P3027b: minted case form -> wire form already present in the same driver. Used only when HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT=1. Pinned strings in drivers stay. See docs/knowledge/KB/CASE_VARIANTS.md',
    mfr,
    pid,
    drivers: out,
  };
}

/** Baseline copy whose pins use the wire form (only for the opt-in mode). */
function applyWireEquivalents(baseline) {
  const eq = baseline && baseline.wireEquivalents && baseline.wireEquivalents.drivers;
  if (!eq) return baseline;
  const drivers = {};
  for (const [id, entry] of Object.entries(baseline.drivers || {})) {
    const e = eq[id] || {};
    const map = (list, m) => [...new Set((list || []).map((v) => (m && m[v]) || v))];
    drivers[id] = { ...entry, m: map(entry.m, e.m), p: map(entry.p, e.p) };
  }
  return { ...baseline, drivers };
}

function wireEquivalentEnabled(opts = {}) {
  if (opts.pinWireEquivalent !== undefined) return opts.pinWireEquivalent === true;
  return process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT === '1';
}

function main(argv) {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const next = buildWireEquivalents(fixture, manifest, ev.loadWireEvidence(ROOT));
  if (argv.includes('--check')) {
    const cur = JSON.stringify(fixture.wireEquivalents || null);
    console.log(`[P3027b] wireEquivalents: ${next.mfr} mfr, ${next.pid} pid${cur === JSON.stringify(next) ? ' (up to date)' : ' (STALE)'}`);
    return 0;
  }
  fixture.wireEquivalents = next;
  fs.writeFileSync(FIXTURE, `${JSON.stringify(fixture)}\n`);
  console.log(`[P3027b] wrote wireEquivalents: ${next.mfr} mfr, ${next.pid} pid, ${Object.keys(next.drivers).length} drivers`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { buildWireEquivalents, applyWireEquivalents, wireEquivalentEnabled };
