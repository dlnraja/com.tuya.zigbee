#!/usr/bin/env node
/**
 * P72 — Crash analysis on diagnostics-report.json
 * Aggregates errs from crash reports + the diagnostics summary,
 * then filters to ones we can fix server-side.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPORT = 'C:\\Users\\Dell\\Documents\\homey\\master\\.github\\state\\gmail\\run29515970208\\.github\\state\\diagnostics-report.json';
const SUMMARY = 'C:\\Users\\Dell\\Documents\\homey\\master\\.github\\state\\gmail\\run29515970208\\diagnostics\\summary.json';

function normalize(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').slice(0, 200).trim();
}

function bucketKey(s) {
  // Drop unique numbers, hashes, device IDs to group similar
  return normalize(s)
    .replace(/0x[0-9a-f]+/gi, '0xHEX')
    .replace(/\b[a-f0-9]{8,}\b/gi, 'HEX')
    .replace(/\[REDACTED_[A-Z]+:[0-9a-f]+\]/gi, '[REDACTED]')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));

// Source 1: errs from report items
const fromReport = new Map();
for (const item of (report.items || [])) {
  for (const e of (item.errs || [])) {
    const k = bucketKey(e);
    if (!k) continue;
    fromReport.set(k, (fromReport.get(k) || 0) + 1);
  }
}

// Source 2: errs from summary
const fromSummary = new Map();
for (const e of (summary.errors || [])) {
  const k = bucketKey(e.err);
  if (!k) continue;
  fromSummary.set(k, (fromSummary.get(k) || 0) + 1);
}

// Combine
const combined = new Map();
for (const [k, v] of fromReport) combined.set(`[rpt] ${k}`, v);
for (const [k, v] of fromSummary) combined.set(`[sum] ${k}`, v);

const top = [...combined.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 80);

console.log('TOP 80 crash/error signatures (combined report + summary):');
console.log('============================================================');
for (const [k, v] of top) {
  console.log(`${String(v).padStart(4)}x  ${k.slice(0, 220)}`);
}

// Filter for "server-fixable" patterns
const SERVER_FIXABLE_PATTERNS = [
  { name: 'card.registerRunListenerasync typo', regex: /card\.registerRunListenerasync/, file: 'smart_knob_rotary, smart_scene_panel, wall_dimmer_1gang_1way' },
  { name: 'Class extends value', regex: /Class extends value/, file: 'smart_knob_rotary, wall_dimmer_1gang_1way' },
  { name: '_registerCapabilityListeners is not a function', regex: /_registerCapabilityListeners is not a function/, file: 'TODO scan' },
  { name: '_inferCapabilityFromValue is not a function', regex: /_inferCapabilityFromValue is not a function/, file: 'TODO scan' },
  { name: 'Invalid Flow Card ID: switch_temp_sensor', regex: /Invalid Flow Card ID: switch_temp_sensor_set_temperature/, file: 'switch_temp_sensor/driver.js' },
  { name: 'Invalid Flow Card ID: water_valve_smart_set_valve', regex: /Invalid Flow Card ID: water_valve_smart_set_valve/, file: 'water_valve_smart/driver.js (P70 fixed?)' },
  { name: 'Invalid Flow Card ID: climate_scene_triggered', regex: /Invalid Flow Card ID: climate_scene_triggered/, file: 'TODO scan' },
  { name: 'Invalid Flow Card ID: boiler_switch_energy', regex: /Invalid Flow Card ID: boiler_switch_energy/, file: 'boiler_switch_energy' },
  { name: 'safeSetCapabilityValue is not a function', regex: /safeSetCapabilityValue is not a function/, file: 'P71 fixed' },
  { name: 'Cannot find module ./utils/safe-timers', regex: /Cannot find module .\/utils\/safe-timers/, file: 'P70 fixed' },
  { name: 'setTimeout undefined', regex: /reading 'setTimeout'/, file: 'stale-runtime' },
  { name: '_destroyed undefined', regex: /reading '_destroyed'/, file: 'stale-runtime' },
  { name: 'homey.app destroyed', regex: /this\.homey\.app.*destroyed/, file: 'stale-runtime' },
  { name: 'GreenPowerCluster', regex: /GreenPowerCluster/, file: 'runtime artifact' },
  { name: 'setInterval undefined', regex: /reading 'setInterval'/, file: 'stale-runtime' },
  { name: 'reading length', regex: /reading 'length'/, file: 'stale-runtime' },
  { name: 'soil_sensor_moisture_changed', regex: /soil_sensor_moisture_changed/, file: 'soil_sensor' },
  { name: 'solar_sunset_detected', regex: /solar_sunset_detected/, file: 'solar_sunset_detected' },
  { name: 'Missing Capability Listener: Button 1', regex: /Missing Capability Listener: Button 1/, file: 'TODO scan' },
  { name: 'this._buttonTriggerProtection undefined', regex: /_buttonTriggerProtection/, file: 'TODO scan' },
  { name: 'ERR_INVALID_ARG_TYPE listener', regex: /ERR_INVALID_ARG_TYPE.*listener/, file: 'TODO scan' },
];

console.log('\n\nSERVER-FIXABLE buckets (ranked):');
console.log('==================================');
const fixes = [];
for (const pat of SERVER_FIXABLE_PATTERNS) {
  let total = 0;
  for (const [k, v] of combined) {
    if (pat.regex.test(k)) total += v;
  }
  if (total > 0) {
    fixes.push({ name: pat.name, count: total, file: pat.file });
  }
}
fixes.sort((a, b) => b.count - a.count);
for (const f of fixes) {
  console.log(`${String(f.count).padStart(4)}x  ${f.name}  ->  ${f.file}`);
}

console.log('\n');
console.log('Unique FPs from diagnostics (top 30):');
console.log('======================================');
const mfrs = new Map();
const pids = new Map();
for (const item of (report.items || [])) {
  for (const m of (item.fps?.mfr || [])) {
    if (!m.startsWith('_')) continue;
    mfrs.set(m, (mfrs.get(m) || 0) + 1);
  }
  for (const p of (item.fps?.pid || [])) {
    pids.set(p, (pids.get(p) || 0) + 1);
  }
}
const topMfrs = [...mfrs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [m, c] of topMfrs) console.log(`  ${String(c).padStart(3)}x  mfr: ${m}`);
console.log('--- pids ---');
const topPids = [...pids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [p, c] of topPids) console.log(`  ${String(c).padStart(3)}x  pid: ${p}`);
