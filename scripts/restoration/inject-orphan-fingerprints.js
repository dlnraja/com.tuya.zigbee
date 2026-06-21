#!/usr/bin/env node
'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  inject-orphan-fingerprints.js                                           ║
 * ║  Restoration des fingerprints disparus (issue: 146 orphelins)            ║
 * ║                                                                          ║
 * ║  Lit orphan_injection_plan.json (généré par l'analyse git) et injecte   ║
 * ║  les fingerprints manquants dans les driver.compose.json des drivers     ║
 * ║  actuels, en évitant les doublons et en préservant le format JSON.       ║
 * ║                                                                          ║
 * ║  Sécurité :                                                              ║
 * ║   - Backup automatique (.backup-restore-<timestamp>)                     ║
 * ║   - Vérification de doublons (case-insensitive)                          ║
 * ║   - Validation JSON après chaque modification                            ║
 * ║   - Mode dry-run par défaut (--apply pour écrire)                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PLAN_FILE = path.join(ROOT, 'orphan_injection_plan.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');

function log(...a) { console.log(...a); }
function warn(...a) { console.warn('⚠️ ', ...a); }
function ok(...a) { console.log('✅', ...a); }

function main() {
  if (!fs.existsSync(PLAN_FILE)) {
    console.error('❌ orphan_injection_plan.json introuvable. Générez-le d\'abord.');
    process.exit(1);
  }

  const { plan, unmapped } = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  log(`📋 Plan chargé : ${Object.keys(plan).length} drivers, ${unmapped.length} unmappable`);

  let totalInjected = 0;
  let totalSkippedDup = 0;
  let driversModified = 0;
  const report = [];

  for (const [driverId, fingerprints] of Object.entries(plan)) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      warn(`Driver introuvable: ${driverId}`);
      continue;
    }

    let content;
    try {
      content = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (e) {
      warn(`JSON invalide dans ${driverId}: ${e.message}`);
      continue;
    }

    // Récupère le tableau manufacturerName (cible d'injection)
    const mfrArr = content?.zigbee?.manufacturerName;
    if (!Array.isArray(mfrArr)) {
      warn(`${driverId}: pas de tableau zigbee.manufacturerName — skip`);
      continue;
    }

    // Index existant (case-insensitive) pour détection de doublons
    const existingLower = new Set(mfrArr.map((m) => String(m).toLowerCase()));

    let injected = 0;
    let skipped = 0;
    const added = [];

    for (const fp of fingerprints) {
      if (existingLower.has(String(fp).toLowerCase())) {
        skipped++;
        totalSkippedDup++;
        continue;
      }
      // Injection : on ajoute à la fin du tableau manufacturerName
      mfrArr.push(fp);
      existingLower.add(String(fp).toLowerCase());
      added.push(fp);
      injected++;
      totalInjected++;
    }

    if (injected > 0) {
      if (APPLY) {
        // Backup
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const bak = `${composePath}.backup-restore-${ts}`;
        fs.copyFileSync(composePath, bak);

        // Écriture (4 espaces pour matcher le format existant)
        fs.writeFileSync(composePath, JSON.stringify(content, null, 2) + '\n', 'utf8');

        // Validation post-écriture
        try {
          JSON.parse(fs.readFileSync(composePath, 'utf8'));
        } catch (e) {
          // Restore en cas de corruption
          fs.copyFileSync(bak, composePath);
          warn(`${driverId}: corruption détectée, restauration du backup`);
          continue;
        }
      }
      driversModified++;
      ok(`${driverId}: +${injected} fingerprints (${skipped} doublons skip)`);
      if (VERBOSE) {
        for (const fp of added) console.log(`     + ${fp}`);
      }
      report.push({ driverId, injected, skipped, added });
    } else if (VERBOSE) {
      log(`⏭️  ${driverId}: 0 nouveau (${skipped} déjà présents)`);
    }
  }

  log('\n═══════════════════════════════════════════════');
  log(`📊 RAPPORT D'INJECTION`);
  log(`   Drivers modifiés : ${driversModified}`);
  log(`   Fingerprints injectés : ${totalInjected}`);
  log(`   Doublons évités : ${totalSkippedDup}`);
  log(`   Unmappables : ${unmapped.length}`);
  log(`   Mode : ${APPLY ? 'APPLY (écrit)' : 'DRY-RUN (lecture seule)'}`);
  if (!APPLY) {
    log('\n💡 Relancez avec --apply pour effectuer les modifications.');
  }
  log('═══════════════════════════════════════════════\n');

  // Sauvegarde du rapport
  const reportPath = path.join(ROOT, 'orphan_injection_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    applied: APPLY,
    driversModified,
    totalInjected,
    totalSkippedDup,
    unmapped,
    details: report,
  }, null, 2));
  log(`📄 Rapport : ${reportPath}`);
}

main();
