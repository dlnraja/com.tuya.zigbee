#!/usr/bin/env node
'use strict';
/**
 * scripts/leads/gang-patterns.js — gang-count patterns for couples listed on both a 1-gang and a
 * multi-gang driver (switches, dimmers, wall remotes, curtain vs switch). P2797. REPORT ONLY.
 *
 *   node scripts/leads/gang-patterns.js [--root=.] [--dry] [--write-runtime]
 *   The runtime file lib/data/gang-patterns.json is written only with --write-runtime (maintainer step).
 *     → data/leads/gang-patterns.json (full table, CI-only)
 *     → lib/data/gang-patterns.json   (runtime: couple → gang count, read lazily by GangCountAdapter)
 *
 * Evidence per couple (manufacturerName + productId, case-insensitive):
 *   pid       productId semantics: TS0001/TS0011/TS0041 = 1, TS0002/TS0012/TS0042 = 2,
 *             TS0003/TS0013/TS0043 = 3, TS0004/TS0014/TS0044 = 4; TS0601 / TS0046 / TS110E… = none
 *   dp        data/dp_registry.json gang DPs: state_lN, switchN, brightness_lN (max N); single state DP1 = 1
 *   z2m       zigbee-herdsman-converters definition text "N gang" (single-model definitions)
 *   interview endpoints carrying on/off in Homey interviews we hold (johanbendz-issues-enriched)
 *   registry  data/user-misattribution-registry.json canonical driver (its gang count)
 *   family    same suffix with another prefix (_TZE200_x / _TZE204_x / _TZE284_x), same productId —
 *             used only when the couple has no direct evidence
 * Class: N-gang when every direct source agrees (or the family agrees and nothing direct exists),
 * else "ambiguous". A removal PROPOSAL (never applied) needs >= 2 direct sources against the driver's
 * gang count and no source placing the couple on that driver.
 */
const fs = require('fs');
const path = require('path');
const DC = require('./dual-couples.js');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(arg('root', process.cwd()));
const DRY = process.argv.includes('--dry');
const WRITE_RUNTIME = process.argv.includes('--write-runtime');
const lc = (s) => String(s || '').toLowerCase();
const uc = (s) => String(s || '').toUpperCase();
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

const PID_SWITCH = { TS0001: 1, TS0011: 1, TS0002: 2, TS0012: 2, TS0003: 3, TS0013: 3, TS0004: 4, TS0014: 4 };
const PID_REMOTE = { TS0041: 1, TS0042: 2, TS0043: 3, TS0044: 4 };
const PID_GANG = { ...PID_SWITCH, ...PID_REMOTE };
const SWITCH_ID = /^(wall_)?switch_\d_?gang|^switch_\d_gang|^wall_switch_\d_gang/;

function driverInfo(id, j) {
  const caps = (j.capabilities || []).map(String);
  const onoff = caps.filter((c) => /^onoff(\.gang\d+|\.\d+)?$/.test(c)).length;
  const dim = caps.filter((c) => /^dim(\.gang\d+|\.\d+)?$/.test(c)).length;
  const name = lc(id);
  let family = null;
  if (j.class === 'windowcoverings') {family = 'curtain';}
  else if (['button', 'remote'].includes(j.class) || /button|remote|scene_switch|knob/.test(name)) {family = 'remote';}
  else if (dim > 0) {family = 'dimmer';}
  else if (['socket', 'light'].includes(j.class) && onoff > 0) {family = 'switch';}
  if (!family) {return null;}
  const m = name.match(/(\d)[_-]?(?:gang|ch|channel|button|btn|way|socket)/) || name.match(/(?:gang|button|switch|remote|dimmer|scene_switch|wireless|knob|ch)_(\d)(?:_|$)/);
  let gang = m ? Number(m[1]) : 0;
  if (!gang) {gang = family === 'dimmer' ? dim : family === 'switch' ? onoff : family === 'curtain' ? 1 : 0;}
  if (!gang) {return null;}
  return { id, family, gang };
}

function loadGangDrivers(root) {
  const out = new Map();
  for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
    const j = readJson(path.join(root, 'drivers', d, 'driver.compose.json'), null);
    const z = j && j.zigbee;
    if (!z || !Array.isArray(z.manufacturerName) || !z.manufacturerName.length) {continue;}
    const info = driverInfo(d, j);
    if (!info) {continue;}
    out.set(d, { ...info, mfrs: new Set(z.manufacturerName.map(lc)), pids: new Set((z.productId || []).map(uc)) });
  }
  return out;
}

