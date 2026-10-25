'use strict';
// WHY(P3036b, 25/10/2026 Paris): the publish compaction keeps a per-driver cartesian product
// manufacturerName x productId and fills a house cap. Sacred pins (P3038b/P3038c) keep a manufacturer's
// whole row, so other groups are pushed out, and some of them are exact couples that a reliable source
// knows (data/kb/couples.json: Z2M/ZHC, ZHA, deCONZ, Blakadder, Johan...). Homey matches byte-exact.
// This pass runs AFTER the compaction and BEFORE the TS0601 top-up and only ADDS: for every KB couple
// (exact manufacturer bytes, exact productId) that the source composes declare but no payload driver
// carries, it adds that one manufacturer form back to the cheapest payload driver whose compose lists the
// couple and whose payload already has that productId. It never removes an identifier, never adds a
// driver, never adds a productId, and stops at a ceiling (HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL) that must stay
// within what Athom has accepted (MEASURED_ACCEPTED_MAX_TOTAL, docs/knowledge/ATHOM_LIMITS.md).
const fs = require('fs');
const path = require('path');
const { comboCount, isSyntheticManufacturer } = require('./compact-zigbee-identifiers.cjs');
const { MEASURED_ACCEPTED_MAX_TOTAL, totalCombos } = require('./ts0601-topup.cjs');
// Largest single-driver matrix seen in an accepted build (presence_sensor_radar, 9.0.1520 and stable 5.12.449).
const MEASURED_ACCEPTED_MAX_DRIVER = 1008;

const arr = (v) => (Array.isArray(v) ? v : (v == null ? [] : [v])).filter((x) => typeof x === 'string' && x.trim());

/** Exact "mfr|pid" couples known to the KB (keys of data/kb/couples.json). */
function loadKbCouples(root = path.join(__dirname, '..', '..')) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(root, 'data', 'kb', 'couples.json'), 'utf8'));
    return new Set(Object.keys(j.couples || {}));
  } catch (_) { return new Set(); }
}

/** Priority couples of this branch (config/architecture/kb-topup-priority.json, "couples": ["mfr|pid", ...]). */
/**
 * P3036d: couples data/kb/z2m-coverage.json lists as known by the sources but compacted out of a branch
 * payload ("compacted"). Exact "mfr|pid" keys only; empty when the file is absent (ports).
 */
function loadCoverageCompacted(root = path.join(__dirname, '..', '..')) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(root, 'data', 'kb', 'z2m-coverage.json'), 'utf8'));
    const out = new Set();
    for (const r of j.rows || []) {
      if (!r || typeof r.k !== 'string' || !r.k.includes('|')) continue;
      if (Object.values(r.b || {}).some((v) => Array.isArray(v) && v[0] === 'compacted')) out.add(r.k);
    }
    return out;
  } catch (_) {
    // Branches without the full matrix carry a snapshot of its compacted keys.
    try {
      const s = JSON.parse(fs.readFileSync(path.join(root, 'data', 'kb', 'coverage-compacted-couples.json'), 'utf8'));
      return new Set(arr(s.couples).filter((k) => k.includes('|')));
    } catch (__) { return new Set(); }
  }
}

function loadPriority(root = path.join(__dirname, '..', '..')) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(root, 'config', 'architecture', 'kb-topup-priority.json'), 'utf8'));
    return new Set(arr(j.couples));
  } catch (_) { return new Set(); }
}

/** Exact "mfr|pid" couples carried by the manifest. */
function exactCouples(manifest) {
  const out = new Set();
  for (const d of manifest.drivers || []) {
    const z = d && d.zigbee;
    if (!z) continue;
    const pids = arr(z.productId);
    for (const m of arr(z.manufacturerName)) for (const p of pids) out.add(`${m}|${p}`);
  }
  return out;
}

/**
 * Missing KB couples and, for each manufacturer form, the cheapest payload driver that can carry it again.
 * Returns { groups: [{driverId, mfr, cost, couples:[...]}], unplaceable: [{couple, reason}] }.
 */
