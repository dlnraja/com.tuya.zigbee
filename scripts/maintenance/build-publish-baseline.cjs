#!/usr/bin/env node
'use strict';
/**
 * WHY(P3024b): (re)build the publish couple baseline from real payload app.json files.
 *
 * The baseline is the set of exact Zigbee pairing couples (manufacturerName x productId,
 * cartesian per driver, exact case) that a publish must never lose. The compactor pins
 * every couple of it and prepare-publish fails when one would disappear.
 *
 * Additive by design: --merge keeps every couple already in the baseline and only adds
 * the couples of the given payload. A driver list never shrinks.
 *
 * Usage:
 *   node scripts/maintenance/build-publish-baseline.cjs <payload app.json> --label "<text>" [--merge] [--out file]
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_OUT = path.join(__dirname, '..', '..', 'test', 'fixtures', 'athom-last-test-package-couples.json');

function payloadDrivers(manifest) {
  const out = {};
  for (const d of (manifest && manifest.drivers) || []) {
    if (!d || !d.zigbee) continue;
    const m = (d.zigbee.manufacturerName || []).filter((v) => typeof v === 'string' && v.trim());
    const p = (d.zigbee.productId || []).filter((v) => typeof v === 'string' && v.trim());
    if (!m.length || !p.length) continue;
    out[d.id] = { m: [...new Set(m)], p: [...new Set(p)] };
  }
  return out;
}

function mergeDrivers(base, add) {
  const out = {};
  for (const [id, v] of Object.entries(base || {})) out[id] = { m: [...v.m], p: [...v.p] };
  for (const [id, v] of Object.entries(add || {})) {
    const cur = out[id] || (out[id] = { m: [], p: [] });
    for (const x of v.m) if (!cur.m.includes(x)) cur.m.push(x);
    for (const x of v.p) if (!cur.p.includes(x)) cur.p.push(x);
  }
  return out;
}

function countCouples(drivers) {
  return Object.values(drivers || {}).reduce((s, v) => s + v.m.length * v.p.length, 0);
}

function main(argv) {
  const args = argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  if (!file) {
    console.error('usage: build-publish-baseline.cjs <payload app.json> --label "<text>" [--merge] [--out file]');
    return 2;
  }
  const outFile = flag('--out') || DEFAULT_OUT;
  const label = flag('--label') || path.basename(file);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const prev = args.includes('--merge') && fs.existsSync(outFile)
    ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
    : null;
  const drivers = mergeDrivers(prev ? prev.drivers : {}, payloadDrivers(manifest));
  const next = {
    ...(prev || {}),
    sources: [...((prev && prev.sources) || []), { label, version: manifest.version, couples: countCouples(payloadDrivers(manifest)) }],
    couples: countCouples(drivers),
    exemptions: (prev && prev.exemptions) || [],
    drivers,
  };
  fs.writeFileSync(outFile, `${JSON.stringify(next)}\n`);
  console.log(`[baseline] ${outFile}: ${Object.keys(drivers).length} drivers, ${next.couples} couples`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { payloadDrivers, mergeDrivers, countCouples };
