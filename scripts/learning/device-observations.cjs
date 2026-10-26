#!/usr/bin/env node
'use strict';
/**
 * P3073 §2 — what the devices tell us in their logs, per EXACT mfr+pid couple (no AI, offline).
 *
 * Input: text logs or JSON reports (diagnostics-report.json in CI, any diag/crash log on the box).
 * A "unit" is one file, or one top-level report of a JSON array/object. A unit is attributed to a
 * couple only when it names exactly one manufacturer and one model id; lines that carry both ids
 * themselves are always attributed. Anything else is ignored (never guessed).
 *
 * Output: data/leads/learning-candidates.json — max 200 couples x 16 DPs, status "candidate",
 * source recorded, oldest couple evicted first. Never written into drivers: promotion stays with
 * the existing rules (one reliable source, exact couple, recorded source).
 *
 * CLI: node scripts/learning/device-observations.cjs <file…> [--out=F] [--source=label] [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'leads', 'learning-candidates.json');
const MAX_COUPLES = 200;
const MAX_DPS = 16;
const MAX_SOURCES = 4;
const MAX_GAPS = 64;
const DIVS = [1, 10, 100, 1000];
const MAX_SEEN = 400;
const crypto = require('crypto');

const MFR_RE = /\b(_T[A-Z0-9]{3,6}_[a-z0-9]{8})\b/gi;
const PID_RE = /\b(TS\d{3,4}[A-Z]?|TY\d{4}|SNZB-\d{2}[A-Z]?|ZG-\d{3}[A-Z]?)\b/g;
const TS_RE = /^\s*\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/;
const DP_RAW_RE = /\bDP ?(\d{1,3})\b[^\n]{0,40}?raw=(-?\d+(?:\.\d+)?)/i;
const SMART_RE = /SmartDivisor ([a-z_.]+): raw=(-?\d+(?:\.\d+)?) \S+ (-?\d+(?:\.\d+)?)/i;
const UNMAPPED_RE = /\bDP ?(\d{1,3})\b[^\n]{0,60}\b(unmapped|unknown dp|not mapped|no mapping|unhandled)\b/i;
const UNAVAIL_RE = /setUnavailable|\bunavailable\b/i;
const MEM_RE = /MEMWARN|MEM-BUDGET/;
const HEAP_RE = /heap\w*[^0-9\n]{0,12}(\d+(?:\.\d+)?) ?MB/i;

const uniq = (a) => [...new Set(a)];
const ids = (s, re) => uniq((String(s).match(re) || []));
const normMfr = (m) => { const p = m.split('_'); return `_${p[1].toUpperCase()}_${p[2].toLowerCase()}`; };

function divIndex(raw, val) {
  if (!raw || !val) {return -1;}
  const l = Math.log10(Math.abs(raw / val));
  const i = Math.round(l);
  return i >= 0 && i < 4 && Math.abs(l - i) <= 0.35 ? i : -1;
}

/** Split a file into units (text: one unit; JSON array/object of reports: one per report). */
function unitsOf(text) {
  const t = String(text || '');
  if (/^\s*[[{]/.test(t)) {
    try {
      const j = JSON.parse(t);
      const list = Array.isArray(j) ? j : Array.isArray(j.reports) ? j.reports : [j];
      return list.map((r) => JSON.stringify(r).replace(/\\n/g, '\n'));
    } catch (_) { /* fall through to text */ }
  }
  return [t];
}

/** Observations of one unit: { couple, dps:{dp:{min,max,v[4],unmapped,gaps[]}}, unavailable, mem, heap } or null. */
function observeUnit(text) {
  const lines = String(text).split('\n');
  const mfrs = uniq(ids(text, MFR_RE).map(normMfr));
  const pids = ids(text, PID_RE);
  const unitCouple = mfrs.length === 1 && pids.length === 1 ? `${mfrs[0]}|${pids[0]}` : null;
  const per = new Map();
  const get = (c) => { if (!per.has(c)) {per.set(c, { dps: {}, unavailable: 0, mem: 0, heap: 0, last: {} });} return per.get(c); };
  const dpOf = (o, dp) => {
    if (!o.dps[dp]) { if (Object.keys(o.dps).length >= MAX_DPS) {return null;} o.dps[dp] = { min: null, max: null, v: [0, 0, 0, 0], unmapped: 0, gaps: [] }; }
    return o.dps[dp];
  };
  let lastDp = null; let lastRaw = null;
  for (const line of lines) {
    const lm = ids(line, MFR_RE).map(normMfr); const lp = ids(line, PID_RE);
    const c = lm.length === 1 && lp.length === 1 ? `${lm[0]}|${lp[0]}` : unitCouple;
    if (!c) {continue;}
    const o = get(c);
    const ts = (line.match(TS_RE) || [])[1];
    const at = ts ? Date.parse(ts.replace(' ', 'T')) : NaN;
    let m = line.match(DP_RAW_RE);
    if (m) {
      const dp = m[1]; const raw = Number(m[2]); const d = dpOf(o, dp);
      lastDp = dp; lastRaw = raw;
      if (d) {
        d.min = d.min === null ? raw : Math.min(d.min, raw); d.max = d.max === null ? raw : Math.max(d.max, raw);
        if (Number.isFinite(at)) { if (o.last[dp] && at > o.last[dp] && d.gaps.length < MAX_GAPS) {d.gaps.push((at - o.last[dp]) / 1000);} o.last[dp] = at; }
      }
    }
    m = line.match(SMART_RE);
    if (m && lastDp !== null && Number(m[2]) === lastRaw) {
      const d = dpOf(o, lastDp); const i = divIndex(Number(m[2]), Number(m[3]));
      if (d && i >= 0) {d.v[i]++;}
    }
    m = line.match(UNMAPPED_RE);
    if (m) { const d = dpOf(o, m[1]); if (d) {d.unmapped++;} }
    if (UNAVAIL_RE.test(line)) {o.unavailable++;}
    if (MEM_RE.test(line)) { o.mem++; const h = line.match(HEAP_RE); if (h) {o.heap = Math.max(o.heap, Number(h[1]));} }
  }
  return per;
}

const median = (a) => { if (!a.length) {return 0;} const s = a.slice().sort((x, y) => x - y); return Math.round(s[Math.floor(s.length / 2)]); };

function emptyOut() { return { schema: 1, note: 'P3073 candidates only, never applied automatically', cap: { couples: MAX_COUPLES, dps: MAX_DPS }, updatedAt: null, seen: [], couples: {} }; }
function load(file = OUT) { try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); if (j && j.couples) {return Object.assign(emptyOut(), j);} } catch (_) { /* new */ } return emptyOut(); }

