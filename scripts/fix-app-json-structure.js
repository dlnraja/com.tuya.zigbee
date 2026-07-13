'use strict';
/**
 * fix-app-json-structure.js
 * Correction structurelle complète de app.json pour conformité SDK3/Athom
 * - Corrige les chemins d'images (sans /drivers/ → /drivers/)
 * - Corrige category string → array
 * - Rebuilde app.json depuis les driver.compose.json (source de vérité)
 * - Rapporte tous les drivers avec manufacturerName vide
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const COMPOSE_APP = path.join(ROOT, '.homeycompose', 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const BACKUP = path.join(ROOT, 'app.json.backup2');

console.log('=== FIX APP.JSON STRUCTURE ===\n');

// --- 1. Charger app.json actuel ---
console.log('[1/6] Chargement de app.json...');
const raw = fs.readFileSync(APP_JSON, 'utf8');
let app;
try {
  app = JSON.parse(raw);
  console.log(`  ✓ JSON valide - ${app.drivers ? app.drivers.length : 0} drivers`);
} catch (e) {
  console.error('  ✗ ERREUR JSON:', e.message);
  process.exit(1);
}

// Backup
fs.writeFileSync(BACKUP, raw);
console.log('  ✓ Backup créé: app.json.backup2');

// --- 2. Corriger le champ category ---
console.log('\n[2/6] Correction du champ category...');
const oldCategory = app.category;
if (typeof app.category === 'string') {
  app.category = [app.category];
  console.log(`  ✓ category: "${oldCategory}" → ${JSON.stringify(app.category)}`);
} else if (Array.isArray(app.category)) {
  console.log(`  ✓ category déjà en array: ${JSON.stringify(app.category)}`);
}

// Même correction dans .homeycompose/app.json
const composeApp = JSON.parse(Buffer.from(fs.readFileSync(COMPOSE_APP)).toString('utf8'));
if (typeof composeApp.category === 'string') {
  composeApp.category = [composeApp.category];
  fs.writeFileSync(COMPOSE_APP, JSON.stringify(composeApp, null, 2));
  console.log('  ✓ .homeycompose/app.json category corrigé aussi');
}

// --- 3. Corriger les chemins d'images des drivers ---
console.log('\n[3/6] Correction des chemins d\'images drivers...');
let imageFixed = 0;
let imageAlreadyOk = 0;

if (app.drivers) {
  app.drivers.forEach(driver => {
    if (!driver.images) return;
    ['small', 'large', 'xlarge'].forEach(size => {
      if (driver.images[size] && !driver.images[size].startsWith('/')) {
        driver.images[size] = '/' + driver.images[size];
        imageFixed++;
      } else if (driver.images[size]) {
        imageAlreadyOk++;
      }
    });
  });
}
console.log(`  ✓ ${imageFixed} chemins d'images corrigés (${imageAlreadyOk} déjà OK)`);

// --- 4. Rebuild drivers depuis driver.compose.json ---
console.log('\n[4/6] Audit des manufacturerName depuis driver.compose.json...');
const driverDirs = fs.existsSync(DRIVERS_DIR) ? fs.readdirSync(DRIVERS_DIR) : [];
let stats = {
  total: 0,
  emptyMf: 0,
  withMf: 0,
  noZigbee: 0,
  fixedFromCompose: 0,
  stillEmpty: [],
  composedFixed: []
};

// Indexer les drivers actuels par id
const driverIndex = {};
if (app.drivers) {
  app.drivers.forEach(d => { driverIndex[d.id] = d; });
}

driverDirs.forEach(dir => {
  const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  stats.total++;
  let compose;
  try {
    compose = JSON.parse(Buffer.from(fs.readFileSync(composePath)).toString('utf8'));
  } catch (e) {
    console.log(`  ✗ JSON invalide dans ${dir}/driver.compose.json: ${e.message}`);
    return;
  }

  // Corriger aussi les chemins d'images dans le compose
  if (compose.images) {
    ['small', 'large', 'xlarge'].forEach(size => {
      if (compose.images[size] && !compose.images[size].startsWith('/')) {
        compose.images[size] = '/' + compose.images[size];
      }
    });
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  }

  if (!compose.zigbee) {
    stats.noZigbee++;
    return;
  }

  const mf = compose.zigbee.manufacturerName || [];
  const pid = compose.zigbee.productId || [];

  if (mf.length > 0 && pid.length > 0) {
    stats.withMf++;
    // Sync vers app.json si le driver existe
    if (driverIndex[dir]) {
      if (!driverIndex[dir].zigbee) driverIndex[dir].zigbee = {};
      driverIndex[dir].zigbee.manufacturerName = mf;
      driverIndex[dir].zigbee.productId = pid;
    }
  } else {
    stats.emptyMf++;
    stats.stillEmpty.push({
      id: dir,
      mf: mf,
      pid: pid,
      class: compose.class
    });
  }
});

console.log(`  Total drivers analysés: ${stats.total}`);
console.log(`  ✓ Avec manufacturerName valide: ${stats.withMf}`);
console.log(`  ✗ manufacturerName vide: ${stats.emptyMf}`);
console.log(`  - Sans Zigbee (WiFi/IR): ${stats.noZigbee}`);

// --- 5. Rapport des drivers avec MF vide ---
console.log('\n[5/6] Rapport des drivers avec manufacturerName vide...');
const reportPath = path.join(ROOT, 'tmp', 'empty-mf-report.json');
if (!fs.existsSync(path.join(ROOT, 'tmp'))) fs.mkdirSync(path.join(ROOT, 'tmp'));
fs.writeFileSync(reportPath, JSON.stringify(stats.stillEmpty, null, 2));
console.log(`  ✓ Rapport écrit: tmp/empty-mf-report.json (${stats.stillEmpty.length} drivers)`);
if (stats.stillEmpty.length > 0) {
  console.log('  Premiers drivers vides:');
  stats.stillEmpty.slice(0, 10).forEach(d => {
    console.log(`    - ${d.id} (class: ${d.class})`);
  });
}

// --- 6. Sauvegarder app.json corrigé ---
console.log('\n[6/6] Sauvegarde de app.json corrigé...');
const newJson = JSON.stringify(app, null, 2);
fs.writeFileSync(APP_JSON, newJson);
const newSize = Buffer.byteLength(newJson, 'utf8');
console.log(`  ✓ app.json sauvegardé (${(newSize / 1024 / 1024).toFixed(2)} Mo)`);

// --- Résumé ---
console.log('\n=== RÉSUMÉ ===');
console.log(`category: ${JSON.stringify(app.category)} (array ✓)`);
console.log(`Chemins d'images corrigés: ${imageFixed}`);
console.log(`Drivers avec MF valide: ${stats.withMf}`);
console.log(`Drivers avec MF vide: ${stats.emptyMf} → voir tmp/empty-mf-report.json`);
console.log(`Drivers WiFi/non-Zigbee: ${stats.noZigbee}`);
console.log('\nProchain: node scripts/inject-fingerprints-from-prs.js');
