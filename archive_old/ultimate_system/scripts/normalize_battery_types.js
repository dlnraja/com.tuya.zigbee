#!/usr/bin/env node
/*
 * normalize_battery_types.js
 * --------------------------------------------------------------
 * Normalize energy.batteries across all drivers to allowed values.
 * - Allowed: AA, AAA, C, D, CR2032, CR2430, CR2450, CR2477, CR3032,
 *            CR2, CR123A, CR14250, CR17335, PP3, INTERNAL, OTHER
 * - Map common Li-ion/LiFePO4 variants to INTERNAL
 * - Uppercase and deduplicate entries; drop invalids; if none left and measure_battery present, set to ['OTHER']
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const ALLOWED = new Set([
  'AA','AAA','C','D',
  'CR2032','CR2430','CR2450','CR2477','CR3032',
  'CR2','CR123A','CR14250','CR17335',
  'PP3','INTERNAL','OTHER'
]);

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeEntry(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim().toUpperCase();
  // Map common lithium chemistries to INTERNAL
  if (/LI(-| )?ION|LIPO|LI-PO|LI\s?POLY|LITHIUM|LIFEPO4|LIFEPO|LIFEP04/.test(t)) return 'INTERNAL';
  // Normalize CR prefixes (already uppercase)
  return t;
}

function fixManifest(file) {
  const manifest = readJsonSafe(file);
  if (!manifest) return false;
  const caps = Array.isArray(manifest.capabilities) ? manifest.capabilities : [];
  const needs = caps.includes('measure_battery');
  if (!needs) return false;

  manifest.energy = manifest.energy || {};
  const inArr = Array.isArray(manifest.energy.batteries) ? manifest.energy.batteries : [];
  const norm = inArr.map(normalizeEntry).filter(Boolean).filter((x) => ALLOWED.has(x));
  const unique = Array.from(new Set(norm));
  if (unique.length === 0) unique.push('OTHER');

  const before = JSON.stringify(manifest.energy.batteries || []);
  const after = JSON.stringify(unique);
  if (before !== after) {
    manifest.energy.batteries = unique;
    writeJson(file, manifest);
    return true;
  }
  return false;
}

function main() {
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  let fixed = 0;
  entries.forEach((driverId, idx) => {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (fs.existsSync(file) && fixManifest(file)) fixed++;
    if ((idx + 1) % 25 === 0) console.log(`   • Progression: ${idx + 1}/${entries.length}`);
  });
  console.log(`✅ Normalized battery types for ${fixed} drivers`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
