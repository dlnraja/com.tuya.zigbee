#!/usr/bin/env node
'use strict';
/**
 * case-variant-fixer.js (v9.0.373)
 * Homey matches zigbee manufacturerName CASE-SENSITIVELY at pairing time.
 * A fingerprint present in only one case means devices reporting in the other
 * case pair as "Unknown Zigbee device". This tool ensures every Tuya-pattern
 * fingerprint has BOTH variants (upper + lower) in its driver.compose.json.
 *
 * Skips synthetic placeholders (_DISABLED, _dummy, _GENERIC, _hybrid...).
 * DRY-RUN by default; use --apply to write.
 *
 * Usage: node tools/ci/case-variant-fixer.js [--apply] [driverId...]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const onlyDrivers = process.argv.slice(2).filter(a => !a.startsWith('-'));

const TUYA_RX = /^_t[zy][a-z0-9]{4,}_/i; // _TZ3000_, _TZE200_, _TYZB01_, _TYST11_, variants longues
const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_/i;

const report = { apply: APPLY, drivers: 0, added: 0, skippedSynthetic: 0, details: [] };

for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  if (onlyDrivers.length && !onlyDrivers.includes(d)) {continue;}
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const mfrs = c.zigbee?.manufacturerName;
  if (!Array.isArray(mfrs) || !mfrs.length) {continue;}

  const set = new Set(mfrs.map(m => String(m).toLowerCase()));
  const toAdd = [];
  for (const m of [...set]) {
    if (!TUYA_RX.test(m)) {continue;}
    if (SYNTHETIC_RX.test(m)) {report.skippedSynthetic++; continue;}
    const up = m.toUpperCase();
    const lo = m.toLowerCase();
    const hasUp = mfrs.some(x => x === up);
    const hasLo = mfrs.some(x => x === lo);
    if (!hasUp && up !== lo) {toAdd.push(up);}
    if (!hasLo) {toAdd.push(lo);}
  }
  if (!toAdd.length) {continue;}

  report.drivers++;
  report.added += toAdd.length;
  report.details.push({ driver: d, added: toAdd.length });
  if (APPLY) {
    c.zigbee.manufacturerName = [...mfrs, ...toAdd];
    fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
  }
}

fs.writeFileSync(
  path.join(ROOT, '.github', 'state', 'case-variant-report.json'),
  JSON.stringify({ generated: new Date().toISOString(), ...report }, null, 1)
);
console.log(`[case-variant-fixer] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} | drivers concernés: ${report.drivers} | variantes ${APPLY ? 'ajoutées' : 'à ajouter'}: ${report.added} | placeholders ignorés: ${report.skippedSynthetic}`);
