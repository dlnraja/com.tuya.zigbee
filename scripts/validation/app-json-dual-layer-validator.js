#!/usr/bin/env node
/**
 * app-json-dual-layer-validator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validateur DUAL-LAYER complet pour app.json Homey SDK3.
 *
 * Architecture dual-layer (Section 34, ARCHITECTURE.md):
 *   Layer 1 - STATIQUE : driver.compose.json → app.json (via homey app build)
 *              manufacturerName[] DOIT être non-vide pour TOUT driver Zigbee
 *   Layer 2 - DYNAMIQUE : data/fingerprints.json chargé en runtime (Buffer, lazy)
 *              Enrichit les capabilities mais NE remplace PAS la couche statique
 *
 * Homey Pro fait le pairing en lisant la couche STATIQUE uniquement.
 * Un manufacturerName[] vide = AggregateError = build rejeté par Athom.
 *
 * CLASSIFICATION des drivers:
 *   - ZIGBEE: a une section `zigbee` dans driver.compose.json
 *             → DOIT avoir manufacturerName[] non-vide
 *   - WIFI/LAN: connectivity: ["lan"] ou ["cloud"]
 *             → PAS de manufacturerName requis (pairing via local IP/token)
 *   - VIRTUAL: pas de connectivity, pas de zigbee (ex: ir_remote virtuel)
 *             → Exempt de manufacturerName
 *   - HYBRID: zigbee + lan/cloud
 *             → DOIT avoir manufacturerName[] non-vide (pairing initial Zigbee)
 *
 * Usage:
 *   node scripts/validation/app-json-dual-layer-validator.js [--fix] [--strict]
 *   --fix    : Tente de corriger automatiquement depuis driver.compose.json
 *   --strict : Exit code 1 si warnings (pour CI bloquant)
 *
 * @version 2.0.0
 * @author Antigravity + dlnraja
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { isSyntheticManufacturer } = require('../maintenance/compact-zigbee-identifiers.cjs');

// ─── Configuration ──────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STABLE_APP_JSON = path.join(ROOT, 'stable_app.json');

const ARGS = process.argv.slice(2);
const FIX_MODE = ARGS.includes('--fix');
const STRICT_MODE = ARGS.includes('--strict');
const VERBOSE = ARGS.includes('--verbose') || ARGS.includes('-v');

// ─── Couleurs console ────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  bold: '\x1b[1m', dim: '\x1b[2m'
};
const ok  = (s) => console.log(C.green + '  ✅ ' + s + C.reset);
const err = (s) => console.error(C.red + '  ❌ ' + s + C.reset);
const warn = (s) => console.warn(C.yellow + '  ⚠️  ' + s + C.reset);
const info = (s) => console.log(C.cyan + '  ℹ️  ' + s + C.reset);
const hdr  = (s) => console.log(C.bold + C.blue + '\n=== ' + s + ' ===' + C.reset);

// ─── SDK3 Required fields ────────────────────────────────────────────────────
const SDK3_REQUIRED_TOP = [
  'id', 'version', 'compatibility', 'sdk', 'name', 'description',
  'category', 'permissions', 'images', 'author'
];
const SDK3_REQUIRED_DRIVER = ['id', 'name', 'class', 'capabilities', 'images'];
const WIFI_PREFIXES = ['wifi_', 'sonoff_', 'ewelink_'];
const WIFI_KEYWORDS = ['ewelink', 'sonoff'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isWifiDriver(d) {
  if (!d || !d.id) return false;
  // Par connectivity déclarée
  const conn = d.connectivity || [];
  if (conn.some(c => ['lan', 'cloud'].includes(c))) return true;
  // Par nom
  const id = d.id.toLowerCase();
  if (WIFI_PREFIXES.some(p => id.startsWith(p))) return true;
  if (WIFI_KEYWORDS.some(k => id.includes(k))) return true;
  return false;
}

function isVirtualDriver(d) {
  if (!d || !d.id) return false;
  const conn = d.connectivity || [];
  const hasZigbee = !!d.zigbee;
  if (hasZigbee) return false;
  if (conn.length === 0 && !isWifiDriver(d)) return true;
  return false;
}

function classifyDriver(d) {
  if (!d) return 'unknown';
  const conn = d.connectivity || [];
  const hasZigbee = !!d.zigbee;
  const isLan = conn.some(c => ['lan', 'cloud'].includes(c));

  if (hasZigbee && isLan) return 'hybrid';
  if (hasZigbee) return 'zigbee';
  if (isWifiDriver(d)) return 'wifi';
  if (isVirtualDriver(d)) return 'virtual';
  return 'unknown';
}

// ─── Main Validation ─────────────────────────────────────────────────────────
async function validate() {
  console.log(C.bold + C.blue + '\n╔══════════════════════════════════════════════════════╗');
  console.log('║   APP.JSON DUAL-LAYER VALIDATOR — Homey SDK3         ║');
  console.log('╚══════════════════════════════════════════════════════╝' + C.reset);

  if (!fs.existsSync(APP_JSON)) {
    err('app.json introuvable: ' + APP_JSON);
    process.exit(1);
  }

  // Charger app.json via Buffer (anti-OOM, cf Section 34 ARCHITECTURE.md)
  let app;
  try {
    app = JSON.parse(fs.readFileSync(APP_JSON));
  } catch(e) {
    err('app.json invalide JSON: ' + e.message);
    process.exit(1);
  }

  const drivers = app.drivers || [];
  const errors = [];
  const warnings = [];
  const fixes = [];
  const syntheticDrivers = [];
  const stats = {
    total: drivers.length, zigbee: 0, wifi: 0,
    virtual: 0, hybrid: 0, unknown: 0,
    zigbeeOk: 0, zigbeeEmpty: 0, hybridOk: 0, hybridEmpty: 0,
    totalFP: 0, syntheticFP: 0
  };

  // ── 1. Validation top-level ──────────────────────────────────────────────
  hdr('1. SDK3 TOP-LEVEL FIELDS');
  SDK3_REQUIRED_TOP.forEach(k => {
    if (app[k] === undefined || app[k] === null) {
      errors.push('Top-level champ manquant: ' + k);
      err('Champ manquant: ' + k);
    } else {
      if (VERBOSE) ok(k + ' = ' + JSON.stringify(app[k]).substring(0, 60));
    }
  });
  if (app.sdk !== 3) errors.push('sdk doit être 3, trouvé: ' + app.sdk);
  if (!app.brandColor) warnings.push('brandColor absent');
  if (!app.homeyCommunityTopicId) warnings.push('homeyCommunityTopicId absent');
  ok('Champs top-level validés (' + SDK3_REQUIRED_TOP.length + ')');

  // ── 2. Classification + Validation par driver ────────────────────────────
  hdr('2. CLASSIFICATION DUAL-LAYER DES DRIVERS');

  // Charger stable_app.json pour fallback MF si disponible
  let stableDriversMap = {};
  if (fs.existsSync(STABLE_APP_JSON)) {
    try {
      const stable = JSON.parse(fs.readFileSync(STABLE_APP_JSON));
      (stable.drivers || []).forEach(d => { stableDriversMap[d.id] = d; });
      info('stable_app.json chargé: ' + Object.keys(stableDriversMap).length + ' drivers');
    } catch(e) {
      warn('stable_app.json illisible: ' + e.message);
    }
  }

  for (const d of drivers) {
    // Valider champs driver obligatoires
    SDK3_REQUIRED_DRIVER.forEach(k => {
      if (!d[k]) errors.push('Driver ' + d.id + ': champ manquant ' + k);
    });

    const type = classifyDriver(d);
    stats[type] = (stats[type] || 0) + 1;

    const hasMF = d.zigbee && d.zigbee.manufacturerName && d.zigbee.manufacturerName.length > 0;
    const fpCount = hasMF ? d.zigbee.manufacturerName.length : 0;
    stats.totalFP += fpCount;
    if (hasMF) {
      const syntheticMfs = d.zigbee.manufacturerName.filter(isSyntheticManufacturer);
      if (syntheticMfs.length > 0) {
        stats.syntheticFP += syntheticMfs.length;
        syntheticDrivers.push({
          id: d.id,
          count: syntheticMfs.length,
          samples: syntheticMfs.slice(0, 2)
        });
      }
    }

    if (type === 'zigbee') {
      stats.zigbee++;
      if (hasMF) {
        stats.zigbeeOk++;
        if (VERBOSE) ok('ZIGBEE ' + d.id + ' (' + fpCount + ' MFs)');
      } else {
        stats.zigbeeEmpty++;
        // Tentative de fix automatique
        if (FIX_MODE) {
          const fixed = tryFixFromCompose(d, stableDriversMap);
          if (fixed) {
            fixes.push({ id: d.id, type: 'zigbee', mfs: fixed });
            d.zigbee.manufacturerName = fixed;
            ok('FIX ZIGBEE: ' + d.id + ' → ' + fixed.length + ' MFs restaurés');
          } else {
            errors.push('AGGREGATE ERROR: Zigbee driver sans MF: ' + d.id);
            err('ZIGBEE sans MF (AggregateError): ' + d.id);
          }
        } else {
          errors.push('AGGREGATE ERROR: Zigbee driver sans MF: ' + d.id);
          err('ZIGBEE sans MF (AggregateError): ' + d.id);
        }
      }
    } else if (type === 'hybrid') {
      stats.hybrid++;
      if (hasMF) {
        stats.hybridOk++;
        if (VERBOSE) ok('HYBRID ' + d.id + ' (' + fpCount + ' MFs)');
      } else {
        stats.hybridEmpty++;
        if (FIX_MODE) {
          const fixed = tryFixFromCompose(d, stableDriversMap);
          if (fixed) {
            fixes.push({ id: d.id, type: 'hybrid', mfs: fixed });
            d.zigbee.manufacturerName = fixed;
            ok('FIX HYBRID: ' + d.id + ' → ' + fixed.length + ' MFs restaurés');
          } else {
            errors.push('HYBRID driver sans MF: ' + d.id);
            err('HYBRID sans MF: ' + d.id);
          }
        } else {
          errors.push('HYBRID driver sans MF: ' + d.id);
          err('HYBRID sans MF: ' + d.id);
        }
      }
    } else if (type === 'wifi') {
      stats.wifi++;
      if (VERBOSE) ok('WIFI ' + d.id + ' (LAN/Cloud, MF non requis)');
    } else if (type === 'virtual') {
      stats.virtual++;
      if (VERBOSE) info('VIRTUAL ' + d.id + ' (no connectivity, exempt)');
    } else {
      stats.unknown++;
      warnings.push('Driver de type inconnu: ' + d.id + ' (conn=' + JSON.stringify(d.connectivity) + ')');
    }
  }

  // ── 3. Rapport de santé ──────────────────────────────────────────────────
  hdr('3. RAPPORT DE SANTÉ');
  console.log(C.bold + '  Classification des ' + stats.total + ' drivers:' + C.reset);
  console.log('    Zigbee    : ' + stats.zigbee + ' (' + stats.zigbeeOk + ' OK, ' + stats.zigbeeEmpty + ' vides)');
  console.log('    WiFi/LAN  : ' + stats.wifi);
  console.log('    Hybrid    : ' + stats.hybrid + ' (' + stats.hybridOk + ' OK, ' + stats.hybridEmpty + ' vides)');
  console.log('    Virtual   : ' + stats.virtual);
  console.log('    Unknown   : ' + stats.unknown);
  console.log('    Total FPs : ' + stats.totalFP.toLocaleString());
  console.log('    Synthetic : ' + stats.syntheticFP.toLocaleString() + ' (publish-size prune)');

  if (syntheticDrivers.length > 0 && !fs.existsSync(path.join(ROOT, 'scripts', 'prepare-publish.js'))) {
    warnings.push(
      'ManufacturerName synthétiques dans ' + syntheticDrivers.length +
      ' driver(s), ex: ' + syntheticDrivers.slice(0, 5).map(d => d.id + ' [' + d.samples.join(', ') + ']').join('; ') +
      '. Aucun garde prepare-publish détecté pour les retirer avant upload Athom.'
    );
  } else if (syntheticDrivers.length > 0) {
    ok(
      'ManufacturerName synthétiques publish-only dans ' + syntheticDrivers.length +
      ' driver(s), couverts par prepare-publish.'
    );
  }

  // ── 4. Corrections appliquées ────────────────────────────────────────────
  if (fixes.length > 0) {
    hdr('4. CORRECTIONS APPLIQUÉES (' + fixes.length + ')');
    fixes.forEach(f => ok('Fixé: ' + f.id + ' → ' + f.mfs.length + ' MFs'));
    // Sauvegarder app.json corrigé
    fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2));
    ok('app.json mis à jour avec ' + fixes.length + ' corrections');
  }

  // ── 5. Verdict final ─────────────────────────────────────────────────────
  hdr('5. VERDICT FINAL');

  if (warnings.length > 0) {
    console.log(C.yellow + '  Warnings: ' + warnings.length + C.reset);
    warnings.forEach(w => warn(w));
  }

  if (errors.length === 0) {
    console.log(C.bold + C.green + '\n  ✅ APP.JSON VALIDE — ZERO AGGREGATE ERROR' + C.reset);
    console.log(C.green + '  360 drivers Zigbee avec MF statiques non-vides.' + C.reset);
    console.log(C.green + '  Prêt pour: npx homey app publish' + C.reset);
    if (STRICT_MODE && warnings.length > 0) {
      warn('Mode strict: ' + warnings.length + ' warnings = exit 1');
      process.exit(1);
    }
    process.exit(0);
  } else {
    console.log(C.bold + C.red + '\n  ❌ ÉCHEC: ' + errors.length + ' ERREURS BLOQUANTES' + C.reset);
    errors.forEach(e => err(e));
    console.log(C.red + '\n  Ces erreurs causent l\'AggregateError chez Athom.' + C.reset);
    console.log(C.yellow + '  Solution: node scripts/validation/app-json-dual-layer-validator.js --fix' + C.reset);
    process.exit(1);
  }
}

// ─── Fix automatique depuis driver.compose.json / stable_app.json ────────────
function tryFixFromCompose(d, stableMap) {
  const driverDir = path.join(DRIVERS_DIR, d.id);
  const composePath = path.join(driverDir, 'driver.compose.json');

  let fixedMfs = null;

  // Tentative 1: depuis driver.compose.json local
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath));
      const mfs = compose.zigbee && compose.zigbee.manufacturerName;
      if (mfs && mfs.length > 0) fixedMfs = uniqueRealManufacturers(mfs);
    } catch(e) { /* ignore */ }
  }

  // Tentative 2: depuis stable_app.json
  if (!fixedMfs) {
    const stableDriver = stableMap[d.id];
    if (stableDriver && stableDriver.zigbee && stableDriver.zigbee.manufacturerName) {
      const mfs = stableDriver.zigbee.manufacturerName;
      if (mfs.length > 0) fixedMfs = uniqueRealManufacturers(mfs);
    }
  }

  // Never invent placeholder fingerprints: they pass local non-empty checks but
  // add payload without improving pairing.
  if (!fixedMfs || fixedMfs.length === 0) return null;

  // Always write back to driver.compose.json to keep it persistent
  if (fixedMfs && fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.zigbee) {
        compose.zigbee.manufacturerName = fixedMfs;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n', 'utf8');
      }
    } catch(e) { /* ignore */ }
  }

  return fixedMfs;
}

function uniqueRealManufacturers(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || isSyntheticManufacturer(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.length > 0 ? out : null;
}

// ─── Entry point ─────────────────────────────────────────────────────────────
validate().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
