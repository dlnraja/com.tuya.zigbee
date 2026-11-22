#!/usr/bin/env node
'use strict';
/**
 * P3395 — enforce config/architecture/curated-couple-removals.json DURING enrichment.
 *
 * WHY: fleet-enrich sub-steps (market/curtain/infer/class enrich) kept re-adding couples that a
 * human removed on purpose (P2698 _TZE284_rlytpmij -> curtain_motor, run 45066450460). The
 * automation-couple-guard only reverts at commit time, but the "Sacred + anti-bot gates" step
 * runs BEFORE that and failed on "NEW dual couple". This tool strips ONLY the denied mfr strings
 * from the driver they were removed from (case-insensitive), leaving every other enrichment in place.
 * Same rule source and semantics as automation-couple-guard.js (DENY_READDED); pids are never
 * touched (a pid is shared by many mfrs).
 *
 * Usage:
 *   node tools/ci/strip-curated-couple-removals.js            # check: list re-added couples, exit 1 if any
 *   node tools/ci/strip-curated-couple-removals.js --apply    # strip them from driver.compose.json, exit 0
 *   STRIP_ROOT=<dir> overrides the repo root (tests).
 * Pure Node, no deps, no network.
 */
const fs = require('fs');
const path = require('path');

const lc = (s) => String(s || '').trim().toLowerCase();

/** Map driver -> Set(lowercased denied mfr) from curated-couple-removals.json content. */
function denyMap(removalsJson) {
  const m = new Map();
  for (const r of (removalsJson && removalsJson.removals) || []) {
    if (!r || typeof r.driver !== 'string' || !Array.isArray(r.mfr)) {continue;}
    if (!m.has(r.driver)) {m.set(r.driver, new Set());}
    for (const x of r.mfr) {if (typeof x === 'string') {m.get(r.driver).add(lc(x));}}
  }
  return m;
}

/** Pure: return { compose, removed[] } with denied mfrs filtered out of compose.zigbee.manufacturerName. */
function filterCompose(compose, denied) {
  const list = compose && compose.zigbee && Array.isArray(compose.zigbee.manufacturerName)
    ? compose.zigbee.manufacturerName : null;
  if (!list || !denied || !denied.size) {return { compose, removed: [] };}
  const removed = list.filter((x) => typeof x === 'string' && denied.has(lc(x)));
  if (!removed.length) {return { compose, removed };}
  compose.zigbee.manufacturerName = list.filter((x) => !(typeof x === 'string' && denied.has(lc(x))));
  return { compose, removed };
}

function run({ root, apply }) {
  let rules;
  try {
    rules = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/curated-couple-removals.json'), 'utf8'));
  } catch (_e) { return { hits: [], error: 'no curated-couple-removals.json' }; }
  const deny = denyMap(rules);
  const hits = [];
  for (const [driver, denied] of deny) {
    const fp = path.join(root, 'drivers', driver, 'driver.compose.json');
    if (!fs.existsSync(fp)) {continue;}
    const raw = fs.readFileSync(fp, 'utf8');
    let j;
    try { j = JSON.parse(raw); } catch (_e) { continue; }
    const { compose, removed } = filterCompose(j, denied);
    if (!removed.length) {continue;}
    hits.push({ driver, removed });
    if (apply) {
      const indent = (raw.match(/^\{\r?\n([ \t]+)"/) || [null, '  '])[1];
      fs.writeFileSync(fp, `${JSON.stringify(compose, null, indent)}${raw.endsWith('\n') ? '\n' : ''}`);
    }
  }
  return { hits };
}

function main() {
  const root = process.env.STRIP_ROOT ? path.resolve(process.env.STRIP_ROOT) : path.resolve(__dirname, '..', '..');
  const apply = process.argv.includes('--apply');
  const { hits, error } = run({ root, apply });
  if (error) { console.log(`[curated-removals] skip: ${error}`); return 0; }
  for (const h of hits) {console.log(`[curated-removals] ${apply ? 'stripped' : 'RE-ADDED'} ${h.driver}: ${h.removed.join(', ')}`);}
  if (!hits.length) { console.log('[curated-removals] OK — no curated removal re-added'); return 0; }
  if (apply) { console.log(`[curated-removals] stripped ${hits.length} driver(s)`); return 0; }
  return 1;
}

if (require.main === module) {process.exit(main());}
module.exports = { denyMap, filterCompose, run };
