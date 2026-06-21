#!/usr/bin/env node
'use strict';
// pre-commit-fp-sync.js — Vérifie la cohérence driver.compose.json ↔ app.json
// Évite le bug "HOBEIAN absent de app.json" (device non reconnu au pairing)
// Doit passer avant tout commit. Code retour non-zéro = échec.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

let errors = 0;
let warnings = 0;

function fail(msg) { console.error(`❌ ${msg}`); errors++; }
function warn(msg) { console.warn(`⚠️  ${msg}`); warnings++; }

// 1. Charger app.json compilé
let appJson;
try {
  appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
} catch (e) {
  fail(`app.json illisible: ${e.message}`);
  process.exit(1);
}

const appDrivers = new Map();
for (const d of appJson.drivers || []) {
  appDrivers.set(d.id, d);
}

// 2. Pour chaque driver.compose.json, vérifier cohérence avec app.json
const driverDirs = fs.readdirSync(DRIVERS_DIR);
for (const drvName of driverDirs) {
  const composePath = path.join(DRIVERS_DIR, drvName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;

  let compose;
  try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); }
  catch (e) { fail(`${drvName}: compose.json illisible`); continue; }

  const appDriver = appDrivers.get(drvName);
  if (!appDriver) {
    warn(`${drvName}: absent de app.json (sera ajouté au prochain build)`);
    continue;
  }

  // Vérifier manufacturerName : tous les mfr du compose doivent être dans app.json
  const composeMfr = compose?.zigbee?.manufacturerName || [];
  const appMfr = appDriver?.zigbee?.manufacturerName || [];
  const appMfrLower = new Set(appMfr.map((m) => String(m).toLowerCase()));

  for (const m of composeMfr) {
    if (!appMfrLower.has(String(m).toLowerCase())) {
      warn(`${drvName}: "${m}" présent dans compose.json mais ABSENT de app.json → rebuild requis`);
    }
  }

  // Vérifier productId
  const composePids = compose?.zigbee?.productId || [];
  const appPids = appDriver?.zigbee?.productId || [];
  const appPidsLower = new Set(appPids.map((p) => String(p).toLowerCase()));

  for (const p of composePids) {
    if (!appPidsLower.has(String(p).toLowerCase())) {
      warn(`${drvName}: productId "${p}" dans compose.json mais ABSENT de app.json → rebuild requis`);
    }
  }
}

// 3. Rapport
console.log('═══════════════════════════════════════════════');
console.log('  PRE-COMMIT : Cohérence driver.compose.json ↔ app.json');
console.log('═══════════════════════════════════════════════');
console.log(`  Erreurs : ${errors}`);
console.log(`  Warnings (rebuild requis) : ${warnings}`);
console.log('═══════════════════════════════════════════════');

if (errors > 0) {
  console.error('\n🚫 COMMIT BLOQUÉ : erreurs critiques détectées.');
  process.exit(1);
}
if (warnings > 0) {
  console.warn('\n⚠️  ATTENTION : exécutez `homey app build` avant de publier.');
}
console.log('\n✅ Pre-commit check passé.');
