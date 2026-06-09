'use strict';
/**
 * fix-fingerprint-collisions.js
 * 
 * RÈGLE (.windsurfrules): "Same manufacturerName + Same productId → MUST be same driver"
 * 
 * Les drivers "virtuels/hybrides" (air_purifier_climate, air_purifier_sensor, etc.)
 * ne sont PAS des drivers Zigbee indépendants avec leurs propres fingerprints.
 * Ils sont des variantes fonctionnelles qui partagent le pairing du driver principal
 * via un mécanisme différent (pairing flow, store, heuristique).
 * 
 * STRATÉGIE:
 * 1. Construire un index de TOUS les fingerprints (mf+pid) → [driverId...]
 * 2. Identifier les conflits (même combo → plusieurs drivers)
 * 3. Pour chaque conflit, garder le fingerprint uniquement dans le driver "principal"
 *    (le plus ancien, le plus simple, sans suffixe "_xxx")
 * 4. Retirer le fingerprint des drivers "dérivés" qui l'avaient en conflit
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('=== FIX FINGERPRINT COLLISIONS ===\n');

// --- Charger tous les driver.compose.json ---
console.log('[1/4] Chargement de tous les driver.compose.json...');
const driverDirs = fs.readdirSync(DRIVERS_DIR);
const driverCompose = {};
driverDirs.forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    driverCompose[dir] = JSON.parse(fs.readFileSync(cp, 'utf8'));
  } catch (e) { /* skip */ }
});
console.log(`  ✓ ${Object.keys(driverCompose).length} drivers chargés`);

// --- Construire l'index des fingerprints (case-insensitive) ---
console.log('\n[2/4] Construction de l\'index des fingerprints...');
const fpIndex = {}; // key: "MF|PID" (uppercase) → [driverId...]

Object.entries(driverCompose).forEach(([driverId, compose]) => {
  if (!compose.zigbee) return;
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  
  mfs.forEach(mf => {
    pids.forEach(pid => {
      const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
      if (!fpIndex[key]) fpIndex[key] = [];
      if (!fpIndex[key].includes(driverId)) fpIndex[key].push(driverId);
    });
  });
});

// Identifier les conflits
const conflicts = Object.entries(fpIndex).filter(([key, drivers]) => drivers.length > 1);
console.log(`  Total fingerprints indexés: ${Object.keys(fpIndex).length}`);
console.log(`  Conflits détectés: ${conflicts.length}`);

// --- Résoudre les conflits ---
console.log('\n[3/4] Résolution des conflits...');

// Fonction pour déterminer le driver "principal" (winner)
// Règle: driver sans suffixe composé (_xxx, _yyy) est le principal
function getPrimaryDriver(drivers) {
  // Trier: préférer les drivers courts/simples
  const sorted = [...drivers].sort((a, b) => {
    // Compter les underscores dans le nom (moins = plus simple = prioritaire)
    const aScore = a.split('_').length;
    const bScore = b.split('_').length;
    if (aScore !== bScore) return aScore - bScore;
    // À égalité de complexité: alphabétique
    return a.localeCompare(b);
  });
  return sorted[0];
}

// Construire le mapping driver → fingerprints à RETIRER
const toRemove = {}; // driverId → Set of "MF|PID" to remove

let resolvedCount = 0;
conflicts.forEach(([key, drivers]) => {
  const primary = getPrimaryDriver(drivers);
  const losers = drivers.filter(d => d !== primary);
  
  losers.forEach(loser => {
    if (!toRemove[loser]) toRemove[loser] = new Set();
    toRemove[loser].add(key);
  });
  resolvedCount++;
});

console.log(`  Conflits résolus: ${resolvedCount}`);
console.log(`  Drivers à nettoyer: ${Object.keys(toRemove).length}`);

// Afficher quelques exemples de conflits majeurs
if (conflicts.length > 0) {
  console.log('\n  Exemples de conflits résolus:');
  conflicts.slice(0, 5).forEach(([key, drivers]) => {
    const primary = getPrimaryDriver(drivers);
    const losers = drivers.filter(d => d !== primary);
    console.log(`    ${key}: keep=${primary}, remove from: ${losers.join(', ')}`);
  });
}

// --- Appliquer les corrections aux driver.compose.json ---
console.log('\n[4/4] Application des corrections...');

let filesUpdated = 0;
const cleanupReport = {};

