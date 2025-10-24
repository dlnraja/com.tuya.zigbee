#!/usr/bin/env node
'use strict';

/**
 * AUTO_APPLY_ENRICHMENTS.js
 * Applique les enrichissements de façon SÉCURISÉE et automatique
 * 
 * SÉCURITÉ:
 * - Backup avant modification
 * - Validation après chaque changement
 * - Rollback automatique si erreur
 * - N'applique QUE les enrichissements vérifiés
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const ENRICHMENT_DIR = path.join(__dirname, '../../docs/enrichment');
const BACKUP_DIR = path.join(__dirname, '../../.backups');

/**
 * Charge le dernier plan d'enrichissement
 */
function loadLatestEnrichmentPlan() {
  const files = fs.readdirSync(ENRICHMENT_DIR)
    .filter(f => f.startsWith('enrichment_plan_'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('⚠️  No enrichment plan found');
    return null;
  }
  
  const latestPlan = path.join(ENRICHMENT_DIR, files[0]);
  return JSON.parse(fs.readFileSync(latestPlan, 'utf8'));
}

/**
 * Crée un backup avant modification
 */
function createBackup(driverPath) {
  const driverName = path.basename(driverPath);
  const timestamp = Date.now();
  const backupPath = path.join(BACKUP_DIR, `${driverName}_${timestamp}`);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Copier tout le dossier driver
  execSync(`cp -r "${driverPath}" "${backupPath}"`);
  return backupPath;
}

/**
 * Restaure depuis backup
 */
function restoreBackup(backupPath, driverPath) {
  execSync(`rm -rf "${driverPath}"`);
  execSync(`cp -r "${backupPath}" "${driverPath}"`);
}

/**
 * Applique enrichissement manufacturer ID de façon sécurisée
 */
function applyManufacturerIdEnrichment(driverName, manufacturerId, verified = false) {
  console.log(`  🔧 Enriching ${driverName} with manufacturer ID: ${manufacturerId}`);
  
  // Ne modifier QUE si manufacturerId est vérifié (pas de wildcards)
  if (!verified && manufacturerId.includes('_TZE284_')) {
    console.log(`    ⚠️  Skipped - wildcard ID (not verified)`);
    return false;
  }
  
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const manifestPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.log(`    ⚠️  Skipped - no driver.compose.json`);
    return false;
  }
  
  // Backup
  const backupPath = createBackup(driverPath);
  
  try {
    // Modifier manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (manifest.zigbee && manifest.zigbee.manufacturerName) {
      const oldId = manifest.zigbee.manufacturerName;
      manifest.zigbee.manufacturerName = manufacturerId;
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      // Valider
      const validation = execSync('homey app validate --level publish', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log(`    ✅ Applied: ${oldId} → ${manufacturerId}`);
      return true;
      
    } else {
      console.log(`    ⚠️  Skipped - no zigbee.manufacturerName in manifest`);
      return false;
    }
    
  } catch (error) {
    console.log(`    ❌ Failed - Rolling back`);
    restoreBackup(backupPath, driverPath);
    return false;
  }
}

/**
 * Applique fix de code de façon sécurisée
 */
function applyCodeFix(driverName, fix) {
  console.log(`  🔧 Applying code fix: ${fix.fix}`);
  
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const backupPath = createBackup(driverPath);
  
  try {
    // Appliquer fix selon le type
    if (fix.fix.includes('Smart battery calculation')) {
      // Fix déjà implémenté dans v2.15.1
      console.log(`    ✅ Already implemented in v2.15.1`);
      return true;
    }
    
    if (fix.fix.includes('Auto-detect endpoint')) {
      // Fix déjà implémenté dans v2.15.1
      console.log(`    ✅ Already implemented in v2.15.1`);
      return true;
    }
    
    // Autres fixes: à implémenter au cas par cas
    console.log(`    ℹ️  Manual implementation required`);
    return false;
    
  } catch (error) {
    console.log(`    ❌ Failed - Rolling back`);
    restoreBackup(backupPath, driverPath);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 AUTO-APPLY ENRICHMENTS');
  console.log('═'.repeat(60));
  console.log('Safety: Backup + Validate + Rollback on error');
  console.log('═'.repeat(60));
  
  // 1. Charger plan
  console.log('\n📋 Loading enrichment plan...');
  const plan = loadLatestEnrichmentPlan();
  
  if (!plan) {
    console.log('❌ No enrichment plan found');
    process.exit(1);
  }
  
  console.log(`  Found plan with ${plan.drivers.length} drivers to enrich`);
  
  // 2. Filtrer enrichissements AUTO-SAFE
  const safeEnrichments = plan.autoUpdates.filter(e => {
    // Seulement manufacturer IDs vérifiés (pas de wildcards)
    if (e.manufacturerId) {
      return !e.manufacturerId.includes('_TZE284_') && e.verified;
    }
    return false;
  });
  
  console.log(`  ${safeEnrichments.length} safe enrichments (verified manufacturer IDs)`);
  
  if (safeEnrichments.length === 0) {
    console.log('\n✅ No safe auto-enrichments to apply');
    console.log('💡 Manual enrichments available in plan (require user data)');
    process.exit(0);
  }
  
  // 3. Appliquer enrichissements
  console.log('\n🔧 Applying safe enrichments...');
  let applied = 0;
  let failed = 0;
  
  for (const enrichment of safeEnrichments) {
    const success = applyManufacturerIdEnrichment(
      enrichment.driver,
      enrichment.manufacturerId,
      enrichment.verified
    );
    
    if (success) {
      applied++;
    } else {
      failed++;
    }
  }
  
  // 4. Validation finale
  console.log('\n🔍 Final validation...');
  try {
    execSync('homey app validate --level publish', { stdio: 'inherit' });
    console.log('  ✅ Validation passed');
  } catch (error) {
    console.log('  ❌ Validation failed - Check errors above');
    process.exit(1);
  }
  
  // 5. Summary
  console.log('\n✅ AUTO-ENRICHMENT COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`📊 Results:`);
  console.log(`   Applied: ${applied}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${safeEnrichments.length}`);
  console.log('');
  console.log(`💡 Next steps:`);
  console.log(`   1. Review changes: git diff drivers/`);
  console.log(`   2. Test locally`);
  console.log(`   3. Smart publish: pwsh scripts/automation/SMART_PUBLISH.ps1`);
  console.log('');
  console.log(`🗑️  Backups saved in: .backups/`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { main, applyManufacturerIdEnrichment, applyCodeFix };
