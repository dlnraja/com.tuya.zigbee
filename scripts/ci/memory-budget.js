#!/usr/bin/env node
'use strict';
/**
 * P2914 — memory budget probe (CI report + gate).
 *
 * Loads app.js and every drivers/<id>/{driver,device}.js with the Homey SDK stubbed out, then
 * reports the retained V8 heap. This is the code+static-data floor every Homey install pays
 * before a single device event; Homey Pro kills an app at ~64 MB (crash log: "Reached heap
 * limit Allocation failed", Bastien 1.0.161, 18/10/2026). Run with --expose-gc for stable numbers.
 *
 *   node --expose-gc scripts/ci/memory-budget.js [--budget-mb N] [--json]
 * Writes a Markdown row to $GITHUB_STEP_SUMMARY when set. Exit 1 when over budget.
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const budgetIdx = args.indexOf('--budget-mb');
const budgetMb = budgetIdx >= 0 ? Number(args[budgetIdx + 1]) : Number(process.env.MEMORY_BUDGET_MB || 0);

const noop = () => {};
const P = new Proxy(function stub() {}, { get: (_t, k) => k === 'then' ? undefined : P, apply: () => P, construct: () => P });
class Base { constructor() { this.log = noop; this.error = noop; this.homey = P; } }
const origLoad = Module._load;
Module._load = function load(req, parent, isMain) {
  if (req === 'homey') {return { Device: Base, Driver: Base, App: Base, SimpleClass: Base };}
  if (req === 'homey-zigbeedriver') {
    return { ZigBeeDevice: Base, ZigBeeDriver: Base, ZigBeeLightDevice: Base, ZigBeeXYLightDevice: Base, debug: noop, CLUSTER: P };
  }
  if (req === 'zigbee-clusters') {return new Proxy({}, { get: (_t, k) => k === '__esModule' ? false : P });}
  return origLoad.call(this, req, parent, isMain);
};

const heapMb = () => {
  if (global.gc) { global.gc(); global.gc(); }
  return process.memoryUsage().heapUsed / 1048576;
};

function measure() {
  const cwd = process.cwd();
  process.chdir(root);
  const base = heapMb();
  try { require(path.join(root, 'app.js')); } catch (_e) { /* stubbed SDK: load errors are not memory */ }
  const afterApp = heapMb();
  let drivers = 0;
  const loadErrors = [];
  for (const id of fs.readdirSync(path.join(root, 'drivers'))) {
    let any = false;
    for (const f of ['driver.js', 'device.js']) {
      const p = path.join(root, 'drivers', id, f);
      if (!fs.existsSync(p)) {continue;}
      any = true;
      try { require(p); } catch (e) { loadErrors.push(`${id}/${f}: ${String(e && e.message).split('\n')[0].slice(0, 80)}`); }
    }
    if (any) {drivers++;}
  }
  const afterDrivers = heapMb();
  process.chdir(cwd);
  let app = 'app';
  try { app = `${JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).id}@${JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).version}`; } catch (_e) { /* */ }
  return {
    app,
    gc: Boolean(global.gc),
    baseMb: +base.toFixed(1),
    appMb: +(afterApp - base).toFixed(1),
    driversMb: +(afterDrivers - afterApp).toFixed(1),
    totalMb: +(afterDrivers - base).toFixed(1),
    modules: Object.keys(require.cache).length,
    drivers,
    budgetMb: budgetMb || null,
    loadErrors: loadErrors.length,
    loadErrorSample: loadErrors.slice(0, 5),
  };
}

module.exports = { measure };

if (require.main === module) {
  const r = measure();
  const over = r.budgetMb && r.totalMb > r.budgetMb;
  if (args.includes('--json')) {console.log(JSON.stringify(r));}
  else {console.log(`[MEMORY-BUDGET] ${r.app} code heap ${r.totalMb} MB (app ${r.appMb} + drivers ${r.driversMb}), ${r.modules} modules, ${r.drivers} drivers, budget ${r.budgetMb || 'n/a'} MB, load errors ${r.loadErrors}${over ? ' — OVER' : ''}`);}
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `\n### Memory budget (P2914)\n| app | code heap MB | app.js MB | drivers MB | modules | budget MB |\n|---|---|---|---|---|---|\n| ${r.app} | ${r.totalMb} | ${r.appMb} | ${r.driversMb} | ${r.modules} | ${r.budgetMb || 'n/a'} |\n`);
    } catch (_e) { /* */ }
  }
  process.exit(over ? 1 : 0);
}
