#!/usr/bin/env node
'use strict';
// P3097 (t650u): perf budgets (manifest parse ms, heap MB after loading the manifest).
// Report-only until a stable baseline exists (>= 7 samples within ±20 % of their median); then the
// budget is median × 1.3 and the gate blocks when PERF_BLOCKING=1. History: config/perf-history.json (≤30).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const HIST = path.join(ROOT, 'config', 'perf-history.json');

function median(a) { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; }
function budget(samples) {
  if (samples.length < 7) return null;
  const last = samples.slice(-7); const m = median(last);
  return last.every((v) => Math.abs(v - m) <= 0.2 * m) ? m * 1.3 : null;
}
function evaluate(history, cur) {
  const res = {};
  for (const k of Object.keys(cur)) {
    const b = budget(history.map((h) => h[k]).filter((v) => typeof v === 'number'));
    res[k] = { value: cur[k], budget: b, over: b != null && cur[k] > b };
  }
  return res;
}
function measure() {
  const t = process.hrtime.bigint();
  JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  return { manifestParseMs: Math.round(ms), heapMb: Math.round(process.memoryUsage().heapUsed / 1048576) };
}

if (require.main === module) {
  const hist = fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, 'utf8')) : [];
  const cur = measure(); const r = evaluate(hist, cur);
  console.log(JSON.stringify(r));
  if (process.argv.includes('--record')) fs.writeFileSync(HIST, JSON.stringify([...hist, cur].slice(-30), null, 2) + '\n');
  const over = Object.entries(r).filter(([, v]) => v.over);
  over.forEach(([k, v]) => console.log(`::warning::perf budget ${k}=${v.value} > ${v.budget.toFixed(0)}`));
  process.exit(over.length && process.env.PERF_BLOCKING === '1' ? 1 : 0);
}
module.exports = { budget, evaluate, median };