Object.entries(toRemove).forEach(([driverId, badKeys]) => {
  const compose = driverCompose[driverId];
  if (!compose || !compose.zigbee) return;
  
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  
  // Filtrer les MFs qui créent des conflits
  // Un MF est à retirer si TOUTES ses combinaisons avec les PIDs sont en conflit
  const badMFs = new Set();
  mfs.forEach(mf => {
    const allConflict = pids.every(pid => {
      const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
      return badKeys.has(key);
    });
    if (allConflict && pids.length > 0) {
      badMFs.add(mf);
    }
  });
  
  if (badMFs.size === 0) return;
  
  const newMFs = mfs.filter(mf => !badMFs.has(mf));
  const changed = newMFs.length !== mfs.length;
  
  if (!changed) return;
  
  compose.zigbee.manufacturerName = newMFs;
  // Si plus aucun MF, garder les PIDs mais signaler
  if (newMFs.length === 0) {
    // Ce driver n'a plus de fingerprints uniques
    // Laisser manufacturerName vide pour signaler que c'est un driver virtuel
    cleanupReport[driverId] = { status: 'VIRTUAL_NO_UNIQUE_FP', removed: [...badMFs] };
  } else {
    cleanupReport[driverId] = { status: 'CLEANED', removed: [...badMFs], remaining: newMFs.length };
  }
  
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  filesUpdated++;
});

console.log(`  ✓ Fichiers mis à jour: ${filesUpdated}`);

// Vérification des drivers maintenant vides après déduplication
const nowEmpty = Object.entries(cleanupReport).filter(([, v]) => v.status === 'VIRTUAL_NO_UNIQUE_FP');
const nowCleaned = Object.entries(cleanupReport).filter(([, v]) => v.status === 'CLEANED');
console.log(`  Drivers devenus virtuels (plus de FP uniques): ${nowEmpty.length}`);
console.log(`  Drivers nettoyés (FP partiels): ${nowCleaned.length}`);

if (nowEmpty.length > 0) {
  console.log('\n  Drivers virtuels (pas de fingerprints uniques):');
  nowEmpty.slice(0, 15).forEach(([id]) => console.log(`    - ${id}`));
  if (nowEmpty.length > 15) console.log(`    ... et ${nowEmpty.length - 15} autres`);
}

// Sauvegarder le rapport
fs.writeFileSync(
  path.join(ROOT, 'tmp', 'collision-fix-report.json'),
  JSON.stringify({ conflicts: conflicts.length, resolved: resolvedCount, filesUpdated, cleanupReport }, null, 2)
);

// --- Synchroniser app.json ---
console.log('\nSynchronisation vers app.json...');
const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
let appUpdated = 0;

if (app.drivers) {
  app.drivers.forEach(driver => {
    const compose = driverCompose[driver.id];
    if (!compose || !compose.zigbee) return;
    
    const newMFs = compose.zigbee.manufacturerName || [];
    const oldMFs = (driver.zigbee && driver.zigbee.manufacturerName) || [];
    
    // Mettre à jour si les MF ont changé
    if (JSON.stringify(newMFs.sort()) !== JSON.stringify(oldMFs.sort())) {
      if (!driver.zigbee) driver.zigbee = {};
      driver.zigbee.manufacturerName = newMFs;
      driver.zigbee.productId = compose.zigbee.productId || [];
      appUpdated++;
    }
  });
}

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2));
console.log(`  ✓ app.json mis à jour: ${appUpdated} drivers`);

// --- Vérification finale ---
console.log('\n=== VÉRIFICATION FINALE ===');
// Reconstruire l'index pour compter les conflits restants
const newIndex = {};
Object.entries(driverCompose).forEach(([driverId, compose]) => {
  if (!compose || !compose.zigbee) return;
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  mfs.forEach(mf => {
    pids.forEach(pid => {
      const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
      if (!newIndex[key]) newIndex[key] = [];
      if (!newIndex[key].includes(driverId)) newIndex[key].push(driverId);
    });
  });
});
// Recharger les compose mis à jour
Object.keys(toRemove).forEach(driverId => {
  const cp = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  try { driverCompose[driverId] = JSON.parse(fs.readFileSync(cp, 'utf8')); } catch (e) { /* skip */ }
});
const newConflicts = Object.entries(newIndex).filter(([, d]) => d.length > 1);
const emptyZigbee = Object.values(driverCompose).filter(c => c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0)).length;

console.log(`✓ Conflits restants: ${newConflicts.length} (était: ${conflicts.length})`);
console.log(`✓ Drivers avec MF vide: ${emptyZigbee}`);
console.log(`✓ Rapport: tmp/collision-fix-report.json`);
