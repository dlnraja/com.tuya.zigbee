#!/usr/bin/env node
/**
 * merge-pr327-fingerprints.js
 * 
 * Applique les fingerprints du patch PR #327 par-dessus le working tree actuel.
 * Évite les conflits JSON en lisant/écrivant du JSON valide.
 * 
 * Usage: node scripts/tools/merge-pr327-fingerprints.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PATCH_FILE = path.join(ROOT, 'pr327.patch');

// Lire le patch
const patch = fs.readFileSync(PATCH_FILE, 'utf8');
const lines = patch.split('\n');

// Extraire les fichiers modifiés et leurs ajouts
const fileAdditions = {};
let currentFile = null;
let inHunk = false;
let additions = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Détecter un nouveau fichier
  const fileMatch = line.match(/^diff --git a\/(.+?) b\//);
  if (fileMatch) {
    if (currentFile && additions.length > 0) {
      fileAdditions[currentFile] = additions;
    }
    currentFile = fileMatch[1];
    additions = [];
    inHunk = false;
    continue;
  }

  // Détecter le début d'un hunk
  const hunkMatch = line.match(/^@@ /);
  if (hunkMatch) {
    inHunk = true;
    continue;
  }

  // Collecter les lignes "+" (ajouts) dans les hunks
  if (inHunk && currentFile) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions.push(line.substring(1)); // enlever le '+'
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // Ignorer les suppressions - on garde ce qu'on a
    } else if (!line.startsWith('+') && !line.startsWith('-')) {
      // Ligne de contexte - ignorée
    }
  }
}

// Dernier fichier
if (currentFile && additions.length > 0) {
  fileAdditions[currentFile] = additions;
}

console.log(`📦 Patch PR #327 analysé: ${Object.keys(fileAdditions).length} fichiers avec ajouts`);

// === STRATÉGIE PAR TYPE DE FICHIER ===

// 1. State files (.github/state/) - remplacer complètement
// 2. app.json - extraire les nouveaux FPs et les ajouter aux manufacturerName existants
// 3. driver.compose.json - extraire les nouveaux FPs et les ajouter

function mergeStateFile(filepath, additions) {
  const absPath = path.join(ROOT, filepath);
  const content = additions.join('\n');
  fs.writeFileSync(absPath, content + '\n');
  console.log(`  ✅ State file mis à jour: ${filepath}`);
}

function mergeDriverComposeJson(filepath, additions) {
  const absPath = path.join(ROOT, filepath);
  
  if (!fs.existsSync(absPath)) {
    console.log(`  ⚠️  Fichier introuvable: ${filepath}`);
    return;
  }

  try {
    const json = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const zigbee = json.zigbee || {};
    
    // Extraire les manufacturerName du patch
    const newMfrs = [];
    const newPids = [];
    let inManufacturerName = false;
    let inProductId = false;
    
    for (const line of additions) {
      const trimmed = line.trim();
      if (trimmed === '"manufacturerName": [') {
        inManufacturerName = true;
        inProductId = false;
        continue;
      }
      if (trimmed === '"productId": [') {
        inProductId = true;
        inManufacturerName = false;
        continue;
      }
      if ((inManufacturerName || inProductId) && trimmed === '],') {
        if (inManufacturerName) inManufacturerName = false;
        if (inProductId) inProductId = false;
        continue;
      }
      if ((inManufacturerName || inProductId) && trimmed.match(/^"[^"]+",?$/)) {
        const val = trimmed.replace(/",?$/, '').replace(/^"/, '');
        if (inManufacturerName) newMfrs.push(val);
        if (inProductId) newPids.push(val);
      }
      
      // Détecter "productId" ou "manufacturerName" uniquement comme valeurs
      if (inManufacturerName && trimmed.startsWith('"') && !trimmed.includes('[') && !trimmed.includes(']')) {
        // déjà capturé
      }
    }

    // Ajouter les nouveaux manufacturerName manquants
    let changed = false;
    if (newMfrs.length > 0 && zigbee.manufacturerName) {
      for (const mfr of newMfrs) {
        if (!zigbee.manufacturerName.includes(mfr)) {
          zigbee.manufacturerName.push(mfr);
          changed = true;
        }
      }
    } else if (newMfrs.length > 0 && !zigbee.manufacturerName) {
      zigbee.manufacturerName = [...newMfrs];
      changed = true;
    }

    // Ajouter les nouveaux productId manquants
    if (newPids.length > 0 && zigbee.productId) {
      for (const pid of newPids) {
        if (!zigbee.productId.includes(pid)) {
          zigbee.productId.push(pid);
          changed = true;
        }
      }
    } else if (newPids.length > 0 && !zigbee.productId) {
      zigbee.productId = [...newPids];
      changed = true;
    }

    if (changed) {
      json.zigbee = zigbee;
      fs.writeFileSync(absPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log(`  ✅ Nouveaux FPs ajoutés à ${filepath}: +${newMfrs.length} manufacturerName, +${newPids.length} productId`);
    } else {
      console.log(`  ⏭️  Aucun nouveau FP à ajouter à ${filepath}`);
    }
  } catch (err) {
    console.error(`  ❌ Erreur ${filepath}: ${err.message}`);
  }
}

function mergeAppJson(filepath, additions) {
  const absPath = path.join(ROOT, filepath);
  
  if (!fs.existsSync(absPath)) {
    console.log(`  ⚠️  Fichier introuvable: ${filepath}`);
    return;
  }

  try {
    const json = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const drivers = json.drivers || [];
    
    // Le patch app.json du PR #327 ajoute des manufacturerName casings dans drivers[]
    // On doit identifier chaque driver par son id et ajouter les casings manquantes
    
    const driverChanges = [];
    let currentDriverId = null;
    let currentMfrs = [];
    let currentPids = [];
    let inManufacturerName = false;
    let inProductId = false;
    let readingFingerprints = false;

    // Chercher les blocs de fingerprint dans le patch
    for (let idx = 0; idx < additions.length; idx++) {
      const line = additions[idx].trim();
      
      // Détection id du driver
      const idMatch = line.match(/"id": "([^"]+)"/);
      if (idMatch) {
        // Sauvegarder le précédent
        if (currentDriverId && currentMfrs.length > 0) {
          driverChanges.push({ id: currentDriverId, mfrs: [...currentMfrs], pids: [...currentPids] });
        }
        currentDriverId = idMatch[1];
        currentMfrs = [];
        currentPids = [];
        inManufacturerName = false;
        inProductId = false;
        readingFingerprints = false;
        continue;
      }
      
      if (line === '"manufacturerName": [') {
        inManufacturerName = true;
        inProductId = false;
        readingFingerprints = true;
        continue;
      }
      if (line === '"productId": [') {
        inProductId = true;
        inManufacturerName = false;
        readingFingerprints = true;
        continue;
      }
      
      if ((inManufacturerName || inProductId) && line === '],') {
        inManufacturerName = false;
        inProductId = false;
        continue;
      }
      
      if (inManufacturerName || inProductId) {
        const valMatch = line.match(/^"([^"]+)"(,)?$/);
        if (valMatch) {
          const val = valMatch[1];
          if (inManufacturerName && !val.startsWith('_')) {
            // Skip values that don't look like manufacturerNames (e.g. "sensor", "remote")
            continue;
          }
          if (inManufacturerName) currentMfrs.push(val);
          if (inProductId) currentPids.push(val);
        }
      }
    }

    // Dernier driver
    if (currentDriverId && currentMfrs.length > 0) {
      driverChanges.push({ id: currentDriverId, mfrs: [...currentMfrs], pids: [...currentPids] });
    }

    // Appliquer les changements à app.json
    let totalAdded = 0;
    for (const change of driverChanges) {
      const driver = drivers.find(d => d.id === change.id);
      if (!driver) {
        console.log(`  ⚠️  Driver "${change.id}" non trouvé dans app.json`);
        continue;
      }

      const zigbee = driver.zigbee || {};
      
      let added = 0;
      if (change.mfrs.length > 0 && zigbee.manufacturerName) {
        for (const mfr of change.mfrs) {
          if (!zigbee.manufacturerName.includes(mfr)) {
            zigbee.manufacturerName.push(mfr);
            added++;
          }
        }
      }
      
      if (change.pids.length > 0 && zigbee.productId) {
        for (const pid of change.pids) {
          if (!zigbee.productId.includes(pid)) {
            zigbee.productId.push(pid);
            added++;
          }
        }
      }

      if (added > 0) {
        driver.zigbee = zigbee;
        totalAdded += added;
        console.log(`  ✅ ${change.id}: +${added} FPs (${change.mfrs.length} mfrs, ${change.pids.length} pids)`);
      }
    }

    if (totalAdded > 0) {
      fs.writeFileSync(absPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log(`  ✅ Total: ${totalAdded} nouveaux FPs ajoutés à app.json`);
    } else {
      console.log(`  ⏭️  Aucun nouveau FP à ajouter à app.json`);
    }
  } catch (err) {
    console.error(`  ❌ Erreur ${filepath}: ${err.message}`);
  }
}

// === EXÉCUTION ===
console.log('\n🚀 MERGE PR #327 - Application des fingerprints\n');

for (const [filepath, additions] of Object.entries(fileAdditions)) {
  console.log(`\n📄 ${filepath} (${additions.length} lignes d'ajouts)`);
  
  // Ne pas traiter les state files (remplacés par le script original)
  // ni les fichiers .homeycompose que nous ne gérons pas ici
  if (filepath.startsWith('.github/state/')) {
    // Ces fichiers seront gérés séparément
    continue;
  }

  if (filepath === 'app.json') {
    mergeAppJson(filepath, additions);
  } else if (filepath.endsWith('driver.compose.json')) {
    mergeDriverComposeJson(filepath, additions);
  } else {
    console.log(`  ⏭️  Ignoré (type non géré: ${filepath})`);
  }
}

console.log('\n✅ MERGE PR #327 terminé!');
console.log('⚠️  Reste à vérifier manuellement:');
console.log('  - .github/state/driver-conflict-audit.json (remplacer)');
console.log('  - .github/state/johan-sdk3-sync.json (remplacer)');
console.log('  - Vérifier que les FPs ne sont pas dupliqués dans les drivers conflictuels');
