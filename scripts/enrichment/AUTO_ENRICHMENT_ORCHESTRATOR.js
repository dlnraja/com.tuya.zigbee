#!/usr/bin/env node
'use strict';

/**
 * AUTO_ENRICHMENT_ORCHESTRATOR.js
 * Orchestrateur intelligent combinant Matcher + Pathfinder + Converter
 * Enrichissement automatique des drivers depuis sources externes
 */

const fs = require('fs');
const path = require('path');
const { ConversionPathfinder } = require('./PATHFINDER_CONVERTER');
const { intelligentMatch } = require('./INTELLIGENT_MATCHER_BLAKADDER');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const BACKUP_DIR = path.join(__dirname, '../../.backup');
const REPORTS_DIR = path.join(__dirname, '../../docs/enrichment');

/**
 * Crée backup avant modification
 */
function createBackup(driverPath) {
  const driverName = path.basename(driverPath);
  const backupPath = path.join(BACKUP_DIR, driverName);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  
  // Backup driver.compose.json
  const manifestPath = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(manifestPath)) {
    const backupFile = path.join(backupPath, `driver.compose.json.backup.${Date.now()}`);
    fs.copyFileSync(manifestPath, backupFile);
    return backupFile;
  }
  
  return null;
}

/**
 * Applique enrichissement à un driver
 */
function applyEnrichment(driverPath, enrichmentData, options = {}) {
  const manifestPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(manifestPath)) {
    return { success: false, error: 'Manifest not found' };
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.zigbee) {
      manifest.zigbee = {};
    }
    
    let modified = false;
    const changes = [];
    
    // Enrichir manufacturer IDs
    if (enrichmentData.manufacturerName && enrichmentData.manufacturerName.length > 0) {
      const existing = manifest.zigbee.manufacturerName || [];
      const newIds = enrichmentData.manufacturerName.filter(id => !existing.includes(id));
      
      if (newIds.length > 0 || !manifest.zigbee.manufacturerName) {
        manifest.zigbee.manufacturerName = Array.from(new Set([...existing, ...newIds]));
        modified = true;
        changes.push(`Added manufacturer IDs: ${newIds.join(', ')}`);
      }
    }
    
    // Enrichir product IDs
    if (enrichmentData.productId && enrichmentData.productId.length > 0) {
      const existing = manifest.zigbee.productId || [];
      const newIds = enrichmentData.productId.filter(id => !existing.includes(id));
      
      if (newIds.length > 0 || !manifest.zigbee.productId) {
        manifest.zigbee.productId = Array.from(new Set([...existing, ...newIds]));
        modified = true;
        changes.push(`Added product IDs: ${newIds.join(', ')}`);
      }
    }
    
    // Enrichir endpoints (si manquants)
    if (enrichmentData.endpoints && Object.keys(enrichmentData.endpoints).length > 0) {
      if (!manifest.zigbee.endpoints || Object.keys(manifest.zigbee.endpoints).length === 0) {
        manifest.zigbee.endpoints = enrichmentData.endpoints;
        modified = true;
        changes.push('Added endpoints configuration');
      }
    }
    
    if (modified && !options.dryRun) {
      // Backup
      const backupFile = createBackup(driverPath);
      
      // Write
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      return {
        success: true,
        changes,
        backupFile,
        manifest
      };
    }
    
    return {
      success: true,
      changes: modified ? changes : ['No changes needed'],
      modified,
      dryRun: options.dryRun
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Orchestration principale
 */
async function orchestrateEnrichment(options = {}) {
  console.log('🎭 AUTO-ENRICHMENT ORCHESTRATOR');
  console.log('═'.repeat(60));
  console.log('Combining: Matcher + Pathfinder + Converter');
  console.log('═'.repeat(60));
  console.log('');
  
  const results = {
    timestamp: new Date().toISOString(),
    totalDrivers: 0,
    enriched: 0,
    skipped: 0,
    failed: 0,
    details: []
  };
  
  // 1. Run intelligent matcher
  console.log('📊 Phase 1: Intelligent Matching...\n');
  const matchReport = await intelligentMatch();
  
  console.log('\n📊 Phase 2: Conversion & Enrichment...\n');
  
  const pathfinder = new ConversionPathfinder();
  
  // 2. Pour chaque match haute confiance, appliquer enrichissement
  const highConfidenceMatches = matchReport.results.matched.filter(
    m => m.confidence === 'HIGH' && m.score >= 90
  );
  
  console.log(`  Found ${highConfidenceMatches.length} high-confidence matches\n`);
  
  for (const match of highConfidenceMatches) {
    const driverPath = path.join(DRIVERS_DIR, match.driver);
    
    console.log(`  Processing: ${match.driver}`);
    
    // Générer config Homey depuis device externe
    const homeyConfig = pathfinder.generateHomeyConfig(match.bestMatch);
    
    // Appliquer enrichissement
    const result = applyEnrichment(driverPath, homeyConfig, options);
    
    if (result.success) {
      if (result.modified) {
        console.log(`    ✅ Enriched: ${result.changes.join(', ')}`);
        results.enriched++;
      } else {
        console.log(`    ⏭️  Skipped: Already complete`);
        results.skipped++;
      }
    } else {
      console.log(`    ❌ Failed: ${result.error}`);
      results.failed++;
    }
    
    results.details.push({
      driver: match.driver,
      ...result,
      matchScore: match.score,
      confidence: match.confidence
    });
    
    results.totalDrivers++;
  }
  
  // 3. Generate final report
  console.log('\n📄 Phase 3: Generating Final Report...\n');
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const reportPath = path.join(REPORTS_DIR, `auto_enrichment_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log(`  ✅ Report saved: ${reportPath}`);
  
  // 4. Summary
  console.log('\n═'.repeat(60));
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Processed: ${results.totalDrivers}`);
  console.log(`Enriched: ${results.enriched}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log('');
  
  if (results.enriched > 0) {
    console.log('🎯 Next Steps:');
    console.log('  1. Review enriched drivers');
    console.log('  2. Test locally: homey app run');
    console.log('  3. Validate: homey app validate');
    console.log('  4. Commit if successful');
    console.log('');
  }
  
  return results;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  };
  
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  orchestrateEnrichment(options).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { orchestrateEnrichment, applyEnrichment };
