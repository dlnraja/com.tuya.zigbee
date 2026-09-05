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

/**
 * ALL 4 prefix/suffix case combos for a Tuya ID. Homey matches
 * manufacturerName CASE-SENSITIVELY at pairing, and firmwares in the
 * wild have been observed reporting every combination:
 *   1. `_tz3000_g9g2xnch` (lower/lower)
 *   2. `_TZ3000_G9G2XNCH` (UPPER/UPPER)
 *   3. `_TZ3000_g9g2xnch` (UPPER/lower — canonical, most common)
 *   4. `_tz3000_G9G2XNCH` (lower/UPPER — rare but observed)
 */
function allCaseCombos(m) {
  const match = String(m).match(/^(_t[zy][a-z0-9]+)_(.+)$/i);
  if (!match) {return [String(m).toLowerCase(), String(m).toUpperCase()];}
  const [, prefix, suffix] = match;
  return [...new Set([
    `${prefix.toLowerCase()}_${suffix.toLowerCase()}`,
    `${prefix.toUpperCase()}_${suffix.toUpperCase()}`,
    `${prefix.toUpperCase()}_${suffix.toLowerCase()}`,
    `${prefix.toLowerCase()}_${suffix.toUpperCase()}`
  ])];
}

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
    const hasExact = (v) => mfrs.some(x => x === v);
    for (const v of allCaseCombos(m)) {
      if (!hasExact(v)) {toAdd.push(v);}
    }
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