function loadGangEvidence(root) {
  const ev = DC.loadEvidence(root);
  // DP registry including dimmer channels
  const dp = new Map();
  for (const [m, list] of Object.entries(readJson(path.join(root, 'data/dp_registry.json'), { byMfr: {} }).byMfr || {})) {
    let max = 0;
    let plain = false;
    for (const e of list || []) {
      const n = lc(e.name);
      const g = n.match(/^(?:state|switch|brightness)_?l?(\d)$/);
      if (g) {max = Math.max(max, Number(g[1]));}
      if (n === 'state' && Number(e.dpId) === 1) {plain = true;}
    }
    if (max) {dp.set(lc(m), max);} else if (plain) {dp.set(lc(m), 1);}
  }
  const interview = new Map();
  const iv = readJson(path.join(root, 'data/community-sync/johanbendz-issues-enriched.json'), { fingerprints: [] });
  for (const f of iv.fingerprints || []) {
    const eps = (f.endpoints || []).filter((e) => Number(e) >= 1 && Number(e) <= 8);
    if (f.mfr && f.productId && eps.length && (f.clusters || []).includes(6)) {interview.set(`${lc(f.mfr)}|${uc(f.productId)}`, { gang: eps.length, driver: f.driver, src: f.issue });}
  }
  return { ...ev, dp, interview };
}

function directEvidence(key, ev, drivers) {
  const [m, p] = key.split('|');
  const src = [];
  if (PID_GANG[p]) {src.push({ kind: 'pid', gang: PID_GANG[p] });}
  if (ev.dp.has(m)) {src.push({ kind: 'dp', gang: ev.dp.get(m) });}
  if (ev.z2mGang.has(key)) {src.push({ kind: 'z2m', gang: ev.z2mGang.get(key) });}
  if (ev.interview.has(key)) {src.push({ kind: 'interview', gang: ev.interview.get(key).gang, driver: ev.interview.get(key).driver });}
  const r = ev.registry.get(key);
  if (r && drivers.get(r.canonical)) {src.push({ kind: 'registry', gang: drivers.get(r.canonical).gang, driver: r.canonical });}
  return src;
}

const suffixOf = (m) => { const x = String(m).match(/^_t[a-z0-9]+_(.+)$/); return x ? x[1] : null; };

/** Pure classification (unit-tested). */
function classifyCouple(key, ev, drivers, familyIndex) {
  const direct = directEvidence(key, ev, drivers);
  const vals = [...new Set(direct.map((s) => s.gang))];
  if (vals.length === 1) {return { cls: `${vals[0]}-gang`, gang: vals[0], sources: direct };}
  if (vals.length > 1) {return { cls: 'ambiguous', gang: null, sources: direct, why: `sources disagree (${vals.join(' vs ')})` };}
  const [m, p] = key.split('|');
  const suf = suffixOf(m);
  const fam = suf ? (familyIndex.get(`${suf}|${p}`) || []).filter((x) => x.key !== key) : [];
  const fv = [...new Set(fam.map((x) => x.gang))];
  if (fv.length === 1) {return { cls: `${fv[0]}-gang`, gang: fv[0], sources: [{ kind: 'family', gang: fv[0], from: fam.map((x) => x.key.split('|')[0]).slice(0, 4) }] };}
  return { cls: 'ambiguous', gang: null, sources: [], why: fv.length > 1 ? 'family disagrees' : 'no gang evidence (DP-based productId, no DP/endpoint data)' };
}

