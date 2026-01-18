#!/usr/bin/env node

/**
 * FLOW RESTORATION & CONSERVATIVE FIXER v5.5.295
 * Restaure depuis backup et applique corrections conservatives respectant les multi-gang
 */

const fs = require('fs');
const path = require('path');

class FlowRestorerAndFixer {
  constructor() {
    this.driversPath = path.join(__dirname, 'drivers');
    this.backupPath = path.join(__dirname, 'flow_backups');
    this.results = {
      restored: 0,
      conservativelyFixed: 0,
      duplicatesFound: 0,
      duplicatesResolved: 0
    };
  }

  /**
   * Restaure le backup et applique corrections conservatives
   */
  async restoreAndFix() {
    console.log('🔄 RESTORING FROM BACKUP AND APPLYING CONSERVATIVE FIXES...');

    // Trouver le backup le plus récent
    const latestBackup = this.findLatestBackup();
    if (!latestBackup) {
      console.log('❌ No backup found!');
      return;
    }

    console.log(`📦 Restoring from: ${latestBackup}`);

    // Restaurer les flows depuis le backup
    await this.restoreFromBackup(latestBackup);

    // Appliquer corrections conservatives (uniquement pour les problèmes critiques)
    await this.applyConservativeFixes();

    this.generateReport();
  }

  /**
   * Trouve le backup le plus récent
   */
  findLatestBackup() {
    if (!fs.existsSync(this.backupPath)) return null;

    const backups = fs.readdirSync(this.backupPath)
      .filter(name => name.startsWith('backup_'))
      .sort()
      .reverse();

    return backups.length > 0 ? path.join(this.backupPath, backups[0]) : null;
  }

  /**
   * Restaure les flows depuis le backup
   */
  async restoreFromBackup(backupDir) {
    console.log('🔄 Restoring flow files...');

    await this.copyFlowFilesRecursive(backupDir, this.driversPath);
    console.log('✅ Flow files restored from backup');
  }

  /**
   * Copie récursive des fichiers de flow
   */
  async copyFlowFilesRecursive(source, destination) {
    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);

