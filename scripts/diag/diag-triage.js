#!/usr/bin/env node
'use strict';
// P3065: offline triage of a Homey app log / diagnostic report (read-only, no network).
// - fingerprints: every manufacturerName (_TZ..., _TYZB..., _TYST...) and productId (TS....) seen,
//   and the drivers that claim the EXACT couple (mfr + pid both in the same driver.compose.json);
// - errors: error lines grouped by a normalised signature (numbers / hex / ids stripped), counted;
// - memory: highest heap / rss MB value seen.
// Samples are redacted (IEEE/MAC, IPv4, long hex/tokens) before they are printed.
// Usage: node scripts/diag/diag-triage.js <log.txt | -> [--json] [--top N]
const fs = require('fs');
const path = require('path');

const MFR_RE = /\b_T(?:Z[0-9A-Z]{1,4}|YZB|YST|Y[A-Z0-9]{2})_[A-Za-z0-9]{4,12}\b/g;
const PID_RE = /\bT[SY]\d{3,4}[A-Z0-9]{0,3}\b/g;
const ERR_RE = /\b(?:Error|TypeError|RangeError|ReferenceError|Unhandled|unhandledRejection|uncaught|ECONN\w*|ETIMEDOUT|timed? ?out|crash(?:ed)?|FATAL|failed)\b/i;
const MEM_RE = /\b(heap(?:Used)?|rss|memory)\b[^\d\n]{0,20}(\d+(?:\.\d+)?)\s*MB\b/gi;

function redact(s) {
  return String(s)
    .replace(/\b(?:[0-9a-f]{2}:){7}[0-9a-f]{2}\b/gi, '<ieee>')
    .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, '<mac>')
    .replace(/\b0x[0-9a-f]{16}\b/gi, '<ieee>')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '<ip>')
    .replace(/\b[0-9a-f]{16,}\b/gi, '<hex>')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '<token>');
}

function signature(line) {
  return redact(line)
    .replace(/^\s*(?:\[?\d{4}-\d\d-\d\d[T ][\d:.]+Z?\]?|\d\d:\d\d:\d\d(?:\.\d+)?)\s*/, '')
    .replace(/\b0x[0-9a-f]+\b/gi, '<n>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<n>')
    .replace(/(['"]).{0,80}?\1/g, '<s>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function loadDriverIndex(root) {
  const out = [];
  const dDir = path.join(root, 'drivers');
  if (!fs.existsSync(dDir)) {return out;}
  for (const dr of fs.readdirSync(dDir).sort()) {
    const p = path.join(dDir, dr, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    let j; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { continue; }
    const z = (j && j.zigbee) || {};
    const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];
    out.push({ driver: dr, mfr: new Set(arr(z.manufacturerName).map(String)), pid: new Set(arr(z.productId).map(String)) });
  }
  return out;
}

function scanLine(line, mfrs, pids, errs, memMax) {
  for (const m of line.match(MFR_RE) || []) {mfrs.set(m, (mfrs.get(m) || 0) + 1);}
  for (const m of line.match(PID_RE) || []) {pids.set(m, (pids.get(m) || 0) + 1);}
  for (const mm of line.matchAll(MEM_RE)) {
    const v = Number(mm[2]);
    if (memMax === null || v > memMax.mb) {memMax = { mb: v, kind: mm[1].toLowerCase() };}
  }
  if (ERR_RE.test(line)) {
    const sig = signature(line);
    if (sig) {
      const e = errs.get(sig) || { signature: sig, count: 0, sample: redact(line).trim().slice(0, 300) };
      e.count++; errs.set(sig, e);
    }
  }
  return memMax;
}

function triage(text, opts = {}) {
  const root = opts.root || path.join(__dirname, '..', '..');
  const top = opts.top || 15;
  const lines = String(text).split(/\r?\n/);
  const mfrs = new Map(); const pids = new Map(); const errs = new Map();
  let memMax = null;
  for (const line of lines) {memMax = scanLine(line, mfrs, pids, errs, memMax);}
  const idx = loadDriverIndex(root);
  const couples = [];
  for (const mfr of mfrs.keys()) {
    for (const pid of pids.size ? pids.keys() : []) {
      const drivers = idx.filter((d) => d.mfr.has(mfr) && d.pid.has(pid)).map((d) => d.driver);
      if (drivers.length) {couples.push({ mfr, pid, drivers });}
    }
  }
  const unknownMfr = [...mfrs.keys()].filter((m) => !idx.some((d) => d.mfr.has(m)));
  return {
    lines: lines.length,
    manufacturers: [...mfrs].map(([k, n]) => ({ mfr: k, count: n })).sort((a, b) => b.count - a.count),
    productIds: [...pids].map(([k, n]) => ({ pid: k, count: n })).sort((a, b) => b.count - a.count),
    couples,
    unknownManufacturers: unknownMfr,
    errors: [...errs.values()].sort((a, b) => b.count - a.count).slice(0, top),
    errorSignatures: errs.size,
    memoryMaxMb: memMax,
  };
}

function main(argv) {
  const json = argv.includes('--json');
  const ti = argv.indexOf('--top');
  const top = ti >= 0 ? Number(argv[ti + 1]) || 15 : 15;
  const file = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--top');
  if (!file) {console.error('usage: diag-triage.js <log.txt | -> [--json] [--top N]'); return 2;}
  const text = file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(file, 'utf8');
  const r = triage(text, { top });
  if (json) {process.stdout.write(`${JSON.stringify(r, null, 2)}\n`); return 0;}
  const o = [];
  o.push(`lines: ${r.lines}`);
  o.push(`fingerprints: ${r.manufacturers.map((m) => m.mfr).join(', ') || '-'} / ${r.productIds.map((p) => p.pid).join(', ') || '-'}`);
  for (const c of r.couples) {o.push(`  ${c.mfr} + ${c.pid} -> ${c.drivers.join(', ')}`);}
  if (r.unknownManufacturers.length) {o.push(`  not claimed by any driver: ${r.unknownManufacturers.join(', ')}`);}
  o.push(`errors: ${r.errorSignatures} signature(s)`);
  for (const e of r.errors) {o.push(`  ${String(e.count).padStart(5)}x ${e.signature}`);}
  if (r.memoryMaxMb) {o.push(`memory max: ${r.memoryMaxMb.mb} MB (${r.memoryMaxMb.kind})`);}
  process.stdout.write(`${o.join('\n')}\n`);
  return 0;
}

if (require.main === module) {process.exitCode = main(process.argv.slice(2));}
module.exports = { triage, signature, redact };
