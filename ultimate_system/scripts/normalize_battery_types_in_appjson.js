#!/usr/bin/env node
/*
 * normalize_battery_types_in_appjson.js
 * --------------------------------------------------------------
 * Normalize energy.batteries in app.json for all drivers with measure_battery.
 * - Allowed: AA, AAA, C, D, CR2032, CR2430, CR2450, CR2477, CR3032, CR2, CR123A, CR14250, CR17335, PP3, INTERNAL, OTHER
 * - Map Li-ion/LiFePO4 variants to INTERNAL
 * - Uppercase, dedupe, drop invalids; if none left -> OTHER
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_JSON = path.join(ROOT, 'app.json');

const ALLOWED = new Set([
  'AA','AAA','C','D',
  'CR2032','CR2430','CR2450','CR2477','CR3032',
  'CR2','CR123A','CR14250','CR17335',
  'PP3','INTERNAL','OTHER'
]);

function normalizeEntry(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim().toUpperCase();
  if (/LI(-| )?ION|LIPO|LI-PO|LI\s?POLY|LITHIUM|LIFEPO4|LIFEPO|LIFEP04/.test(t)) return 'INTERNAL';
  return t;
}

function main() {
  if (!fs.existsSync(APP_JSON)) {
    console.error('app.json not found');
    process.exit(1);
  }
  const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  if (!Array.isArray(app.drivers)) {
    console.error('app.json has no drivers array');
    process.exit(1);
  }
  let changed = 0;
  app.drivers = app.drivers.map((drv) => {
    const d = { ...drv };
    const caps = Array.isArray(d.capabilities) ? d.capabilities : [];
    if (!caps.includes('measure_battery')) return d;
    const inArr = Array.isArray(d.energy && d.energy.batteries) ? d.energy.batteries : [];
    const normalized = inArr.map(normalizeEntry).filter(Boolean).filter((x) => ALLOWED.has(x));
    const unique = Array.from(new Set(normalized));
    if (unique.length === 0) unique.push('OTHER');
    const before = JSON.stringify(d.energy && d.energy.batteries || []);
    const after = JSON.stringify(unique);
    if (before !== after) {
      d.energy = d.energy || {};
      d.energy.batteries = unique;
      changed++;
    }
    return d;
  });
  fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');
  console.log(`✅ Normalized energy.batteries for ${changed} drivers in app.json`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