function run(root) {
  const drivers = loadGangDrivers(root);
  const ev = loadGangEvidence(root);
  // couples on both a 1-gang and a multi-gang driver of a gang family (switch/dimmer/remote) or curtain vs switch
  const byCouple = new Map();
  for (const d of drivers.values()) {
    for (const m of d.mfrs) {for (const p of d.pids) {const k = `${m}|${p}`; if (!byCouple.has(k)) {byCouple.set(k, []);} byCouple.get(k).push(d.id);}}
  }
  const pick = [];
  for (const [k, ds] of byCouple) {
    if (ds.length < 2) {continue;}
    const info = ds.map((d) => drivers.get(d));
    const one = info.filter((x) => x.gang === 1);
    const multi = info.filter((x) => x.gang > 1);
    const gangPair = one.some((a) => multi.some((b) => a.family === b.family));
    const curtainSwitch = info.some((x) => x.family === 'curtain') && info.some((x) => x.family === 'switch');
    if (gangPair || curtainSwitch) {pick.push({ key: k, drivers: ds.sort(), kind: gangPair ? [...new Set(info.map((x) => x.family))].join('/') : 'curtain/switch' });}
  }
  // family index from direct evidence of every couple we know (not only picked ones)
  const familyIndex = new Map();
  for (const k of byCouple.keys()) {
    const direct = directEvidence(k, ev, drivers);
    const vals = [...new Set(direct.map((s) => s.gang))];
    const suf = suffixOf(k.split('|')[0]);
    if (vals.length === 1 && suf) {const fk = `${suf}|${k.split('|')[1]}`; if (!familyIndex.has(fk)) {familyIndex.set(fk, []);} familyIndex.get(fk).push({ key: k, gang: vals[0] });}
  }
  const rows = pick.map((c) => {
    const r = classifyCouple(c.key, ev, drivers, familyIndex);
    const placements = c.drivers.map((d) => ({ driver: d, gang: drivers.get(d).gang, fits: r.gang ? drivers.get(d).gang === r.gang : null }));
    const directAgainst = (d) => r.sources.filter((s) => s.kind !== 'family' && s.gang !== drivers.get(d).gang).map((s) => s.kind);
    const placedBySource = (d) => r.sources.some((s) => s.driver === d);
    const seen = ev.external.has(c.key) ? 'external' : ev.internal.has(c.key) ? 'internal' : 'none';
    const proposals = r.gang ? c.drivers.filter((d) => drivers.get(d).gang !== r.gang && new Set(directAgainst(d)).size >= 2 && !placedBySource(d))
      .map((d) => ({ driver: d, against: [...new Set(directAgainst(d))] })) : [];
    return { couple: c.key, kind: c.kind, cls: r.cls, gang: r.gang, sources: r.sources.map((s) => `${s.kind}:${s.gang}${s.driver ? `@${s.driver}` : ''}${s.from ? `<${s.from.join(',')}` : ''}`), why: r.why, seen, placements, removalProposals: proposals };
  });
  // Manufacturer view: every manufacturerName on both a 1-gang and a multi-gang driver of one family,
  // with the productIds a source pairs it with (real couples), classified the same way.
  const mfrRows = [];
  const byMfr = new Map();
  for (const d of drivers.values()) {for (const m of d.mfrs) {if (!byMfr.has(m)) {byMfr.set(m, []);} byMfr.get(m).push(d);}}
  for (const [m, ds] of byMfr) {
    const fams = new Set(ds.filter((x) => x.gang === 1).map((x) => x.family).filter((f) => ds.some((y) => y.gang > 1 && y.family === f)));
    if (!fams.size) {continue;}
    const rel = ds.filter((x) => fams.has(x.family));
    const allPids = new Set(rel.flatMap((x) => [...x.pids]));
    const real = [...allPids].filter((p) => ev.external.has(`${m}|${p}`) || ev.internal.has(`${m}|${p}`) || ev.interview.has(`${m}|${p}`) || ev.registry.has(`${m}|${p}`)).sort();
    const mark = (want, have) => {
      if (!want) {return '';}
      return want === have ? '✓' : '✗';
    };
    const couples = real.map((p) => {
      const k = `${m}|${p}`;
      const r = classifyCouple(k, ev, drivers, familyIndex);
      const on = rel.filter((x) => x.pids.has(p));
      const directAgainst = (d) => [...new Set(r.sources.filter((s) => s.kind !== 'family' && s.gang !== d.gang).map((s) => s.kind))];
      const proposals = r.gang ? on.filter((d) => d.gang !== r.gang && directAgainst(d).length >= 2 && !r.sources.some((s) => s.driver === d.id))
        .map((d) => ({ driver: d.id, against: directAgainst(d) })) : [];
      return { pid: p, cls: r.cls, gang: r.gang, sources: r.sources.map((s) => `${s.kind}:${s.gang}${s.driver ? `@${s.driver}` : ''}`), on: on.map((d) => `${d.id}:${d.gang}${mark(r.gang, d.gang)}`), removalProposals: proposals };
    });
    mfrRows.push({ mfr: m, family: [...fams].join('/'), drivers: rel.map((x) => `${x.id}:${x.gang}`).sort(), realCouples: couples });
  }
  // Single placements whose evidence disagrees with the driver's gang count (device on the "wrong"
  // gang driver): the runtime adapter may adjust them from what the device reports.
  const misplaced = [];
  for (const d of drivers.values()) {
    if (d.family !== 'switch' || !SWITCH_ID.test(d.id)) {continue;}
    for (const m of d.mfrs) {
      for (const p of d.pids) {
        const k = `${m}|${p}`;
        if (!(ev.external.has(k) || ev.interview.has(k) || ev.registry.has(k))) {continue;}
        const direct = directEvidence(k, ev, drivers).filter((x) => x.kind !== 'pid' || PID_SWITCH[p]);
        const vals = [...new Set(direct.map((x) => x.gang))];
        if (vals.length === 1 && vals[0] !== d.gang && !direct.some((x) => x.driver === d.id)) {
          const kinds = new Set(direct.map((x) => x.kind));
          const right = [...drivers.values()].filter((o) => o.family === 'switch' && SWITCH_ID.test(o.id) && o.gang === vals[0] && o.mfrs.has(m) && o.pids.has(p)).map((o) => o.id);
          const entry = { couple: k, driver: d.id, driverGang: d.gang, gang: vals[0], sources: direct.map((x) => `${x.kind}:${x.gang}${x.driver ? `@${x.driver}` : ''}`), alsoOnMatchingDriver: right };
          // proposal only: >= 2 independent sources, nothing places it on this driver (phantom here)
          if (kinds.size >= 2) {entry.removalProposal = right.length ? 'drop from this driver (a matching driver already carries it)' : 'needs the matching driver to carry it first, then drop here';}
          misplaced.push(entry);
        }
      }
    }
  }
  return { rows, mfrRows, misplaced };
}

