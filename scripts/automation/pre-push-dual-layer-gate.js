#!/usr/bin/env node
/**
 * pre-push hook — dual-layer manufacturer check.
 *
 * Blocks when app.json dropped a manufacturerName that driver.compose.json
 * still declares. That is the bot wipe this gate was added for.
 * An authored empty list in both files is a non-pairing shell (productId
 * may remain; other drivers hold the real couples). It is not filled with
 * invented names and it is not treated as an AggregateError by itself.
 *
 * Wi-Fi / virtual drivers have no Zigbee manufacturer list.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const C = { R: '\x1b[0m', r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[34m', B: '\x1b[1m' };
const SYNTHETIC_MANUFACTURER_RE = /unknown|dummy|placeholder|needs_device_assignment|^_generic_|^_GENERIC_|^_hybrid_|^_HYBRID_|^_master_|^_MASTER_/;

function listedManufacturers(driver) {
  const raw = driver && driver.zigbee && driver.zigbee.manufacturerName;
  if (!Array.isArray(raw)) {return [];}
  return raw.filter((m) => typeof m === 'string' && m.trim());
}

/**
 * Manufacturers present in compose and absent from app.json.
 * Both-empty returns [] — nothing was wiped.
 * @returns {string[]}
 */
function missingComposeManufacturers(appDriver, composeDriver) {
  const composeMfrs = listedManufacturers(composeDriver);
  if (!composeMfrs.length) {return [];}
  if (!appDriver || !appDriver.zigbee) {return composeMfrs.slice();}
  const appSet = new Set(listedManufacturers(appDriver).map((m) => m.toLowerCase()));
  return composeMfrs.filter((m) => !appSet.has(m.toLowerCase()));
}

function collectLayerWipes(appDrivers, composeById) {
  const errors = [];
  for (const d of appDrivers || []) {
    if (!d || !d.id || !d.zigbee) {continue;}
    const missing = missingComposeManufacturers(d, composeById[d.id]);
    if (missing.length) {
      errors.push(`[zigbee] ${d.id} lost ${missing.length} compose manufacturerName`);
    }
  }
  return errors;
}

function loadComposeById(root) {
  const dir = path.join(root, 'drivers');
  const out = {};
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return out; }
  for (const id of names) {
    const p = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    try { out[id] = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* unreadable compose is not a silent pass */ }
  }
  return out;
}

function main() {
  console.log(`${C.B}${C.b}\n🔒 PRE-PUSH DUAL-LAYER GATE${C.R}`);
  let app;
  try {
    app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json')));
  } catch (e) {
    console.error(`${C.r}❌ app.json invalide JSON: ${e.message}${C.R}`);
    process.exit(1);
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')));
    if (pkg.version !== app.version) {
      console.warn(`${C.y}⚠️  Versions désynchronisées: app.json=${app.version} package.json=${pkg.version}${C.R}`);
      pkg.version = app.version;
      fs.writeFileSync(path.join(ROOT, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
      try { execSync('git add package.json', { cwd: ROOT }); } catch { /* not a git checkout */ }
    }
  } catch { /* package.json optional for the manufacturer check */ }

  const warnings = [];
  let fp = 0;
  for (const d of app.drivers || []) {
    const mfrs = listedManufacturers(d);
    fp += mfrs.length;
    const synthetic = mfrs.filter((m) => SYNTHETIC_MANUFACTURER_RE.test(m));
    if (synthetic.length && warnings.length < 12) {
      warnings.push(`${d.id}: ${synthetic.slice(0, 2).join(', ')}`);
    }
  }
  const errors = collectLayerWipes(app.drivers, loadComposeById(ROOT));
  console.log(`  v${app.version} | drivers:${(app.drivers || []).length} FPs:${fp}`);
  if (!errors.length) {
    for (const w of warnings) {console.warn(`${C.y}    - ${w}${C.R}`);}
    console.log(`${C.g}  ✅ Dual-Layer PASS — compose manufacturers still in app.json${C.R}`);
    process.exit(0);
  }
  console.error(`${C.r}${C.B}\n  ❌ PUSH BLOQUÉ — ${errors.length} driver(s) lost compose manufacturerName:${C.R}`);
  for (const e of errors) {console.error(`${C.r}    ❌ ${e}${C.R}`);}
  process.exit(1);
}

module.exports = {
  listedManufacturers,
  missingComposeManufacturers,
  collectLayerWipes,
};

if (require.main === module) {main();}
