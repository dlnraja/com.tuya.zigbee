'use strict';
/**
 * P3227 (02/11/2026 Paris) — zero-parasite packing, step 3a: REPORT ONLY (writes nothing in drivers/app.json).
 * Homey matches the cartesian product manufacturerName × productId of a driver. A combo with no source
 * (kb/diag/sacred/attested strong, mfs_db weak) is a parasite. Grouping each driver's mfrs by their exact
 * sourced pid set gives a packing whose combo count equals the sourced couple count (zero parasites),
 * per docs/rules/DRIVER_CONTINUATIONS.md rule 3. Unsourced mfrs are listed apart: never dropped, never guessed.
 * Usage: node scripts/perf/zero-parasite-plan.js [--strong] [--out=data/publish/zero-parasite-plan.json]
 */
const fs = require('fs');
const path = require('path');
const { loadSourcedCouples, keyOf } = require('../maintenance/publish-sourced-restore.cjs');

const lc = (s) => String(s || '').trim().toLowerCase();

/** Pure: drivers = [{ id, mfrs:[], pids:[] }], sourced = Map(key -> { strong }). */
function planDriver(d, sourced, strongOnly = false) {
  const mfrs = [...new Set(d.mfrs.map(lc))].filter(Boolean);
  const pids = [...new Set(d.pids.map(lc))].filter(Boolean);
  const groups = new Map();
  const unsourced = [];
  let real = 0;
  for (const m of mfrs) {
    const own = pids.filter((p) => { const e = sourced.get(keyOf(m, p)); return e && (!strongOnly || e.strong); });
    if (!own.length) { unsourced.push(m); continue; }
    real += own.length;
    const g = own.sort().join(',');
    if (!groups.has(g)) {groups.set(g, []);}
    groups.get(g).push(m);
  }
  const sourcedMfrs = mfrs.length - unsourced.length;
  return {
    id: d.id,
    combos: mfrs.length * pids.length,
    sourcedCombos: sourcedMfrs * pids.length,
    real,
    parasites: sourcedMfrs * pids.length - real,
    groups: [...groups.entries()].map(([g, ms]) => ({ pids: g.split(','), mfrs: ms.length })).sort((a, b) => b.mfrs - a.mfrs),
    unsourcedMfrs: unsourced.length,
  };
}

function loadDrivers(root) {
  const out = [];
  for (const id of fs.readdirSync(path.join(root, 'drivers')).sort()) {
    const f = path.join(root, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    const z = (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee) || {};
    if (Array.isArray(z.manufacturerName) && Array.isArray(z.productId)) {out.push({ id, mfrs: z.manufacturerName, pids: z.productId });}
  }
  return out;
}

function plan(root, strongOnly) {
  const sourced = loadSourcedCouples(root);
  const drivers = loadDrivers(root).map((d) => planDriver(d, sourced, strongOnly)).filter((r) => r.parasites > 0);
  drivers.sort((a, b) => b.parasites - a.parasites);
  const sum = (k) => drivers.reduce((s, r) => s + r[k], 0);
  return { strongOnly: !!strongOnly, driversWithParasites: drivers.length, parasites: sum('parasites'), real: sum('real'), drivers };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  const strong = process.argv.includes('--strong');
  const a = process.argv.find((x) => x.startsWith('--out='));
  const r = plan(root, strong);
  console.log(`[zero-parasite-plan] ${strong ? 'strong' : 'all'} sources: ${r.driversWithParasites} drivers, ${r.parasites} parasite combos among sourced mfrs, ${r.real} sourced couples`);
  for (const d of r.drivers.slice(0, 15)) {console.log(`  ${d.id}: ${d.parasites} parasites, ${d.groups.length} pid-set groups, ${d.unsourcedMfrs} unsourced mfrs`);}
  if (a) {fs.writeFileSync(path.resolve(root, a.slice(6)), `${JSON.stringify(r, null, 1)}\n`);}
}

module.exports = { planDriver, plan, loadDrivers };
