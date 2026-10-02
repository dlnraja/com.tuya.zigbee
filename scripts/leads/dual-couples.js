#!/usr/bin/env node
'use strict';
/**
 * scripts/leads/dual-couples.js — classify couples (manufacturerName + productId) listed on two or
 * more drivers (P2794). REPORT ONLY unless --apply is given by a maintainer.
 *
 *   node scripts/leads/dual-couples.js [--root=.] [--dry]            → data/leads/dual-couples.json
 *   node scripts/leads/dual-couples.js --apply [--root=.]            → applies "resolve" proposals
 *   node scripts/leads/dual-couples.js --write-runtime               → refreshes lib/data/dual-couple-adapt.json
 *
 * Homey matches a device when its manufacturerName and productId are both listed by one driver, so
 * a driver's couples are its manufacturerName × productId product (compared case-insensitively here).
 *
 * Evidence per couple:
 *   - productId family: TS0001/TS0011 = 1 gang, TS0002/TS0012 = 2, TS0003/TS0013 = 3, TS0004/TS0014 = 4,
 *     TS011F = plug, TS0601 = DP-based (no gang information);
 *   - DP sets: data/dp_registry.json (state_lN / switchN names → N gangs; single "state" DP1 → 1 gang);
 *   - zigbee-herdsman-converters cache: "<N> gang" in the definition description, single-model only;
 *   - data/user-misattribution-registry.json: canonicalDriver / forbiddenDrivers (strongest);
 *   - driver capabilities: number of onoff / onoff.gangN capabilities = gang count of the driver.
 * Verdicts:
 *   - clear   : the evidence picks exactly one of the drivers (registry, or productId/DP gang count
 *               matching exactly one switch-type driver with no conflicting evidence);
 *   - adapt   : switch-type drivers with different gang counts, evidence missing or conflicting (typically TS0601) → kept; the
 *               runtime gang adapter (lib/devices/GangCountAdapter.js) handles the real gang count;
 *   - kept    : other patterns (light vs dimmer, same-type duplicate drivers, cross-type) → kept.
 * Resolution proposals (only from "clear"): remove a manufacturerName from a losing driver ONLY when
 * every couple it loses there is either still matched by the winning driver or has no external
 * evidence at all, it is not protected (catch-all list, in-place identity layer, registry canonical),
 * and already-paired devices keep running (Homey keeps the paired driver; the removed names are
 * recorded in lib/data/dual-couple-legacy.json so runtime driver hints stay quiet for them).
 */
const fs = require('fs');
const path = require('path');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(arg('root', process.cwd()));
const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry');
const WRITE_RUNTIME = process.argv.includes('--write-runtime') || APPLY;
const lc = (s) => String(s || '').toLowerCase();
const uc = (s) => String(s || '').toUpperCase();
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

const PID_GANG = { TS0001: 1, TS0011: 1, TS0002: 2, TS0012: 2, TS0003: 3, TS0013: 3, TS0004: 4, TS0014: 4 };
const PID_CAT = {
  TS011F: 'plug', TS0121: 'plug', TS130F: 'cover', TS0041: 'button', TS0042: 'button', TS0043: 'button', TS0044: 'button',
  TS004F: 'button', TS0215A: 'button', TS0202: 'motion', TS0203: 'contact', TS0201: 'climate', TS0207: 'water',
  TS0205: 'smoke', TS0204: 'gas', TS0210: 'vibration', TS0222: 'illuminance', TS110E: 'dimmer', TS110F: 'dimmer', TS0052: 'dimmer',
  TS0501A: 'light', TS0501B: 'light', TS0502A: 'light', TS0502B: 'light', TS0503A: 'light', TS0503B: 'light',
  TS0504A: 'light', TS0504B: 'light', TS0505A: 'light', TS0505B: 'light',
};
function pidKind(p) {
  const P = uc(p);
  if (PID_GANG[P]) {return { kind: 'gang', gang: PID_GANG[P], cat: 'switch' };}
  if (P === 'TS0601') {return { kind: 'dp' };}
  if (PID_CAT[P]) {return { kind: PID_CAT[P], cat: PID_CAT[P] };}
  return { kind: 'other' };
}
function driverCats(j, caps, gang) {
  const c = new Set();
  const has = (x) => caps.includes(x);
  if (j.class === 'windowcoverings') {c.add('cover');}
  if (['button', 'remote'].includes(j.class)) {c.add('button');}
  if (has('alarm_motion')) {c.add('motion');}
  if (has('alarm_contact')) {c.add('contact');}
  if (has('alarm_water')) {c.add('water');}
  if (has('alarm_smoke')) {c.add('smoke');}
  if (has('alarm_co') || has('alarm_gas') || has('measure_co')) {c.add('gas');}
  if (has('alarm_vibration')) {c.add('vibration');}
  if (has('measure_luminance')) {c.add('illuminance');}
  if (j.class === 'sensor' && has('measure_temperature')) {c.add('climate');}
  if (has('dim')) {c.add(j.class === 'light' ? 'light' : 'dimmer'); c.add('dimmer');}
  if (j.class === 'light') {c.add('light');}
  if (j.class === 'socket' && has('measure_power') && gang === 1) {c.add('plug');}
  if (gang) {c.add('switch');}
  return c;
}

