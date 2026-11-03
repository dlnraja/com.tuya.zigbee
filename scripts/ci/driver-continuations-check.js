#!/usr/bin/env node
'use strict';
// WHY(P3206): CI consistency check for config/architecture/driver-continuations.json (docs/rules/DRIVER_CONTINUATIONS.md).
//  - every link is reciprocal (root.continuation <-> next.continuationOf root, index = position + 1), no cycle;
//  - every continuation is reachable from its root and has drivers/<id>/driver.compose.json;
//  - no caseless mfr+pid couple is listed by two drivers of one chain (a chain is ONE logical driver);
//  - full flags are accurate: a driver marked full has a continuation and compose combos >= cap*ratio;
//    a non-full driver is not followed by a continuation that already carries couples (couples would skip it).
// Exit 1 on any error. Usage: node scripts/ci/driver-continuations-check.js [repoRoot]
const fs = require('fs');
const path = require('path');
const DC = require('../../lib/drivers/DriverContinuations');

function compose(root, id) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8')); } catch (_) { return null; }
}
const list = (v) => [].concat(v || []).filter((x) => typeof x === 'string' && x);

function check(root, raw) {
  const reg = raw ? DC.fromObject(raw) : (DC.clearCache(), DC.load(root));
  const errors = [];
  const ids = Object.keys(reg.drivers);
  const roots = new Set(ids.map((id) => reg.rootOf(id)));
  const reached = new Set();
  for (const r of roots) {
    if (reg.entry(r).continuationOf) { errors.push(`cycle at ${r}`); continue; }
    const chain = reg.chainOf(r);
    chain.forEach((id, i) => {
      reached.add(id);
      const e = reg.entry(id);
      if (i > 0 && (e.continuationOf !== r || e.index !== i + 1)) {errors.push(`${id}: expected { continuationOf: '${r}', index: ${i + 1} }`);}
      if (e.continuation && reg.entry(e.continuation).continuationOf !== r) {errors.push(`${id}.continuation ${e.continuation} does not point back to ${r}`);}
      if (e.continuation && !compose(root, e.continuation)) {errors.push(`${e.continuation}: drivers/${e.continuation}/driver.compose.json missing`);}
    });
    const seen = new Map();
    const combos = [];
    for (const id of chain) {
      const z = (compose(root, id) || {}).zigbee || {};
      const m = list(z.manufacturerName); const p = list(z.productId);
      combos.push(m.length * p.length);
      for (const a of m) {for (const b of p) {
        const k = `${a.toLowerCase()}|${b.toUpperCase()}`;
        if (seen.has(k) && seen.get(k) !== id) {errors.push(`${k} duplicated in chain ${r}: ${seen.get(k)} and ${id}`);}
        else {seen.set(k, id);}
      }}
    }
    chain.forEach((id, i) => {
      const e = reg.entry(id);
      const lim = Math.floor(reg.cap.perDriverCombos * reg.cap.fullAtRatio);
      if (e.full && !e.continuation) {errors.push(`${id}: full without continuation`);}
      if (e.full && combos[i] < lim) {errors.push(`${id}: marked full but ${combos[i]} combos < ${lim}`);}
      if (!e.full && i < chain.length - 1 && combos[i + 1] > 0) {errors.push(`${id}: not full but its continuation already carries couples`);}
    });
  }
  // P3264: a continuation never ships as its own id (347 cap); it must be held so P3229 folds it into its root.
  let held = new Set();
  try { held = new Set((JSON.parse(fs.readFileSync(path.join(root, 'config', 'publish-hold-drivers.json'), 'utf8')).drivers || []).map((d) => (typeof d === 'string' ? d : d.id))); } catch (_) { held = null; }
  if (held) for (const id of ids) if (reg.entry(id).continuationOf && !held.has(id)) errors.push(`${id}: continuation not in config/publish-hold-drivers.json (would ship a new driver id beyond the 347 cap, P3264)`);
  for (const id of ids) {if (reg.entry(id).continuationOf && !reached.has(id)) {errors.push(`${id}: continuation not reachable from ${reg.entry(id).continuationOf}`);}}
  return { errors, chains: roots.size, drivers: ids.length };
}

module.exports = { check };
if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
  const r = check(root);
  console.log(`[P3206] driver continuations: ${r.chains} chain(s), ${r.drivers} registry entr(ies), ${r.errors.length} error(s)`);
  for (const e of r.errors) {console.error(`  - ${e}`);}
  process.exit(r.errors.length ? 1 : 0);
}