function candidates(source, payload, kb) {
  const present = exactCouples(payload);
  const inSource = exactCouples(source);
  const payById = new Map((payload.drivers || []).filter((d) => d && d.zigbee).map((d) => [d.id, d]));
  const best = new Map(); // mfr -> { driverId, cost, couples:Set }
  const unplaceable = [];
  for (const c of kb) {
    if (present.has(c) || !inSource.has(c)) continue; // already shipped, or not ours to ship
    const cut = c.lastIndexOf('|');
    const mfr = c.slice(0, cut);
    const pid = c.slice(cut + 1);
    if (!mfr.trim() || isSyntheticManufacturer(mfr)) continue;
    let pick = null;
    let reason = 'source driver not in payload';
    for (const sd of source.drivers || []) {
      const z = sd && sd.zigbee;
      if (!z || sd.deprecated || !arr(z.manufacturerName).includes(mfr) || !arr(z.productId).includes(pid)) continue;
      const pd = payById.get(sd.id);
      if (!pd) continue;
      const payPids = arr(pd.zigbee.productId);
      if (!payPids.includes(pid)) { reason = 'productId not in payload driver'; continue; }
      const cost = payPids.length;
      if (!pick || cost < pick.cost || (cost === pick.cost && sd.id < pick.driverId)) pick = { driverId: sd.id, cost };
    }
    if (!pick) { unplaceable.push({ couple: c, reason }); continue; }
    const key = `${pick.driverId}\u0000${mfr}`;
    if (!best.has(key)) best.set(key, { driverId: pick.driverId, mfr, cost: pick.cost, couples: [] });
    best.get(key).couples.push(c);
  }
  const groups = [...best.values()].sort((a, b) => (b.couples.length / b.cost) - (a.couples.length / a.cost)
    || a.cost - b.cost || a.driverId.localeCompare(b.driverId) || a.mfr.localeCompare(b.mfr));
  return { groups, unplaceable };
}

