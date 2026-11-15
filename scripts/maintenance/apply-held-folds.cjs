'use strict';
// P3330 publish-time fold of held drivers' exact couples into a published driver of the same class
// (SSOT lib/drivers/held-driver-folds.json, evidence docs/knowledge/athom-driver-ceiling.md).
// WHY: Athom refuses every upload above 347 drivers (AggregateError), so a never-published driver
// cannot ship as a new id. Its exact manufacturerName x productId couples are appended to the target
// entry of the PAYLOAD only (source composes untouched, so the duplicate-couple gates still see one
// owner per couple), and the target's onMapDeviceClass runs the held driver's own device class.
// Fail closed: a fold whose target is absent, of another class, already lists one of the makers, or
// whose cartesian expansion would create a couple already owned by another payload driver is an error.
const fs = require('fs');
const path = require('path');

function loadFolds(repoRoot) {
  const f = path.join(repoRoot, 'lib', 'drivers', 'held-driver-folds.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).folds || {} : {};
}

const arr = (v) => Array.isArray(v) ? v : v == null ? [] : [v];

function couplesOf(d) {
  const z = (d && d.zigbee) || {};
  const out = [];
  for (const m of arr(z.manufacturerName)) {for (const p of arr(z.productId)) {out.push(`${m}|${p}`);}}
  return out;
}

/**
 * @param manifest payload app.json (held drivers already dropped); mutated in place
 * @param heldIds Set of ids held out of THIS payload
 * @param folds { heldId: { into, manufacturerName[], productId[] } }
 * @param heldClasses optional { heldId: class } (source class of the held driver)
 */
/** Error string for a fold that cannot apply to this payload, else null. */
function foldBlocker(held, f, drivers, t, heldClasses) {
  if (drivers.some((d) => d && d.id === held)) { return `${held}: still in the payload, cannot fold`; }
  if (!t || !t.zigbee) { return `${held}: target ${f.into} absent from the payload`; }
  if (heldClasses[held] && t.class && heldClasses[held] !== t.class) { return `${held}: class ${heldClasses[held]} != target ${f.into} class ${t.class}`; }
  const lower = new Set(arr(t.zigbee.manufacturerName).map((m) => m.toLowerCase()));
  const clash = arr(f.manufacturerName).filter((m) => lower.has(m.toLowerCase()));
  if (clash.length) { return `${held}: target ${f.into} already lists maker(s) ${clash.join(', ')} (paired devices would change class)`; }
  return null;
}

/** Couples the fold would add to t, and those already owned by another payload driver. */
function foldExpansion(f, drivers, t) {
  const tM = arr(t.zigbee.manufacturerName); const tP = arr(t.zigbee.productId);
  const M = [...tM, ...arr(f.manufacturerName).filter((m) => !tM.includes(m))];
  const P = [...tP, ...arr(f.productId).filter((p) => !tP.includes(p))];
  const owners = new Map();
  for (const d of drivers) {
    if (!d || d === t) { continue; }
    for (const c of couplesOf(d)) { owners.set(c, d.id); }
  }
  const before = new Set(couplesOf(t));
  const added = []; const collide = [];
  for (const m of M) {
    for (const p of P) {
      const c = `${m}|${p}`;
      if (before.has(c)) { continue; }
      added.push(c);
      if (owners.has(c)) { collide.push(`${c}@${owners.get(c)}`); }
    }
  }
  return { M, P, added, collide, addM: M.length - tM.length, addP: P.length - tP.length };
}

/**
 * @param manifest payload app.json (held drivers already dropped); mutated in place
 * @param heldIds Set of ids held out of THIS payload
 * @param folds { heldId: { into, manufacturerName[], productId[] } }
 * @param heldClasses optional { heldId: class } (source class of the held driver)
 */
function applyHeldFolds(manifest, heldIds, folds, heldClasses = {}) {
  const res = { applied: [], errors: [], couples: 0 };
  const drivers = (manifest && manifest.drivers) || [];
  for (const [held, f] of Object.entries(folds || {})) {
    if (!heldIds || !heldIds.has(held)) { continue; } // released or graduated: the held driver ships itself
    const t = drivers.find((d) => d && d.id === f.into);
    const blocker = foldBlocker(held, f, drivers, t, heldClasses);
    if (blocker) { res.errors.push(blocker); continue; }
    const x = foldExpansion(f, drivers, t);
    if (x.collide.length) { res.errors.push(`${held} -> ${f.into}: ${x.collide.length} couple(s) already owned elsewhere: ${x.collide.slice(0, 5).join(', ')}`); continue; }
    const exact = arr(f.manufacturerName).flatMap((m) => arr(f.productId).map((p) => `${m}|${p}`));
    t.zigbee.manufacturerName = x.M; t.zigbee.productId = x.P;
    const now = new Set(couplesOf(t));
    const missing = exact.filter((c) => !now.has(c));
    if (missing.length) { res.errors.push(`${held}: couples not formed after fold: ${missing.join(', ')}`); continue; }
    res.applied.push({ held, into: f.into, couples: exact.length, addedMakers: x.addM, addedPids: x.addP, parasites: x.added.length - exact.length });
    res.couples += exact.length;
  }
  return res;
}

module.exports = { loadFolds, applyHeldFolds, couplesOf };