function loadDrivers(root) {
  const out = new Map();
  for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
    const j = readJson(path.join(root, 'drivers', d, 'driver.compose.json'), null);
    const z = j && j.zigbee;
    if (!z || !Array.isArray(z.manufacturerName) || !z.manufacturerName.length) {continue;}
    const caps = (j.capabilities || []).map(String);
    const onoff = caps.filter((c) => /^onoff(\.gang\d+|\.\d+)?$/.test(c)).length;
    const switchLike = ['socket', 'light'].includes(j.class) && onoff > 0 && !caps.includes('dim') && !caps.some((c) => c.startsWith('windowcoverings'));
    const gang = switchLike ? onoff : null;
    out.set(d, { id: d, cls: j.class || '', caps, gang, cats: driverCats(j, caps, gang), mfrs: new Set(z.manufacturerName.map(lc)), pids: new Set((z.productId || []).map(uc)) });
  }
  return out;
}

function dualCouples(drivers) {
  const map = new Map();
  for (const d of drivers.values()) {
    for (const m of d.mfrs) {
      for (const p of d.pids) {
        const k = `${m}|${p}`;
        if (!map.has(k)) {map.set(k, []);}
        map.get(k).push(d.id);
      }
    }
  }
  return [...map.entries()].filter(([, ds]) => ds.length > 1).map(([k, ds]) => ({ mfr: k.split('|')[0], pid: k.split('|')[1], drivers: ds.sort() }));
}

