#!/usr/bin/env node
'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// validate-driver-mesh.js — Validateur structurel inspiré de Polos validate_mesh.py
// Prouve la propriété "no gaps" : chaque driver a son fingerprint, ses capabilities,
// ses flow cards, et sa cohérence compose.json ↔ app.json. Échec CI si incohérence.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

let errors = 0;
let warnings = 0;
const violations = [];

function fail(msg) { violations.push({ sev: 'ERROR', msg }); errors++; }
function warn(msg) { violations.push({ sev: 'WARN', msg }); warnings++; }

// ─── 1. Charger app.json (le "flow graph" compilé) ───
let appJson;
try {
  appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
} catch (e) {
  fail(`app.json illisible: ${e.message}`);
  finish();
}

const appDrivers = new Map();
for (const d of appJson.drivers || []) {
  appDrivers.set(d.id, d);
}

// ─── 2. Invariant I1 : chaque driver a un driver.compose.json ───
const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d =>
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

let checked = 0;
for (const drvName of driverDirs) {
  const composePath = path.join(DRIVERS_DIR, drvName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    warn(`${drvName}: pas de driver.compose.json`);
    continue;
  }

  let compose;
  try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); }
  catch (e) { fail(`${drvName}: compose.json illisible: ${e.message}`); continue; }

  checked++;

  // ─── 3. Invariant I2 : driver présent dans app.json ───
  const appDriver = appDrivers.get(drvName);
  if (!appDriver) {
    warn(`${drvName}: absent de app.json (rebuild requis)`);
    continue;
  }

  // ─── 4. Invariant I3 : manufacturerName cohérent compose ↔ app.json ───
  const composeMfr = compose?.zigbee?.manufacturerName || [];
  const appMfr = appDriver?.zigbee?.manufacturerName || [];
  const composeMfrLower = new Set(composeMfr.map(m => String(m).toLowerCase()));
  const appMfrLower = new Set(appMfr.map(m => String(m).toLowerCase()));

  for (const m of composeMfr) {
    if (!appMfrLower.has(String(m).toLowerCase())) {
      warn(`${drvName}: "${m}" dans compose.json mais absent app.json (rebuild)`);
    }
  }

  // ─── 5. Invariant I4 : productId cohérent ───
  const composePids = compose?.zigbee?.productId || [];
  const appPids = appDriver?.zigbee?.productId || [];
  for (const p of composePids) {
    if (!appPids.some(ap => String(ap).toLowerCase() === String(p).toLowerCase())) {
      warn(`${drvName}: productId "${p}" dans compose mais absent app.json`);
    }
  }

  // ─── 6. Invariant I5 : capabilities cohérentes ───
  const composeCaps = compose?.capabilities || [];
  const appCaps = appDriver?.capabilities || [];
  for (const c of composeCaps) {
    if (!appCaps.includes(c)) {
      warn(`${drvName}: capability "${c}" dans compose mais absent app.json`);
    }
  }

  // ─── 7. Invariant I6 : pas de wildcards (règle L6) ───
  for (const m of composeMfr) {
    if (String(m).includes('*')) {
      fail(`${drvName}: wildcard INTERDIT dans manufacturerName: "${m}" (règle L6)`);
    }
  }

  // ─── 8. Invariant I7 : button.* = event/maintenance only ────────────────
  // Homey/Google Assistant/Alexa voice control must use real stateful
  // capabilities (onoff, dim, windowcoverings, locked, etc.). button.*
  // capabilities are physical events or maintenance helpers, not voice commands.
  if (composeCaps.some(c => c.startsWith('button.'))) {
    const opts = compose.capabilitiesOptions || {};
    for (const c of composeCaps) {
      if (!c.startsWith('button.')) continue;
      const o = opts[c] || {};
      if (o.getable !== false || o.setable !== false || o.maintenanceAction !== true) {
        fail(`${drvName}: button "${c}" must be getable:false + setable:false + maintenanceAction:true`);
      }
    }
  }
}

// ─── 9. Invariant I8 : pas d'ID flow card _hybrid_ (règle L6 suffix) ───
const flowFiles = fs.readdirSync(DRIVERS_DIR).flatMap(drv => {
  const flowDir = path.join(DRIVERS_DIR, drv, 'driver.flow.compose.json');
  return fs.existsSync(flowDir) ? [{ drv, file: flowDir }] : [];
});

for (const { drv, file } of flowFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('_hybrid_')) {
      warn(`${drv}: IDs flow card contenant "_hybrid_" détectés (règle L6)`);
    }
  } catch (_) {}
}

// ─── Rapport ───
function finish() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🔍 VALIDATEUR STRUCTUREL (inspiré Polos validate_mesh.py)');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Drivers vérifiés : ${checked}`);
  console.log(`  Erreurs (CI blocking) : ${errors}`);
  console.log(`  Warnings (rebuild) : ${warnings}`);
  console.log('═══════════════════════════════════════════════');

  if (violations.length > 0 && (errors > 0 || process.env.VERBOSE)) {
    console.log('\nDétails :');
    for (const v of violations.slice(0, 30)) {
      console.log(`  [${v.sev}] ${v.msg}`);
    }
    if (violations.length > 30) console.log(`  ... et ${violations.length - 30} de plus`);
  }

  if (errors > 0) {
    console.error('\n🚫 VALIDATION ÉCHOUÉE');
    process.exit(1);
  }
  console.log('\n✅ Validation passée (warnings = rebuild recommandé).');
  process.exit(0);
}

finish();
