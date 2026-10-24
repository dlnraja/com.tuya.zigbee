#!/usr/bin/env node
'use strict';

/**
 * P3018b: LOW-CONFIDENCE "inferred" DP layer, built ONLY from exact catalogue rows.
 *
 * For a DP that has no exact converter for its own couple, look at the couples of the same
 * family that DO have one for the same DP id:
 *   tier 1 'pid'      — same productId AND same Homey driver (category);  support ≥ 2, agreement ≥ 2/3
 *   tier 2 'category' — same Homey driver, any productId;                 support ≥ 3, agreement ≥ 3/4
 *   tier 3 'name'     — same DP id carrying the same NAME in other catalogue couples (any driver);
 *                       support ≥ 3, agreement ≥ 3/4 — only for DPs whose own source gives that name
 * The dominant (name, converter) becomes a candidate labelled `inferred`. It is never a fact:
 * the runtime (lib/zigbee/InferredDpLayer.js) only uses it when no exact decoder exists, range-
 * checks every report, and writes a capability only after real reports confirm it per device.
 *
 * Output: lib/zigbee/data/inferred-dp-family.json
 *   { v:1, label:'inferred', names:[..], convs:[..], fam: { 'PID|driver' | '*|driver' | 'n:name': [dp, nameIdx, convIdx, support, total, ...] } }
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'lib', 'zigbee', 'data', 'inferred-dp-family.json');

function build({ drivers, coupleDps, allCouples = [] }) {
  // family → dp → Map("name\tconv" → Set(couple))
  const fam = new Map();
  const bump = (fk, dp, name, conv, couple) => {
    if (!fam.has(fk)) { fam.set(fk, new Map()); }
    const f = fam.get(fk);
    if (!f.has(dp)) { f.set(dp, new Map()); }
    const k = `${name}\t${conv}`;
    if (!f.get(dp).has(k)) { f.get(dp).set(k, new Set()); }
    f.get(dp).get(k).add(couple);
  };
  for (const d of drivers) {
    const mfrs = [...new Set(d.mfrs.map((m) => m.toLowerCase()))];
    for (const pid of d.pids) {
      for (const mfr of mfrs) {
        const couple = `${mfr}|${pid}`;
        for (const e of coupleDps(mfr, pid)) {
          if (!e.conv || !e.name || /^other\b/.test(e.conv)) { continue; }
          bump(`${pid}|${d.id}`, e.dp, e.name, e.conv, couple);
          bump(`*|${d.id}`, e.dp, e.name, e.conv, couple);
        }
      }
    }
  }
  // tier 3: name+dp over every catalogue couple (driver-served or not). WHY(bounded size): only
  // name+dp pairs that some couple actually lacks a converter for are kept.
  const need = new Set();
  for (const [mfr, pid] of allCouples) { for (const e of coupleDps(mfr, pid)) { if (e.name && !e.conv) { need.add(`n:${e.name}\t${e.dp}`); } } }
  for (const [mfr, pid] of allCouples) {
    for (const e of coupleDps(mfr, pid)) {
      if (!e.conv || !e.name || /^other\b/.test(e.conv)) { continue; }
      if (need.has(`n:${e.name}\t${e.dp}`)) { bump(`n:${e.name}`, e.dp, e.name, e.conv, `${mfr}|${pid}`); }
    }
  }
  const names = new Map();
  const convs = new Map();
  const id = (m, v) => { if (!m.has(v)) { m.set(v, m.size); } return m.get(v); };
  const out = {};
  for (const fk of [...fam.keys()].sort()) {
    const tierCat = fk.startsWith('*|') || fk.startsWith('n:');
    const minSup = tierCat ? 3 : 2;
    const minAgree = tierCat ? 0.75 : 2 / 3;
    const flat = [];
    for (const dp of [...fam.get(fk).keys()].sort((a, b) => a - b)) {
      const opts = [...fam.get(fk).get(dp).entries()].map(([k, s]) => [k, s.size]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      const total = opts.reduce((a, o) => a + o[1], 0);
      const [k, sup] = opts[0];
      if (sup < minSup || sup / total < minAgree) { continue; }
      const [name, conv] = k.split('\t');
      flat.push(dp, id(names, name), id(convs, conv), sup, total);
    }
    if (flat.length) { out[fk] = flat; }
  }
  return { v: 1, label: 'inferred', names: [...names.keys()], convs: [...convs.keys()], fam: out };
}

if (require.main === module) {
  const { driverInfo } = require('../kb/dp-endpoint-coverage');
  const D = require('../../lib/zigbee/DpCatalogDecoder');
  const dir = path.join(ROOT, 'drivers');
  const drivers = fs.readdirSync(dir).filter((x) => fs.existsSync(path.join(dir, x, 'driver.compose.json'))).sort().map((x) => driverInfo(path.join(dir, x)));
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'zigbee', 'data', 'unknown-dp-catalog.json'), 'utf8'));
  const allCouples = Object.keys(cat.idx || {}).sort().map((k) => k.split('|'));
  const out = build({ drivers, coupleDps: D.coupleDps, allCouples });
  const next = JSON.stringify(out);
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev !== next) { fs.writeFileSync(OUT, next); }
  const rows = Object.values(out.fam).reduce((a, f) => a + f.length / 5, 0);
  console.log(`inferred-dp-family: families=${Object.keys(out.fam).length} rows=${rows} bytes=${Buffer.byteLength(next)}${prev === next ? ' (unchanged)' : ''}`);
}

module.exports = { build };