/** Merge per-couple observations into the bounded candidates file. */
function merge(out, per, source, now = new Date().toISOString()) {
  for (const [couple, o] of per) {
    const c = out.couples[couple] || (out.couples[couple] = { status: 'candidate', sources: [], firstSeen: now, lastSeen: now, dps: {}, unavailable: 0, memwarn: 0, maxHeapMB: 0, anomalies: [] });
    c.lastSeen = now;
    if (source && !c.sources.includes(source)) { c.sources.push(source); if (c.sources.length > MAX_SOURCES) {c.sources.shift();} }
    c.unavailable += o.unavailable; c.memwarn += o.mem; c.maxHeapMB = Math.max(c.maxHeapMB, o.heap);
    for (const [dp, d] of Object.entries(o.dps)) {
      let t = c.dps[dp];
      if (!t) { if (Object.keys(c.dps).length >= MAX_DPS) {continue;} t = c.dps[dp] = { min: null, max: null, votes: [0, 0, 0, 0], unmapped: 0, intervalS: 0 }; }
      if (d.min !== null) { t.min = t.min === null ? d.min : Math.min(t.min, d.min); t.max = t.max === null ? d.max : Math.max(t.max, d.max); }
      for (let i = 0; i < 4; i++) {t.votes[i] += d.v[i];}
      t.unmapped += d.unmapped;
      if (d.gaps.length) {t.intervalS = median(d.gaps);}
    }
    c.anomalies = Object.entries(c.dps).filter(([, t]) => { const s = t.votes.reduce((a, b) => a + b, 0); return s >= 4 && t.votes.filter((v) => v / s >= 0.2).length > 1; })
      .map(([dp, t]) => `DP${dp} scales ${t.votes.map((v, i) => (v ? `/${DIVS[i]}` : '')).filter(Boolean).join(' vs ')}`).slice(0, 8);
  }
  const keys = Object.keys(out.couples);
  if (keys.length > MAX_COUPLES) {
    keys.sort((a, b) => String(out.couples[a].lastSeen).localeCompare(String(out.couples[b].lastSeen)));
    for (const k of keys.slice(0, keys.length - MAX_COUPLES)) {delete out.couples[k];}
  }
  return out;
}

function run(files, { outFile = OUT, source, dry = false } = {}) {
  const out = load(outFile);
  let units = 0;
  for (const f of files) {
    let text; try { text = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
    const label = source || path.basename(f).replace(/[^\w.-]/g, '_').slice(0, 60);
    for (const u of unitsOf(text)) {
      const h = crypto.createHash('sha1').update(u).digest('hex').slice(0, 12);
      if (out.seen.includes(h)) {continue;} // same report read twice: count it once
      const per = observeUnit(u);
      if (per.size) { merge(out, per, label); units++; out.seen.push(h); }
    }
    if (out.seen.length > MAX_SEEN) {out.seen.splice(0, out.seen.length - MAX_SEEN);}
  }
  out.updatedAt = new Date().toISOString();
  if (!dry) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n'); }
  return { units, couples: Object.keys(out.couples).length, out };
}

module.exports = { observeUnit, unitsOf, merge, load, emptyOut, run, MAX_COUPLES, MAX_DPS };

if (require.main === module) {
  const a = process.argv.slice(2);
  const arg = (k) => { const x = a.find((v) => v.startsWith(`--${k}=`)); return x ? x.slice(k.length + 3) : undefined; };
  try {
    const files = a.filter((v) => !v.startsWith('--')).filter((f) => fs.existsSync(f));
    const r = run(files, { outFile: arg('out') || OUT, source: arg('source'), dry: a.includes('--dry') });
    console.log(`[device-observations] ${files.length} file(s), ${r.units} attributed unit(s), ${r.couples} couple(s) in candidates`);
  } catch (e) { console.log(`::warning::device-observations: ${e.message}`); }
}
