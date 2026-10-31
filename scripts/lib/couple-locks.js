'use strict';
// P3089 (31/10/2026): the publish bot's re-inject and case-variant passes must respect decisions already
// taken in the repo. Two locks, read once and cached:
//  - config/architecture/p3077-phantom-decisions.json: an mfr moved off a driver (moves[].from) or dropped as a
//    parasite (parasiteDrops[]) must never be re-added there by an old manual-fix rule.
//  - config/architecture/exact-identity-drivers.json: a dedicated single-couple driver keeps its manufacturerName
//    byte-exact (no lower/Title twins), like the padded AOYAN case of P-KB4.
const fs = require('fs');
const path = require('path');

const cache = new Map();
function readJson(root, rel) {
  const key = `${root}::${rel}`;
  if (cache.has(key)) return cache.get(key);
  let v = null;
  try { v = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch (_) { v = null; }
  cache.set(key, v);
  return v;
}
const low = (s) => String(s || '').trim().toLowerCase();

function retiredOn(root, driverId, mfr) {
  const d = readJson(root, 'config/architecture/p3077-phantom-decisions.json');
  if (!d) return null;
  const m = low(mfr);
  const mv = (d.moves || []).find((x) => x.from === driverId && low(x.mfr) === m);
  if (mv) return `P3077 batch ${mv.batch}: kept on ${mv.keptOn}`;
  const pd = (d.parasiteDrops || []).find((x) => low(x.mfr) === m);
  if (pd) return 'P3077 parasite drop';
  return null;
}

function isExactIdentityDriver(root, driverId) {
  const d = readJson(root, 'config/architecture/exact-identity-drivers.json');
  return !!(d && d.drivers && Object.prototype.hasOwnProperty.call(d.drivers, driverId));
}

module.exports = { retiredOn, isExactIdentityDriver, _clearCache: () => cache.clear() };