/** topUp(source, payload, opts) mutates payload (adds only). opts: maxTotal (>0 enables), maxDriver, kb (Set). */
function topUp(source, payload, opts = {}) {
  const maxTotal = Math.min(Number(opts.maxTotal) || 0, opts.allowUnmeasured ? Infinity : MEASURED_ACCEPTED_MAX_TOTAL);
  const maxDriver = Math.min(Number(opts.maxDriver) || MEASURED_ACCEPTED_MAX_DRIVER, opts.allowUnmeasured ? Infinity : MEASURED_ACCEPTED_MAX_DRIVER);
  const kb = opts.kb || loadKbCouples(opts.root);
  const report = { enabled: maxTotal > 0, maxTotal, maxDriver, kbCouples: kb.size, beforeTotal: totalCombos(payload), afterTotal: 0,
    missing: 0, addedForms: 0, addedCombos: 0, restoredCouples: [], stillMissing: [], unplaceable: [], driversBefore: (payload.drivers || []).length };
  if (!report.enabled) { report.afterTotal = report.beforeTotal; report.driversAfter = report.driversBefore; return report; }
  const byId = new Map((payload.drivers || []).map((d) => [d.id, d]));
  let total = report.beforeTotal;
  // Tier 1: priority couples (config/architecture/kb-topup-priority.json: KB couples a recent payload shipped
  // and a later pin pushed out). One by one, cheapest declaring driver, and here a missing productId may be
  // restored on that driver too (only for these listed couples), so they come back even when the
  // compaction trimmed the productId.
  report.priority = { listed: 0, restored: [], already: 0, notPlaceable: [] };
  for (const c of [...(opts.priority || loadPriority(opts.root))].sort()) {
    if (!kb.has(c)) continue;
    report.priority.listed += 1;
    if (exactCouples(payload).has(c)) { report.priority.already += 1; continue; }
    const cut = c.lastIndexOf('|'); const mfr = c.slice(0, cut); const pid = c.slice(cut + 1);
    let pick = null;
    for (const sd of source.drivers || []) {
      const z = sd && sd.zigbee;
      if (!z || sd.deprecated || !arr(z.manufacturerName).includes(mfr) || !arr(z.productId).includes(pid)) continue;
      const d = byId.get(sd.id);
      if (!d || !d.zigbee) continue;
      const ms = arr(d.zigbee.manufacturerName); const ps = arr(d.zigbee.productId);
      const nm = ms.length + (ms.includes(mfr) ? 0 : 1); const np = ps.length + (ps.includes(pid) ? 0 : 1);
      const cost = nm * np - ms.length * ps.length;
      if (!pick || cost < pick.cost || (cost === pick.cost && sd.id < pick.d.id)) pick = { d, cost };
    }
    if (!pick) { report.priority.notPlaceable.push(c); continue; }
    if (total + pick.cost > maxTotal || comboCount(pick.d) + pick.cost > maxDriver) { report.stillMissing.push(c); continue; }
    const z = pick.d.zigbee;
    if (!arr(z.manufacturerName).includes(mfr)) z.manufacturerName = arr(z.manufacturerName).concat([mfr]);
    if (!arr(z.productId).includes(pid)) z.productId = arr(z.productId).concat([pid]);
    total += pick.cost;
    report.addedCombos += pick.cost;
    report.addedForms += 1;
    report.priority.restored.push(`${c}@${pick.d.id}`);
    report.restoredCouples.push(`${c}@${pick.d.id}`);
  }
  // Tier 1b (P3036d): couples the coverage matrix lists as compacted out (data/kb/z2m-coverage.json),
  // per exact mfr+pid couple (never per manufacturer alone): the couple must be declared byte-exact by a
  // source compose; it goes back on its cheapest declaring payload driver (the productId may be restored
  // there too), cheapest first, within the same ceilings. Not fatal: what does not fit stays out.
  report.coverage = { listed: 0, restored: [], already: 0, notPlaceable: 0, noRoom: 0 };
  const coverage = opts.coverage || (opts.coverage === null ? new Set() : loadCoverageCompacted(opts.root));
  const pickFor = (c) => {
    const cut = c.lastIndexOf('|'); const mfr = c.slice(0, cut); const pid = c.slice(cut + 1);
    if (!mfr.trim() || !pid.trim() || isSyntheticManufacturer(mfr)) return null;
    let pick = null;
    for (const sd of source.drivers || []) {
      const z = sd && sd.zigbee;
      if (!z || sd.deprecated || !arr(z.manufacturerName).includes(mfr) || !arr(z.productId).includes(pid)) continue;
      const d = byId.get(sd.id);
      if (!d || !d.zigbee) continue;
      const ms = arr(d.zigbee.manufacturerName); const ps = arr(d.zigbee.productId);
      const nm = ms.length + (ms.includes(mfr) ? 0 : 1); const np = ps.length + (ps.includes(pid) ? 0 : 1);
      const cost = nm * np - ms.length * ps.length;
      if (!pick || cost < pick.cost || (cost === pick.cost && sd.id < pick.d.id)) pick = { d, cost, mfr, pid };
    }
    return pick;
  };
  let shipped = exactCouples(payload);
  const covList = [];
  for (const c of [...coverage].sort()) {
    report.coverage.listed += 1;
    if (shipped.has(c)) { report.coverage.already += 1; continue; }
    const p = pickFor(c);
    if (!p) { report.coverage.notPlaceable += 1; continue; }
    covList.push({ c, cost: p.cost });
  }
  covList.sort((a, b) => a.cost - b.cost || a.c.localeCompare(b.c));
  for (const { c } of covList) {
    if (shipped.has(c)) { report.coverage.already += 1; continue; } // an earlier addition made it present
    const p = pickFor(c); // cost may have changed after earlier additions
    if (!p) { report.coverage.notPlaceable += 1; continue; }
    if (total + p.cost > maxTotal || comboCount(p.d) + p.cost > maxDriver) { report.coverage.noRoom += 1; continue; }
    const z = p.d.zigbee;
    if (!arr(z.manufacturerName).includes(p.mfr)) z.manufacturerName = arr(z.manufacturerName).concat([p.mfr]);
    if (!arr(z.productId).includes(p.pid)) z.productId = arr(z.productId).concat([p.pid]);
    total += p.cost;
    report.addedCombos += p.cost;
    report.addedForms += 1;
    report.coverage.restored.push(`${c}@${p.d.id}`);
    report.restoredCouples.push(`${c}@${p.d.id}`);
    shipped = exactCouples(payload);
  }
  // Tier 2: every other KB couple, grouped per (driver, manufacturer form), best couples-per-combo first.
  const { groups, unplaceable } = candidates(source, payload, kb);
  report.unplaceable = unplaceable;
  report.missing = groups.reduce((s, g) => s + g.couples.length, 0) + unplaceable.length + report.priority.restored.length;
  for (const g of groups) {
    const d = byId.get(g.driverId);
    const now = comboCount(d);
    if (total + g.cost > maxTotal || now + g.cost > maxDriver) { report.stillMissing.push(...g.couples); continue; }
    d.zigbee.manufacturerName = arr(d.zigbee.manufacturerName).concat([g.mfr]);
    const delta = comboCount(d) - now;
    total += delta;
    report.addedForms += 1;
    report.addedCombos += delta;
    report.restoredCouples.push(...g.couples.map((c) => `${c}@${g.driverId}`));
  }
  report.afterTotal = total;
  report.driversAfter = (payload.drivers || []).length;
  return report;
}

function topUpFile(sourceManifest, payloadFile, opts = {}) {
  const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
  const report = topUp(sourceManifest, payload, opts);
  if (report.addedForms > 0) fs.writeFileSync(payloadFile, JSON.stringify(payload), 'utf8');
  return report;
}

function ceilingFromEnv(env = process.env) {
  const v = Number(env.HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL) || 0;
  return v > MEASURED_ACCEPTED_MAX_TOTAL ? MEASURED_ACCEPTED_MAX_TOTAL : v;
}

module.exports = { MEASURED_ACCEPTED_MAX_DRIVER, loadKbCouples, loadPriority, loadCoverageCompacted, exactCouples, candidates, topUp, topUpFile, ceilingFromEnv };
