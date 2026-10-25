'use strict';
// WHY(P3036, 25/10/2026 Paris): the publish compaction (compact-zigbee-identifiers.cjs) keeps a per-driver
// cartesian product manufacturerName x productId. A real TS0601 manufacturer added to climate_sensor costs
// 2 case forms x 12 productIds = 24 combos, so pass 2 drops whole groups to stay under the house cap and
// ~2 955 (manufacturer, TS0601) couples that the composes declare end up in NO payload driver.
// This pass runs AFTER the compaction and only ADDS: it puts back missing (manufacturer, TS0601) groups into
// the payload drivers that already carry TS0601 and whose compose lists that manufacturer, cheapest and
// mfs_db-observed first, until a separate, measured ceiling (HOMEY_ZIGBEE_TOPUP_MAX_TOTAL). It never removes
// an identifier, never adds a driver, never adds a productId, and keeps at most maxCaseForms per group.
// Measured ceiling (docs/knowledge/ATHOM_LIMITS.md, P3036 section): Athom accepted ~20 000 combos
// (9.0.664 / 9.0.698 Test, Aug 2026) and 16 986 (9.0.914 Test #3177). Unset or 0 = pass disabled.
const fs = require('fs');
const {
  comboCount, limitCaseForms, isSyntheticManufacturer, loadMfsDatabase,
} = require('./compact-zigbee-identifiers.cjs');

const MEASURED_ACCEPTED_MAX_TOTAL = 20000;

const arr = (v) => (Array.isArray(v) ? v : (v == null ? [] : [v])).filter((x) => typeof x === 'string' && x.trim());
const lc = (s) => String(s).toLowerCase();

/** Lower-case "mfr|pid" couples present anywhere in the manifest. */
function presentCouples(manifest) {
  const out = new Set();
  for (const d of manifest.drivers || []) {
    const z = d && d.zigbee;
    if (!z) continue;
    const pids = arr(z.productId).map(lc);
    for (const m of arr(z.manufacturerName)) for (const p of pids) out.add(`${lc(m)}|${p}`);
  }
  return out;
}

function totalCombos(manifest) {
  return (manifest.drivers || []).reduce((s, d) => s + comboCount(d), 0);
}

/**
 * Candidate groups: one per lower-case manufacturer whose (mfr, pid) couple is in no payload driver,
 * placed on the cheapest payload driver (fewest productIds) whose SOURCE compose lists it with that pid.
 */
function candidates(source, payload, { productId = 'TS0601', maxCaseForms = 2, observed = null, caseFormSources = null } = {}) {
  const pid = lc(productId);
  const present = presentCouples(payload);
  const payById = new Map((payload.drivers || []).filter((d) => d && d.zigbee).map((d) => [d.id, d]));
  const best = new Map();
  for (const sd of source.drivers || []) {
    const pd = sd && payById.get(sd.id);
    if (!pd || !sd.zigbee) continue;
    if (!arr(sd.zigbee.productId).map(lc).includes(pid)) continue;
    const payPids = arr(pd.zigbee.productId);
    if (!payPids.map(lc).includes(pid)) continue; // never add a productId to a payload driver
    const groups = new Map();
    for (const m of arr(sd.zigbee.manufacturerName)) {
      if (isSyntheticManufacturer(m)) continue;
      const k = lc(m);
      if (present.has(`${k}|${pid}`)) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    }
    for (const [k, variants] of groups) {
      const forms = limitCaseForms(variants, maxCaseForms, caseFormSources); // P3041: no unsourced twin
      const cost = forms.length * payPids.length;
      const prev = best.get(k);
      if (!prev || cost < prev.cost) {
        best.set(k, { key: k, driverId: sd.id, forms, cost, observed: !!(observed && observed.has(k)) });
      }
    }
  }
  return [...best.values()].sort((a, b) => (Number(b.observed) - Number(a.observed)) || (a.cost - b.cost)
    || a.driverId.localeCompare(b.driverId) || a.key.localeCompare(b.key));
}

/**
 * topUp(source, payload, opts) mutates payload (adds only) and returns a report.
 * opts: maxTotal (required > 0), maxDriver, maxCaseForms, productId, observed (Set of lower-case mfrs).
 */
function topUp(source, payload, opts = {}) {
  const maxTotal = Number(opts.maxTotal) || 0;
  const maxDriver = Number(opts.maxDriver) || Infinity;
  const report = { enabled: maxTotal > 0, productId: opts.productId || 'TS0601', maxTotal, maxDriver: Number.isFinite(maxDriver) ? maxDriver : null,
    beforeTotal: totalCombos(payload), afterTotal: 0, candidates: 0, addedGroups: 0, addedCombos: 0, addedObserved: 0, stillMissing: 0, perDriver: {}, driversBefore: (payload.drivers || []).length };
  if (!report.enabled) { report.afterTotal = report.beforeTotal; return report; }
  const list = candidates(source, payload, opts);
  report.candidates = list.length;
  const byId = new Map((payload.drivers || []).map((d) => [d.id, d]));
  let total = report.beforeTotal;
  for (const c of list) {
    const d = byId.get(c.driverId);
    const now = comboCount(d);
    if (total + c.cost > maxTotal || now + c.cost > maxDriver) continue;
    const names = arr(d.zigbee.manufacturerName);
    const add = c.forms.filter((f) => !names.includes(f));
    if (!add.length) continue;
    d.zigbee.manufacturerName = names.concat(add);
    const delta = comboCount(d) - now;
    total += delta;
    report.addedGroups += 1;
    report.addedCombos += delta;
    if (c.observed) report.addedObserved += 1;
    report.perDriver[c.driverId] = (report.perDriver[c.driverId] || 0) + 1;
  }
  report.afterTotal = total;
  report.stillMissing = list.length - report.addedGroups;
  report.driversAfter = (payload.drivers || []).length;
  return report;
}

/** File form used by prepare-publish: source manifest object + compacted payload file (rewritten in place). */
function topUpFile(sourceManifest, payloadFile, opts = {}) {
  const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
  let observed = opts.observed || null;
  if (!observed) {
    const db = loadMfsDatabase();
    observed = db && db.byMfr ? new Set(db.byMfr.keys()) : null;
  }
  const report = topUp(sourceManifest, payload, { ...opts, observed });
  if (report.addedGroups > 0) fs.writeFileSync(payloadFile, JSON.stringify(payload), 'utf8');
  return report;
}

/** Read the ceiling from the environment; refuses values above the measured accepted maximum unless forced. */
function ceilingFromEnv(env = process.env) {
  const v = Number(env.HOMEY_ZIGBEE_TOPUP_MAX_TOTAL) || 0;
  if (v > MEASURED_ACCEPTED_MAX_TOTAL && env.HOMEY_ZIGBEE_TOPUP_ALLOW_UNMEASURED !== '1') return MEASURED_ACCEPTED_MAX_TOTAL;
  return v;
}

module.exports = { MEASURED_ACCEPTED_MAX_TOTAL, presentCouples, totalCombos, candidates, topUp, topUpFile, ceilingFromEnv };