function main() {
  const { rows, mfrRows, misplaced } = run(ROOT);
  const realCouples = mfrRows.flatMap((x) => x.realCouples.map((c) => ({ ...c, mfr: x.mfr, family: x.family })));
  const count = (f) => rows.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
  const summary = {
    generated: new Date().toISOString().slice(0, 10),
    couples: rows.length,
    byClass: count((r) => r.cls),
    byKind: count((r) => r.kind),
    bySource: rows.reduce((m, r) => { for (const s of new Set(r.sources.map((x) => x.split(':')[0]))) {m[s] = (m[s] || 0) + 1;} return m; }, {}),
    removalProposals: rows.reduce((n, r) => n + r.removalProposals.length, 0),
    misplacedSinglePlacements: misplaced.length,
    misplacedRemovalProposals: misplaced.filter((x) => x.removalProposal).length,
    manufacturers: { onOneAndMultiGang: mfrRows.length, realCouples: realCouples.length, byClass: realCouples.reduce((m, c) => { m[c.cls] = (m[c.cls] || 0) + 1; return m; }, {}), byFamily: mfrRows.reduce((m, r) => { m[r.family] = (m[r.family] || 0) + 1; return m; }, {}), removalProposals: realCouples.reduce((n, c) => n + c.removalProposals.length, 0) },
  };
  if (!DRY) {
    fs.writeFileSync(path.join(ROOT, 'data/leads/gang-patterns.json'), `${JSON.stringify({ ...summary, note: 'report only; removal proposals are never applied automatically', rows, manufacturers: mfrRows, misplaced })}\n`);
    const couples = {};
    const ambiguous = [];
    for (const r of rows) {if (r.gang) {couples[r.couple] = r.gang;} else {ambiguous.push(r.couple);}}
    for (const x of misplaced) {if (!couples[x.couple]) {couples[x.couple] = x.gang;}}
    for (const c of realCouples) {const k = `${c.mfr}|${c.pid}`; if (c.gang) {couples[k] = c.gang;} else if (!ambiguous.includes(k)) {ambiguous.push(k);}}
    for (const k of ambiguous) {delete couples[k];}
    if (WRITE_RUNTIME) {fs.writeFileSync(path.join(ROOT, 'lib/data/gang-patterns.json'), `${JSON.stringify({ note: 'P2797 gang count per couple listed on a 1-gang and a multi-gang driver; read lazily by lib/devices/GangCountAdapter.js', couples, ambiguous: ambiguous.sort() })}\n`);}
  }
  console.log(JSON.stringify(summary));
}

module.exports = { PID_GANG, driverInfo, classifyCouple, directEvidence, run };
if (require.main === module) {try { main(); } catch (e) { console.error(`gang-patterns: ${e.message}`); process.exit(0); }}
