#!/usr/bin/env node
'use strict';
/**
 * scripts/leads/p3077-phantom-audit.js — P3077 (t614u): per exact couple audit of the dual couples
 * (same manufacturerName + productId listed on 2+ drivers; data/leads/dual-couples.json).
 *
 * REPORT ONLY. Writes data/leads/p3077-phantom-audit.json. Manifest changes are applied by hand,
 * one reviewed batch at a time, and recorded in config/architecture/p3077-phantom-decisions.json.
 *
 * Attestation (case-insensitive, exact couple only, never mfr alone, never TS0601 by pid alone):
 *   data/kb/couples.json (Z2M docs, herdsman converters, ZHA quirks, deCONZ DDF, Johan Bendz app),
 *   data/z2m_herdsman_cache.json (definitions with one modelId only), lib/data/couple-guard.json,
 *   data/diag-ids.json (Homey diag/crash/mail couples), publish sacred pins, P3055 attested list,
 *   data/user-misattribution-registry.json (canonical driver).
 * Removal feasibility for one driver D (Homey matches the M x P product of D):
 *   - drop pid p from D when no other mfr of D is attested/diag-seen with p on D;
 *   - drop mfr m from D when none of m's couples on D is attested/diag-seen.
 *   Anything else is "collateral": the couple stays (removing it would cost a real couple).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const lc = (s) => String(s || '').toLowerCase();
const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { return d; } };

const att = new Map(); // "mfr|pid" -> [{src, model, url}]
const add = (m, p, e) => { const k = `${lc(m).trim()}|${lc(p).trim()}`; if (!att.has(k)) {att.set(k, []);} att.get(k).push(e); };
const kb = rj('data/kb/couples.json', { couples: {} });
for (const [k, list] of Object.entries(kb.couples || {})) {
  const [m, p] = k.split('|');
  for (const [src, model, url] of list) {add(m, p, { src, model, url });}
}
const hc = rj('data/z2m_herdsman_cache.json', { devices: [] });
for (const d of hc.devices || []) {
  if ((d.modelIds || []).length !== 1) {continue;} // exact couple only
  for (const m of d.mfrs || []) {add(m, d.modelIds[0], { src: 'zhc-cache', model: `${d.vendor} ${d.model} ${d.description}`, url: 'https://github.com/Koenkk/zigbee-herdsman-converters' });}
}
const guard = rj('lib/data/couple-guard.json', { drivers: {} });
const guardBy = {};
for (const [drv, g] of Object.entries(guard.drivers || {})) {
  for (const [m, pids] of Object.entries(g.mfrs || {})) {for (const p of pids) {(guardBy[`${lc(m)}|${lc(p)}`] ||= []).push(drv); add(m, p, { src: 'couple-guard', model: g._source || drv, url: 'lib/data/couple-guard.json', driver: drv });}}
}
const diag = new Map();
for (const r of (rj('data/diag-ids.json', { reports: [] }).reports || [])) {
  for (const [m, p] of r.couples || []) {diag.set(`${lc(m)}|${lc(p)}`, r.kind + ':' + r.id);}
}
const pins = new Map();
for (const c of (rj('config/architecture/publish-sacred-keep-couples.json', { couples: [] }).couples || [])) {pins.set(`${lc(c.mfr)}|${lc(c.pid)}`, c.driverId);}
const reg = rj('data/user-misattribution-registry.json', {});
const canon = new Map();
for (const c of (reg.cases || reg.entries || [])) {
  for (const m of [].concat(c.manufacturerName || c.mfr || c.mfrs || [])) {
    for (const p of [].concat(c.productId || c.pid || c.pids || [])) {if (c.canonicalDriver) {canon.set(`${lc(m)}|${lc(p)}`, c.canonicalDriver);}}
  }
}

// driver lists
const drivers = {};
for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
  if (!fs.existsSync(f)) {continue;}
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const z = j.zigbee || {};
  if (!Array.isArray(z.manufacturerName) || !Array.isArray(z.productId)) {continue;}
  drivers[id] = { cls: j.class, caps: j.capabilities || [], m: [...new Set(z.manufacturerName.map(lc))], p: [...new Set(z.productId.map(lc))] };
}
const real = (m, p) => att.has(`${m}|${p}`) || diag.has(`${m}|${p}`) || pins.has(`${m}|${p}`);
const mfrAttested = (m) => { for (const k of att.keys()) {if (k.startsWith(m + '|')) {return true;}} return false; };

function feasibility(drvId, m, p) {
  const d = drivers[drvId];
  if (!d) {return { canDropPid: false, canDropMfr: false };}
  const pidOthers = d.m.filter((x) => x !== m && real(x, p));
  const mfrOthers = d.p.filter((x) => x !== p && real(m, x));
  // an unverified mfr (no attested couple anywhere) might need p: keep p then (P3055 rule)
  const unverified = d.m.filter((x) => x !== m && !mfrAttested(x));
  return {
    // WHY: TS0601 is never dropped from a driver here: DP devices share it and the KB is not exhaustive.
    canDropPid: p !== 'ts0601' && pidOthers.length === 0 && unverified.length === 0 && d.p.length > 1,
    pidCost: d.m.length - 1, pidBlockers: pidOthers.slice(0, 5), unverifiedMfrs: unverified.length,
    canDropMfr: mfrOthers.length === 0 && d.m.length > 1 && mfrAttested(m),
    mfrCost: d.p.length - 1, mfrBlockers: mfrOthers.slice(0, 5),
  };
}

const dual = rj('data/leads/dual-couples.json', { couples: [] }).couples;
const out = [];
for (const c of dual) {
  const m = lc(c.mfr), p = lc(c.pid), k = `${m}|${p}`;
  const ev = att.get(k) || [];
  const rec = { mfr: c.mfr, pid: c.pid, drivers: c.drivers, pattern: c.pattern, attested: ev.length > 0,
    sources: ev.slice(0, 4), diag: diag.get(k) || null, pin: pins.get(k) || null, canonical: canon.get(k) || guardBy[k] || null,
    mfrKnownElsewhere: mfrAttested(m), feas: {} };
  for (const d of c.drivers) {rec.feas[d] = feasibility(d, m, p);}
  out.push(rec);
}
const sum = { total: out.length, attested: out.filter((r) => r.attested).length, diag: out.filter((r) => r.diag).length,
  pinned: out.filter((r) => r.pin).length, unattested: out.filter((r) => !r.attested && !r.diag && !r.pin).length };
fs.writeFileSync(path.join(ROOT, 'data/leads/p3077-phantom-audit.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), summary: sum, couples: out }, null, 1) + '\n');
console.log(JSON.stringify(sum));
