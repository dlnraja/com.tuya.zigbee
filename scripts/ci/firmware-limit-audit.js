#!/usr/bin/env node
'use strict';
/**
 * P3101 (t656u): report-only audit of firmware-limit compensation.
 * 1. Validates config/firmware-limits.json: each entry is an exact couple listed in its driver's
 *    compose, has a source, bounded poll interval. (--strict: exit 1 on config errors only.)
 * 2. Lists candidate devices with a known firmware limit and no compensation entry: driver code
 *    carrying a `WHY(...)` note about a missing battery %/report/DP near a quoted mfr id.
 * Never edits anything. Output: JSON on stdout (+ optional --out file).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/firmware-limits.json'), 'utf8'));
const LIMIT_RE = /(no battery %|no battery percent|battery_low only|alarm[- ]only|never reports?|rarely sent|no reporting|does not report|no power dp|no energy dp)/i;
const MFR_RE = /_T[ZY][A-Z0-9]{1,4}_[a-z0-9]{8}/gi;

function compose(driver) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8')); } catch (_e) { return null; }
}

function validate() {
  const errors = [];
  const minPoll = (cfg.bounds && cfg.bounds.minPollMin) || 60;
  for (const c of cfg.couples || []) {
    const id = `${c.mfr}/${c.pid}`;
    if (!c.source || String(c.source).length < 10) {errors.push(`${id}: missing source`);}
    const comp = compose(c.driver);
    const zb = comp && comp.zigbee;
    const mfrs = (zb && [].concat(zb.manufacturerName || [])).map((m) => String(m).toLowerCase());
    const pids = (zb && [].concat(zb.productId || [])).map((m) => String(m).toUpperCase());
    if (!comp) {errors.push(`${id}: driver ${c.driver} not found`);}
    else if (!mfrs.includes(String(c.mfr).toLowerCase()) || !pids.includes(String(c.pid).toUpperCase())) {errors.push(`${id}: not an exact couple of ${c.driver}`);}
    const p = c.compensation && c.compensation.poll;
    if (p && Number(p.intervalMin) < minPoll) {errors.push(`${id}: poll interval < ${minPoll} min`);}
  }
  return errors;
}

function candidates() {
  const coveredMfr = new Set((cfg.couples || []).map((c) => String(c.mfr).toLowerCase()));
  const coveredDrv = new Set((cfg.couples || []).map((c) => c.driver));
  const out = [];
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, d, 'device.js');
    if (!fs.existsSync(f)) {continue;}
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!LIMIT_RE.test(line)) {return;}
      const win = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      const mfrs = [...new Set((win.match(MFR_RE) || []).map((x) => x.toLowerCase()))].filter((m) => !coveredMfr.has(m));
      if (mfrs.length || !coveredDrv.has(d)) {out.push({ driver: d, mfrs, line: i + 1, hint: line.trim().slice(0, 140) });}
    });
  }
  return out;
}

if (require.main === module) {
  const errors = validate();
  const report = { generatedAt: new Date().toISOString(), compensated: (cfg.couples || []).length, configErrors: errors, uncompensated: candidates() };
  const outIdx = process.argv.indexOf('--out');
  if (outIdx > 0) {fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify(report, null, 2));}
  console.log(JSON.stringify({ compensated: report.compensated, configErrors: errors.length, uncompensated: report.uncompensated.length }));
  if (process.argv.includes('--strict') && errors.length) {process.exit(1);}
}
module.exports = { validate, candidates };
