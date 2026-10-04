#!/usr/bin/env node
'use strict';
/*
 * Spec 010 / T1: boot-time and heap baseline.
 * Loads app.js and every driver/device module in a Homey-less harness (a tiny stand-in for
 * the `homey` module), then records wall time and heapUsed. Nothing is instantiated, so this
 * measures module-load cost only (the part lazy loading is meant to reduce).
 *
 * Usage: node scripts/perf/boot-heap.js [--out reports/perf/boot-heap-<date>.json]
 *                                       [--compare <old.json>] [--warn-pct 10]
 * Exit code is always 0 (warn-only, per spec 010 T8); a regression prints a WARN line.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

class Base {
  constructor() { this.homey = homeyStub; }
  log() {} error() {}
}
const homeyStub = { __: (k) => k, settings: { get() {}, set() {}, on() {} }, flow: {}, on() {} };
const homeyModule = {
  App: Base, Driver: Base, Device: Base, SimpleClass: Base, FlowCard: Base,
  ManagerSettings: {}, __: (k) => k,
};
const origLoad = Module._load;
Module._load = function homeyLessLoad(request, parent, isMain) {
  if (request === 'homey') return homeyModule;
  return origLoad.call(this, request, parent, isMain);
};

function moduleList() {
  const list = [];
  if (fs.existsSync(path.join(ROOT, 'app.js'))) list.push('app.js');
  const dDir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dDir).sort()) {
    for (const f of ['driver.js', 'device.js']) {
      if (fs.existsSync(path.join(dDir, d, f))) list.push(`drivers/${d}/${f}`);
    }
  }
  return list;
}

function measure() {
  if (global.gc) global.gc();
  const heap0 = process.memoryUsage().heapUsed;
  const t0 = process.hrtime.bigint();
  const errors = [];
  const files = moduleList();
  let appMs = null;
  for (const rel of files) {
    const ts = process.hrtime.bigint();
    try { require(path.join(ROOT, rel)); } catch (e) { errors.push({ file: rel, error: String(e && e.message).slice(0, 160) }); }
    if (rel === 'app.js') appMs = Number(process.hrtime.bigint() - ts) / 1e6;
  }
  const wallMs = Number(process.hrtime.bigint() - t0) / 1e6;
  if (global.gc) global.gc();
  const heap1 = process.memoryUsage().heapUsed;
  return {
    date: new Date().toISOString(),
    node: process.version,
    gcExposed: Boolean(global.gc),
    modulesRequested: files.length,
    modulesLoadedTotal: Object.keys(require.cache).length,
    appJsMs: appMs !== null ? Math.round(appMs) : null,
    wallMs: Math.round(wallMs),
    heapUsedDeltaMB: Math.round((heap1 - heap0) / 1048576 * 10) / 10,
    heapUsedMB: Math.round(heap1 / 1048576 * 10) / 10,
    loadErrors: errors,
  };
}

const result = measure();
const out = opt('--out', null);
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, out), JSON.stringify(result, null, 2) + '\n');
}
console.log(`[boot-heap] modules=${result.modulesRequested} (cache ${result.modulesLoadedTotal}) wall=${result.wallMs}ms ` +
  `heapDelta=${result.heapUsedDeltaMB}MB heap=${result.heapUsedMB}MB loadErrors=${result.loadErrors.length}`);
const cmp = opt('--compare', null);
if (cmp && fs.existsSync(path.resolve(ROOT, cmp))) {
  const old = JSON.parse(fs.readFileSync(path.resolve(ROOT, cmp), 'utf8'));
  const pct = Number(opt('--warn-pct', '10'));
  for (const k of ['wallMs', 'heapUsedDeltaMB']) {
    if (old[k] > 0 && result[k] > old[k] * (1 + pct / 100)) {
      console.log(`[boot-heap] WARN ${k} ${old[k]} -> ${result[k]} (> ${pct} %)`);
    }
  }
}
// Module-load side effects (timers from top-level code) must not keep the process alive.
process.exit(0);