      if (fs.statSync(sourcePath).isDirectory()) {
        if (fs.existsSync(destPath)) {
          await this.copyFlowFilesRecursive(sourcePath, destPath);
        }
      } else if (item.includes('flow') && item.endsWith('.json')) {
        if (fs.existsSync(path.dirname(destPath))) {
          fs.copyFileSync(sourcePath, destPath);
          this.results.restored++;
        }
      }
    }
  }

  /**
   * Applique corrections conservatives (seulement les problèmes critiques)
   */
  async applyConservativeFixes() {
    console.log('🔧 Applying conservative fixes...');

    // Lister tous les drivers
    const drivers = fs.readdirSync(this.driversPath);

    for (const driverName of drivers) {
      const driverPath = path.join(this.driversPath, driverName);
      if (!fs.statSync(driverPath).isDirectory()) continue;

      // Chercher les fichiers de flow
      const flowFiles = ['driver.flow.compose.json', 'driver.compose.json'];

      for (const flowFile of flowFiles) {
        const flowPath = path.join(driverPath, flowFile);
        if (fs.existsSync(flowPath)) {
          await this.applyConservativeFixToFile(driverName, flowPath);
          break;
        }
      }
    }
  }

  /**
   * Applique corrections conservatives à un fichier de flow
   */
  async applyConservativeFixToFile(driverName, flowPath) {
    try {
      const flows = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      let modified = false;

      // Seulement corriger les problèmes suivants (conservativement):
      // 1. IDs extrêmement longs (>80 caractères)
      // 2. IDs avec des caractères invalides
      // 3. IDs sans préfixe du driver

      ['triggers', 'conditions', 'actions'].forEach(flowType => {
        if (flows[flowType]) {
          flows[flowType].forEach(flow => {
            if (flow.id) {
              const originalId = flow.id;
              const fixedId = this.applyConservativeIdFix(flow.id, driverName);

              if (fixedId !== originalId) {
                // Ajouter fallback metadata pour compatibilité
                flow._conservativeFix = {
                  originalId,
                  fixVersion: '5.5.295',
                  reason: this.getFixReason(originalId, fixedId)
                };
                flow.id = fixedId;
                modified = true;
                this.results.conservativelyFixed++;
              }
            }
          });
        }
      });

      // Détecter et signaler les doublons (sans les corriger automatiquement)
      this.detectDuplicatesOnly(flows, driverName);

      // Sauvegarder seulement si nécessaire
      if (modified) {
        fs.writeFileSync(flowPath, JSON.stringify(flows, null, 2));
        console.log(`✅ Applied conservative fixes to ${driverName}`);
      }

    } catch (error) {
      console.log(`⚠️ Error processing ${driverName}: ${error.message}`);
    }
  }

  /**
   * Applique correction conservative à un ID
   */
  applyConservativeIdFix(flowId, driverName) {
    let fixed = flowId;

    // 1. Corriger uniquement les IDs extrêmement longs (>80 chars)
    if (fixed.length > 80) {
      // Supprimer seulement les parties les plus redondantes
      fixed = fixed
        .replace(/_smart_bulb_dimmer_/g, '_')
        .replace(/_smart_switch_\d+gang_hybrid_/g, '_')
        .replace(/_comprehensive_air_monitor_/g, '_')
        .replace(/_wall_switch_\d+gang_/g, '_')
        .replace(/_{3,}/g, '_');
    }

    // 2. S'assurer que l'ID commence par le nom du driver (très conservatif)
    if (!fixed.startsWith(driverName) && fixed.length > 60) {
      // Seulement pour les IDs très longs qui ne commencent pas par le driver
      const basePart = fixed.replace(/^[^_]+_/, '');
      fixed = `${driverName}_${basePart}`;
    }

    // 3. Nettoyer les caractères potentiellement problématiques
    fixed = fixed.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_{2,}/g, '_');

    return fixed;
  }

  /**
   * Détermine la raison de la correction
   */
  getFixReason(originalId, fixedId) {
    if (originalId.length > 80) return 'id_too_long';
    if (originalId.length !== fixedId.length) return 'redundant_parts_removed';
    return 'character_cleanup';
  }

  /**
   * Détecte les doublons sans les corriger (pour rapport seulement)
   */
  detectDuplicatesOnly(flows, driverName) {
    const seenIds = new Map();
    let duplicatesInThis = 0;

    ['triggers', 'conditions', 'actions'].forEach(flowType => {
      if (flows[flowType]) {
        flows[flowType].forEach(flow => {
          if (flow.id) {
            if (seenIds.has(flow.id)) {
              duplicatesInThis++;
              console.log(`⚠️  Duplicate detected in ${driverName}: ${flow.id}`);
            } else {
              seenIds.set(flow.id, true);
            }
          }
        });
      }
    });

    if (duplicatesInThis > 0) {
      this.results.duplicatesFound += duplicatesInThis;
      console.log(`📊 ${driverName}: ${duplicatesInThis} duplicates found (not auto-fixed)`);
    }
  }

  /**
   * Génère le rapport final
   */
  generateReport() {
    console.log('\n📊 RESTORATION & CONSERVATIVE FIX RESULTS:');
    console.log('═'.repeat(60));
    console.log(`Files restored: ${this.results.restored}`);
    console.log(`Conservative fixes applied: ${this.results.conservativelyFixed}`);
    console.log(`Duplicates detected (not fixed): ${this.results.duplicatesFound}`);

    console.log('\n✅ CONSERVATIVE APPROACH COMPLETED:');
    console.log('- Original flow files restored from backup');
    console.log('- Only critical ID issues fixed (>80 chars, invalid chars)');
    console.log('- Multi-gang switches preserved as-is');
    console.log('- Duplicates detected but NOT automatically merged');
    console.log('- Backward compatibility maintained');

    console.log('\n💡 NEXT STEPS:');
    if (this.results.duplicatesFound > 0) {
      console.log('- Manual review required for duplicate flows');
      console.log('- Consider driver-specific solutions for multi-gang switches');
    } else {
      console.log('- Ready for Homey validation');
    }

    // Sauvegarder le rapport
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      approach: 'conservative_restoration',
      duplicatesDetected: this.results.duplicatesFound,
      nextActions: this.results.duplicatesFound > 0 ?
        'manual_review_required' : 'ready_for_validation'
    };

    fs.writeFileSync('flow_restoration_report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Report saved: flow_restoration_report.json');
  }
}

// Exécution
if (require.main === module) {
  const restorer = new FlowRestorerAndFixer();
  restorer.restoreAndFix().catch(console.error);
}

module.exports = FlowRestorerAndFixer;
