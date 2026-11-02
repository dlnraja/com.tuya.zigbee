#!/usr/bin/env node
'use strict';
// WHY(P3243, 02/11/2026 Paris): Athom finding of 02/11 — builds with the 347 already-published drivers pass,
// and adding ANY never-published driver (heiman_keyfob alone, heiman_siren alone, ay204t+ay222z) gives
// processing_failed AggregateError. No driver-specific cause was found, so the likely cause is a
// manifest-size / driver-combination limit on Athom's side (question asked in forum topic 161681).
// This script reports the manifest footprint every CI run (bytes, drivers, never-published, combos,
// parasite combos from the P3227 zero-parasite plan) and gates it against a ratchet budget so the
// footprint can only shrink or stay. Report-only parts never fail on a branch that lacks a helper.
// Usage: node scripts/ci/manifest-budget.js [--gate] [--json=out.json] [--trend=file.jsonl] [--ledger] [--write-baseline [--raise]]  (--raise only with a reviewed reason: new driver = Athom risk)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BUDGET = path.join('config', 'ci', 'manifest-budget.json');
const TREND_MAX = 200;
const lc = (s) => String(s || '').trim().toLowerCase();
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };

function composeDrivers(root) {
  const dir = path.join(root, 'drivers');
  const out = [];
  if (!fs.existsSync(dir)) {return out;}
  for (const id of fs.readdirSync(dir).sort()) {
    const c = readJson(path.join(dir, id, 'driver.compose.json'), null);
    if (!c) {continue;}
    const z = c.zigbee || {};
    const mfrs = Array.isArray(z.manufacturerName) ? z.manufacturerName : (z.manufacturerName ? [z.manufacturerName] : []);
    const pids = Array.isArray(z.productId) ? z.productId : (z.productId ? [z.productId] : []);
    out.push({ id, mfrs, pids, deprecated: c.deprecated === true });
  }
  return out;
}

function parasites(root) {
  try {
    const { plan } = require(path.join(root, 'scripts', 'perf', 'zero-parasite-plan.js'));
    const r = plan(root, true);
    return { parasites: r.parasites, driversWithParasites: r.driversWithParasites, top: r.drivers.slice(0, 10).map((d) => ({ id: d.id, parasites: d.parasites })) };
  } catch (e) { return { parasites: null, note: `zero-parasite plan unavailable: ${e.message.split('\n')[0]}` }; }
}

/** Pure measure (root = repo dir). */
function measure(root = ROOT) {
  const appFile = path.join(root, 'app.json');
  const appBytes = fs.existsSync(appFile) ? fs.statSync(appFile).size : null;
  const app = readJson(appFile, { drivers: [] });
  const drivers = composeDrivers(root);
  const held = new Set((readJson(path.join(root, 'config', 'publish-hold-drivers.json'), { drivers: [] }).drivers || []).map((d) => d && d.id).filter(Boolean));
  const combos = drivers.reduce((s, d) => s + new Set(d.mfrs.map(lc)).size * new Set(d.pids.map(lc)).size, 0);
  return {
    appBytes, appDrivers: (app.drivers || []).length, composeDrivers: drivers.length,
    neverPublished: held.size, publishable: Math.max(0, (app.drivers || []).length - held.size),
    deprecated: drivers.filter((d) => d.deprecated).length, combos, combosNote: 'lowercase-dedup mfr x pid per driver.compose.json', ...parasites(root),
  };
}

/** Pure gate: a metric over its budget fails; a missing budget key is not gated. */
function gate(m, budget) {
  const errs = [];
  for (const k of ['appBytes', 'combos', 'parasites', 'appDrivers']) {
    const max = budget && budget.max && budget.max[k];
    if (typeof max === 'number' && typeof m[k] === 'number' && m[k] > max) {errs.push(`${k} ${m[k]} > budget ${max}`);}
  }
  return errs;
}

/** Ratchet: the budget only moves down (slack keeps small additive couple fixes possible). */
function ratchet(m, budget, raise = false, slack = { appBytes: 20000, combos: 500, parasites: 200, appDrivers: 0 }) {
  const max = Object.assign({}, budget && budget.max);
  for (const k of Object.keys(slack)) {
    if (typeof m[k] !== 'number') {continue;}
    const cand = m[k] + slack[k];
    max[k] = typeof max[k] === 'number' && !raise ? Math.min(max[k], cand) : cand;
  }
  return { max, hypothesis: 'athom-manifest-size-limit (P3243): any never-published driver -> AggregateError', updated: new Date().toISOString().slice(0, 10) };
}

function appendTrend(file, row) {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  lines.push(JSON.stringify(row));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.slice(-TREND_MAX).join('\n')}\n`);
}

function main(argv) {
  const arg = (n) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
  const m = measure(ROOT);
  const budgetFile = path.join(ROOT, BUDGET);
  const budget = readJson(budgetFile, null);
  console.log(`[manifest-budget] app.json ${m.appBytes} B, ${m.appDrivers} drivers (${m.neverPublished} never published/held, ${m.deprecated} deprecated), ${m.combos} combos, parasites ${m.parasites}`);
  if (argv.includes('--write-baseline')) { fs.mkdirSync(path.dirname(budgetFile), { recursive: true }); fs.writeFileSync(budgetFile, `${JSON.stringify(ratchet(m, budget, argv.includes('--raise')), null, 1)}\n`); console.log('[manifest-budget] budget ratcheted'); }
  if (arg('json')) {fs.writeFileSync(path.resolve(arg('json')), `${JSON.stringify(m, null, 1)}\n`);}
  if (arg('trend')) {appendTrend(path.resolve(ROOT, arg('trend')), { at: new Date().toISOString(), sha: process.env.GITHUB_SHA || null, ...m, top: undefined });}
  const errs = argv.includes('--gate') ? gate(m, budget) : [];
  if (argv.includes('--ledger')) {
    try { const L = require('./autonomy-learn.js'); const f = path.join(ROOT, 'config', 'autonomy-learned.json'); const l = readJson(f, { entries: {}, events: [] }); L.record(l, 'ci:manifest-budget', 'shrink manifest (parasites/continuations), never drop couples', errs.length === 0); fs.writeFileSync(f, `${JSON.stringify(l, null, 2)}\n`); } catch (_) { /* ledger optional */ }
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Manifest budget (P3243)\n| metric | value | budget |\n|---|---|---|\n${
      ['appBytes', 'appDrivers', 'neverPublished', 'combos', 'parasites'].map((k) => `| ${k} | ${m[k]} | ${(budget && budget.max && budget.max[k]) ?? '-'} |`).join('\n')}\n\nHypothesis: Athom refuses any never-published driver -> likely a manifest size/combination limit; shrink before adding drivers.\n`);
  }
  if (errs.length) { console.error(`[manifest-budget] OVER BUDGET: ${errs.join('; ')} — shrink parasites or use a continuation, never drop a sourced couple`); return 1; }
  return 0;
}

module.exports = { measure, gate, ratchet, appendTrend, composeDrivers };
if (require.main === module) {process.exit(main(process.argv.slice(2)));}
