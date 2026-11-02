'use strict';
// WHY(P3206, 02/11/2026 Paris): one shared resolver for driver chains (root -> <root>_2 -> <root>_3 ...).
// Every tool (enrich/add-couple, one-couple-one-driver and conflict audits, coverage matrix, Device Finder,
// SSOT, publish compaction, workflows and AI prompts) must resolve chains here, never by name guessing.
// Pure, synchronous, no Homey dependency: safe in app runtime (lazy require) and in Node CI scripts.
const path = require('path');

const REGISTRY_REL = path.join('config', 'architecture', 'driver-continuations.json');
const cache = new Map();

function load(repoRoot) {
  const root = repoRoot || path.join(__dirname, '..', '..');
  if (cache.has(root)) {return cache.get(root);}
  let raw = { drivers: {} };
  try { raw = require(path.join(root, REGISTRY_REL)); } catch (_) { /* failsafe: no chains */ }
  const reg = fromObject(raw);
  cache.set(root, reg);
  return reg;
}

function fromObject(raw) {
  const drivers = raw && raw.drivers && typeof raw.drivers === 'object' ? raw.drivers : {};
  const cap = Object.assign({ perDriverCombos: 1500, fullAtRatio: 0.95 }, raw && raw.cap);
  const entry = (id) => drivers[id] || {};
  /** Root (logical) id of any driver: follows continuationOf; a plain driver is its own root. */
  const rootOf = (id) => {
    let cur = id; const seen = new Set();
    while (entry(cur).continuationOf && !seen.has(cur)) { seen.add(cur); cur = entry(cur).continuationOf; }
    return cur;
  };
  /** Ordered chain [root, root_2, ...] following continuation links from the root. */
  const chainOf = (id) => {
    const out = []; const seen = new Set();
    let cur = rootOf(id);
    while (cur && !seen.has(cur)) { seen.add(cur); out.push(cur); cur = entry(cur).continuation; }
    return out;
  };
  /** Where a NEW couple goes: first driver of the chain not marked full (the last one if all are full). */
  const firstNonFull = (id) => { const c = chainOf(id); return c.find((d) => !entry(d).full) || c[c.length - 1]; };
  const isSameLogical = (a, b) => rootOf(a) === rootOf(b);
  const isContinuation = (id) => Boolean(entry(id).continuationOf);
  return { drivers, cap, entry, rootOf, chainOf, firstNonFull, isSameLogical, isContinuation, logicalId: rootOf };
}

function clearCache() {
  cache.clear();
  for (const k of Object.keys(require.cache)) {if (k.endsWith('driver-continuations.json')) {delete require.cache[k];}}
}

module.exports = { load, fromObject, clearCache, REGISTRY_REL };
