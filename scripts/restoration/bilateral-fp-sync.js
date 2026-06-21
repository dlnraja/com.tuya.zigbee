#!/usr/bin/env node
'use strict';
// bilateral-fp-sync.js — Enrichissement autonome bidirectionnel master ↔ stable-v5
// Détecte les nouveaux fingerprints dans chaque branche et propose/injecte
// leur équivalent dans l'autre branche (si mapping applicable).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');
const DIRECTION = process.argv.find((a) => a.startsWith('--direction='))?.split('=')[1] || 'both';

function collectFingerprints() {
  const fps = new Map(); // fp → [driverIds]
  for (const drv of fs.readdirSync(DRIVERS)) {
    const p = path.join(DRIVERS, drv, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const m of (c?.zigbee?.manufacturerName || [])) {
        // v9.0.50: Accept ALL manufacturer names, not just _T-prefixed
        // This preserves brand names like HOBEIAN, BSEED, OWON, eWeLink, etc.
        if (typeof m === 'string' && m.length > 0) {
          if (!fps.has(m)) fps.set(m, []);
          fps.get(m).push(drv);
        }
      }
    } catch (e) {}
  }
  return fps;
}

function collectFromBranch(branch) {
  const result = new Map();
  try {
    // Liste tous les driver.compose.json de la branche
    const files = execSync(`git ls-tree -r --name-only ${branch} -- drivers/ 2>&1`, {
      encoding: 'utf8', maxBuffer: 50 * 1024 * 1024,
    }).split('\n').filter((f) => f.endsWith('driver.compose.json'));
    for (const f of files) {
      try {
        const content = execSync(`git show "${branch}:${f}" 2>&1`, {
          encoding: 'utf8', maxBuffer: 5 * 1024 * 1024,
        });
        const c = JSON.parse(content);
        const drvId = path.basename(path.dirname(f));
        for (const m of (c?.zigbee?.manufacturerName || [])) {
          // v9.0.50: Accept ALL manufacturer names, not just _T-prefixed
          if (typeof m === 'string' && m.length > 0) {
            if (!result.has(m)) result.set(m, []);
            result.get(m).push(drvId);
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(`Erreur collecte branche ${branch}: ${e.message}`);
  }
  return result;
}

console.log('═══════════════════════════════════════════════');
console.log('  🔀 BILATERAL FINGERPRINT SYNC');
console.log('═══════════════════════════════════════════════\n');

// 1. Collecte master
console.log('📊 Collecte fingerprints master...');
const masterFps = collectFingerprints();
console.log(`   ${masterFps.size} fingerprints dans master (working tree)`);

// 2. Collecte stable-v5
console.log('📊 Collecte fingerprints stable-v5...');
const sv5Fps = collectFromBranch('stable-v5');
console.log(`   ${sv5Fps.size} fingerprints dans stable-v5`);

// 3. Diff
let forwardCount = 0; // sv5 → master
let backportCount = 0; // master → sv5
const forwardCandidates = [];
const backportCandidates = [];

for (const [fp, drivers] of sv5Fps) {
  if (!masterFps.has(fp)) {
    forwardCount++;
    forwardCandidates.push({ fp, sv5Drivers: drivers });
  }
}
for (const [fp, drivers] of masterFps) {
  if (!sv5Fps.has(fp)) {
    backportCount++;
    backportCandidates.push({ fp, masterDrivers: drivers });
  }
}

console.log('\n📊 DIFF:');
console.log(`   stable-v5 → master (forward-port): ${forwardCount} fingerprints`);
console.log(`   master → stable-v5 (backport):     ${backportCount} fingerprints`);

// 4. Afficher échantillons
if (forwardCount > 0) {
  console.log('\n🔍 Forward-port candidates (sv5 → master) — top 15:');
  forwardCandidates.slice(0, 15).forEach(({ fp, sv5Drivers }) => {
    console.log(`   ${fp}  (sv5: ${sv5Drivers[0]})`);
  });
}
if (backportCount > 0) {
  console.log('\n🔍 Backport candidates (master → sv5) — top 15:');
  backportCandidates.slice(0, 15).forEach(({ fp, masterDrivers }) => {
    console.log(`   ${fp}  (master: ${masterDrivers[0]})`);
  });
}

console.log('\n═══════════════════════════════════════════════');
console.log(`  Mode: ${APPLY ? 'APPLY' : 'DRY-RUN (--apply pour exécuter)'}`);
console.log(`  Direction: ${DIRECTION}`);
console.log('═══════════════════════════════════════════════\n');

// Note : l'application réelle nécessite un mapping driver sv5→master
// qui est dans lib/compat/StableV5Compat.js (DRIVER_MAPPING)
if (!APPLY) {
  console.log('💡 Pour appliquer, utilisez --apply avec --direction=master-to-stable');
  console.log('   Le backport réel nécessite vérification manuelle (cf BRANCH_SYNC_POLICY.md)');
}