function loadEvidence(root) {
  const dpGang = new Map();
  const reg = readJson(path.join(root, 'data/dp_registry.json'), { byMfr: {} });
  for (const [m, list] of Object.entries(reg.byMfr || {})) {
    const gangs = new Set();
    let plainState = false;
    for (const e of list || []) {
      const n = lc(e.name);
      const g = n.match(/^(?:state|switch)_?l?(\d)$/);
      if (g) {gangs.add(Number(g[1]));}
      if (n === 'state' && Number(e.dpId) === 1) {plainState = true;}
    }
    if (gangs.size) {dpGang.set(lc(m), Math.max(...gangs));}
    else if (plainState) {dpGang.set(lc(m), 1);}
  }
  const z2mGang = new Map();
  const external = new Set();
  const z2m = readJson(path.join(root, 'data/z2m_herdsman_cache.json'), { devices: [] });
  for (const d of z2m.devices || []) {
    const g = String(d.description || '').match(/\b([1-8])[ -]?gang/i);
    for (const m of d.mfrs || []) {
      for (const p of d.modelIds || []) {external.add(`${lc(String(m).trim())}|${uc(p)}`);}
      if (g && (d.modelIds || []).length === 1) {z2mGang.set(`${lc(String(m).trim())}|${uc(d.modelIds[0])}`, Number(g[1]));}
    }
  }
  for (const l of readJson(path.join(root, 'data/leads/github-leads.json'), { leads: [] }).leads || []) {
    if ((l.pids || []).length === 1) {external.add(`${lc(l.mfr)}|${uc(l.pids[0])}`);}
  }
  for (const e of readJson(path.join(root, 'data/leads/image-ocr.json'), { entries: [] }).entries || []) {
    if ((e.mfrs || []).length === 1 && (e.pids || []).length === 1) {external.add(`${lc(e.mfrs[0])}|${uc(e.pids[0])}`);}
  }
  const mfs = readJson(path.join(root, 'data/mfs_db.json'), { devices: {} }).devices || {};
  for (const [m, v] of Object.entries(mfs)) {
    if (!(v.sources || []).some((s) => s !== 'local')) {continue;}
    if ((v.sources || []).includes('local')) {continue;} // modelIds may come from our own compose files
    for (const p of v.modelIds || []) {external.add(`${lc(m)}|${uc(p)}`);}
  }
  const internal = new Set();
  for (const [m, v] of Object.entries(mfs)) {for (const p of v.modelIds || []) {internal.add(`${lc(m)}|${uc(p)}`);}}
  for (const [m, v] of Object.entries(readJson(path.join(root, 'lib/tuya/fingerprints.json'), {}))) {for (const p of (v && v.modelIds) || []) {internal.add(`${lc(m)}|${uc(p)}`);}}
  const registry = new Map();
  const regFile = readJson(path.join(root, 'data/user-misattribution-registry.json'), { entries: [] });
  const arr = (v) => {
    if (Array.isArray(v)) {return v;}
    return v ? [v] : [];
  };
  for (const e of [...arr(regFile.entries), ...arr(regFile.cases)]) {
    for (const m of arr(e.mfr)) {
      for (const p of arr(e.productId)) {registry.set(`${lc(m)}|${uc(p)}`, { canonical: e.canonicalDriver, forbidden: e.forbiddenDrivers || [], id: e.id });}
    }
  }
  const protectedPairs = new Set();
  for (const m of readJson(path.join(root, 'data/sacred-couple-catch-all.json'), { catchall: [] }).catchall || []) {protectedPairs.add(`switch_1gang|${lc(m)}`);}
  try {
    const src = fs.readFileSync(path.join(root, 'lib/devices/InPlaceIdentityLayer.js'), 'utf8');
    for (const mm of src.matchAll(/^\s*(_[a-z0-9]+_[a-z0-9]+):\s*\{[^\n]*hosts:\s*\[([^\]]*)\]/gm)) {
      for (const h of mm[2].match(/'([^']+)'/g) || []) {protectedPairs.add(`${h.replace(/'/g, '')}|${mm[1]}`);}
    }
  } catch { /* optional */ }
  for (const r of registry.values()) {protectedPairs.add(`${r.canonical}|*`);}
  return { dpGang, z2mGang, external, internal, registry, protectedPairs };
}

function pattern(c, drivers) {
  const ds = c.drivers.map((d) => drivers.get(d));
  if (ds.every((d) => d.gang)) {
    const gangs = [...new Set(ds.map((d) => d.gang))];
    return gangs.length > 1 ? `switch gang mismatch (${gangs.sort().join('/')})` : `switch same gang (${gangs[0]})`;
  }
  const cls = [...new Set(ds.map((d) => d.cls))].sort();
  if (cls.length === 1) {
    if (cls[0] === 'light') {return ds.some((d) => d.caps.includes('light_hue')) && ds.some((d) => !d.caps.includes('light_hue')) ? 'light colour vs dim/white' : 'light duplicate drivers';}
    return `same class duplicate (${cls[0]})`;
  }
  return `cross class (${cls.join('/')})`;
}

/** Pure decision per couple (unit-tested). */
function classify(c, drivers, ev) {
  const key = `${c.mfr}|${c.pid}`;
  const pat = pattern(c, drivers);
  const seen = ev.external.has(key) ? 'external' : ev.internal.has(key) ? 'internal' : 'none';
  const r = ev.registry.get(key);
  if (r && c.drivers.includes(r.canonical)) {return { pattern: pat, seen, verdict: 'clear', winner: r.canonical, why: `misattribution registry ${r.id}` };}
  const pk = pidKind(c.pid);
  const dpG = ev.dpGang.get(c.mfr) || null;
  const zG = ev.z2mGang.get(key) || null;
  const evidence = { pid: pk.kind === 'gang' ? pk.gang : pk.kind, dp: dpG, z2m: zG };
  const ds = c.drivers.map((d) => drivers.get(d));
  const allSwitch = ds.every((d) => d.gang) && new Set(ds.map((d) => d.gang)).size > 1;
  if (seen === 'none') {
    return { pattern: pat, seen, verdict: allSwitch ? 'adapt' : 'kept', evidence, why: 'no source pairs this manufacturerName with this productId (product of two lists only)' };
  }
  if (!allSwitch) {
    if (pk.cat && pk.cat !== 'switch') {
      const hits = ds.filter((d) => d.cats.has(pk.cat));
      if (hits.length === 1) {return { pattern: pat, seen, verdict: 'clear', winner: hits[0].id, evidence, why: `${c.pid} is a ${pk.cat} productId; only ${hits[0].id} is a ${pk.cat} driver` };}
      return { pattern: pat, seen, verdict: 'kept', evidence, why: hits.length ? `${hits.length} ${pk.cat} drivers` : `no ${pk.cat} driver among them` };
    }
    return { pattern: pat, seen, verdict: 'kept', evidence, why: ds.every((d) => d.gang) ? 'same gang count on every driver; either driver runs it' : 'productId does not identify the device type; both drivers can run it' };
  }
  const gangs = [pk.kind === 'gang' ? pk.gang : null, dpG, zG].filter(Boolean);
  const uniq = [...new Set(gangs)];
  if (!uniq.length) {return { pattern: pat, seen, verdict: 'adapt', evidence, why: `${c.pid}: no gang evidence, runtime adapter decides` };}
  if (uniq.length > 1) {return { pattern: pat, seen, verdict: 'adapt', evidence, why: `conflicting gang evidence (${uniq.join(' vs ')})` };}
  const hits = ds.filter((d) => d.gang === uniq[0]);
  if (hits.length !== 1) {return { pattern: pat, seen, verdict: 'adapt', evidence, why: hits.length ? `${hits.length} drivers with ${uniq[0]} gang(s)` : `no listed driver has ${uniq[0]} gang(s)` };}
  return { pattern: pat, seen, verdict: 'clear', winner: hits[0].id, evidence, why: `${uniq[0]} gang(s) from ${gangs.length > 1 ? 'productId + DP/z2m' : pk.kind === 'gang' ? 'productId' : 'DP/z2m'}` };
}

function proposeResolutions(results, drivers, ev) {
  const byKey = new Map(results.map((r) => [`${r.mfr}|${r.pid}`, r]));
  const losers = new Map();
  for (const r of results) {
    if (r.verdict !== 'clear') {continue;}
    for (const d of r.drivers) {if (d !== r.winner) {const k = `${d}|${r.mfr}`; if (!losers.has(k)) {losers.set(k, []);} losers.get(k).push(r.pid);}}
  }
  // What happens to couple (m, p) on driver d if it is dropped there.
  const blocker = (d, m, p) => {
    const r = byKey.get(`${m}|${p}`);
    if (r) {return r.seen !== 'none' && (r.verdict !== 'clear' || r.winner === d) ? `${m}/${p}: ${r.verdict}${r.winner === d ? ' (wins here)' : ''}` : null;}
    return ev.external.has(`${m}|${p}`) || ev.internal.has(`${m}|${p}`) ? `${m}/${p}: only on ${d} and reported by a source` : null;
  };
  const out = [];
  const seenPid = new Set();
  for (const [k, pids] of losers) {
    const [d, m] = k.split('|');
    const D = drivers.get(d);
    const winners = [...new Set(pids.map((p) => byKey.get(`${m}|${p}`).winner))];
    const prot = ev.protectedPairs.has(k) || (ev.protectedPairs.has(`${d}|*`) && [...ev.registry.entries()].some(([rk, r]) => r.canonical === d && rk.startsWith(`${m}|`)));
    // Option A: drop the productId(s) from the losing driver (affects every manufacturerName there).
    const pidBlock = [];
    for (const p of pids) {for (const mm of D.mfrs) {const b = blocker(d, mm, p); if (b) {pidBlock.push(b);}}}
    if (!pidBlock.length && !pids.every((p) => seenPid.has(`${d}|${p}`))) {
      for (const p of pids) {seenPid.add(`${d}|${p}`);}
      out.push({ driver: d, mfr: m, losesTo: winners, pids: pids.sort(), action: 'remove-productId', remove: pids.sort(), status: 'resolve', blockers: [] });
      continue;
    }
    // Option B: drop the manufacturerName from the losing driver (affects every productId there).
    const mfrBlock = prot ? ['protected'] : [];
    for (const p of D.pids) {const b = blocker(d, m, p); if (b) {mfrBlock.push(b);}}
    if (!mfrBlock.length) {
      out.push({ driver: d, mfr: m, losesTo: winners, pids: pids.sort(), action: 'remove-manufacturerName', remove: [m], status: 'resolve', blockers: [] });
    } else {
      out.push({ driver: d, mfr: m, losesTo: winners, pids: pids.sort(), action: 'none', status: 'keep', blockers: [...new Set([...pidBlock, ...mfrBlock])].slice(0, 6) });
    }
  }
  return out;
}

function loadRoundTrip(file, compact) {
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const dump = (o) => compact ? JSON.stringify(o) : JSON.stringify(o, null, 2);
  const nl = raw.endsWith('\n') ? '\n' : '';
  if (dump(obj) + nl !== raw) {return null;}
  return { obj, write: (o) => fs.writeFileSync(file, dump(o) + nl) };
}

function applyResolutions(root, props) {
  const app = loadRoundTrip(path.join(root, 'app.json'), true);
  if (!app) {throw new Error('app.json round-trip not byte-identical');}
  const legacyFile = path.join(root, 'lib/data/dual-couple-legacy.json');
  const legacy = readJson(legacyFile, { note: 'fingerprint entries removed from a driver by the dual-couple resolution (P2794). Devices paired before keep this driver; runtime driver hints must stay quiet for them.', drivers: {} });
  let n = 0;
  for (const p of props.filter((x) => x.status === 'resolve')) {
    const c = loadRoundTrip(path.join(root, 'drivers', p.driver, 'driver.compose.json'), false);
    const ad = (app.obj.drivers || []).find((d) => d.id === p.driver);
    if (!c || !ad) {continue;}
    const field = p.action === 'remove-productId' ? 'productId' : 'manufacturerName';
    const norm = field === 'productId' ? uc : lc;
    const drop = new Set(p.remove.map(norm));
    const removed = c.obj.zigbee[field].filter((x) => drop.has(norm(x)));
    const keep = c.obj.zigbee[field].filter((x) => !drop.has(norm(x)));
    if (!keep.length || !removed.length) {continue;}
    c.obj.zigbee[field] = keep;
    ad.zigbee[field] = (ad.zigbee[field] || []).filter((x) => !drop.has(norm(x)));
    c.write(c.obj);
    const L = legacy.drivers[p.driver] || { manufacturerName: [], productId: [], couples: [] };
    const prev = L[field] || [];
    const prevCouples = L.couples || [];
    L[field] = [...new Set([...prev, ...removed])].sort();
    L.couples = [...new Set([...prevCouples, ...p.pids.map((pid) => `${p.mfr}|${pid}`)])].sort();
    legacy.drivers[p.driver] = L;
    p.removed = removed;
    n++;
  }
  app.write(app.obj);
  fs.writeFileSync(legacyFile, `${JSON.stringify(legacy, null, 1)}\n`);
  return n;
}

function run(root) {
  const drivers = loadDrivers(root);
  const ev = loadEvidence(root);
  const results = dualCouples(drivers).map((c) => ({ ...c, ...classify(c, drivers, ev) }));
  const resolutions = proposeResolutions(results, drivers, ev);
  return { drivers, ev, results, resolutions };
}

function main() {
  const { results, resolutions } = run(ROOT);
  const count = (arr, f) => arr.reduce((m, x) => { m[f(x)] = (m[f(x)] || 0) + 1; return m; }, {});
  let applied = 0;
  if (APPLY) {applied = applyResolutions(ROOT, resolutions);}
  const summary = {
    generated: new Date().toISOString().slice(0, 10),
    dualCouples: results.length,
    byVerdict: count(results, (r) => r.verdict),
    byPattern: count(results, (r) => r.pattern),
    bySeen: count(results, (r) => r.seen),
    resolutions: count(resolutions, (r) => r.status),
    applied,
  };
  if (WRITE_RUNTIME && !DRY) {
    // Runtime list for lib/devices/GangCountAdapter.js: couples kept on several switch drivers.
    const couples = {};
    for (const r of results.filter((x) => x.verdict === 'adapt')) {couples[`${r.mfr}|${r.pid}`] = r.drivers;}
    fs.writeFileSync(path.join(ROOT, 'lib/data/dual-couple-adapt.json'), `${JSON.stringify({ note: 'couples kept on several switch drivers (P2794); the runtime gang adapter may add gang capabilities for them from observed DPs/endpoints', couples }, null, 1)}\n`);
  }
  if (!DRY) {
    fs.writeFileSync(path.join(ROOT, 'data/leads/dual-couples.json'), `${JSON.stringify({ ...summary, note: 'report only; resolutions are applied by a maintainer with --apply', resolutions, couples: results.map(({ evidence, ...r }) => ({ ...r, evidence: evidence ? [evidence.pid, evidence.dp, evidence.z2m] : undefined })) })}\n`);
  }
  console.log(JSON.stringify(summary));
}

module.exports = { pidKind, classify, pattern, loadDrivers, loadEvidence, dualCouples, proposeResolutions, run };
if (require.main === module) {try { main(); } catch (e) { console.error(`dual-couples: ${e.message}`); process.exit(0); }}
