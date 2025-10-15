#!/usr/bin/env node
'use strict';

/**
 * WEEKLY_ORCHESTRATOR.js
 * Orchestrateur hebdomadaire COMPLET et INTELLIGENT
 * 
 * WORKFLOW AUTOMATIQUE:
 * 1. Scrape toutes sources (forum, GitHub, databases)
 * 2. Enrichit drivers de façon sécurisée
 * 3. Valide changements
 * 4. Publie SEULEMENT si drivers modifiés
 * 5. Sync docs sur GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  RESET: '\x1b[0m'
};

function log(msg, color = COLORS.RESET) {
  console.log(`${color}${msg}${COLORS.RESET}`);
}

function runStep(title, command) {
  log(`\n${title}`, COLORS.YELLOW);
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    log(`  ✅ Success`, COLORS.GREEN);
    return true;
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function main() {
  log('═'.repeat(70), COLORS.CYAN);
  log('🤖 WEEKLY ORCHESTRATOR - Intelligent Automation', COLORS.CYAN);
  log('═'.repeat(70), COLORS.CYAN);
  log(`Started: ${new Date().toISOString()}`);
  
  const results = {
    scraping: false,
    enrichment: false,
    autoApply: false,
    validation: false,
    hasDriverChanges: false,
    published: false,
    docsSynced: false
  };
  
  // PHASE 1: Scraping
  log('\n📊 PHASE 1: Data Collection', COLORS.CYAN);
  results.scraping = runStep(
    '🔍 Scraping all sources...',
    'node scripts/enrichment/MEGA_SCRAPER_V2.js'
  );
  
  if (!results.scraping) {
    log('\n⚠️  Scraping failed - continuing anyway', COLORS.YELLOW);
  }
  
  // PHASE 2: Enrichment Analysis
  log('\n📋 PHASE 2: Enrichment Analysis', COLORS.CYAN);
  results.enrichment = runStep(
    '🔧 Analyzing drivers...',
    'node scripts/enrichment/ENRICH_ALL_DRIVERS.js'
  );
  
  // PHASE 3: Auto-Apply Safe Enrichments
  log('\n🔧 PHASE 3: Auto-Apply Enrichments', COLORS.CYAN);
  log('⚠️  Only applying VERIFIED enrichments (safe mode)');
  results.autoApply = runStep(
    '🤖 Applying safe enrichments...',
    'node scripts/enrichment/AUTO_APPLY_ENRICHMENTS.js'
  );
  
  // PHASE 4: Validation
  log('\n🔍 PHASE 4: Validation', COLORS.CYAN);
  results.validation = runStep(
    '✓ Validating app...',
    'homey app validate --level publish'
  );
  
  if (!results.validation) {
    log('\n❌ VALIDATION FAILED - Aborting publish', COLORS.RED);
    log('📝 Fix errors manually or rollback changes');
    process.exit(1);
  }
  
  // PHASE 5: Detect Driver Changes
  log('\n🔍 PHASE 5: Change Detection', COLORS.CYAN);
  try {
    const changes = execSync('git diff --name-only drivers/', { encoding: 'utf8' });
    results.hasDriverChanges = changes.trim().length > 0;
    
    if (results.hasDriverChanges) {
      log('  🔥 DRIVER CHANGES DETECTED!', COLORS.RED);
      log('  Modified files:');
      changes.trim().split('\n').forEach(file => {
        log(`    - ${file}`, COLORS.YELLOW);
      });
    } else {
      log('  ℹ️  No driver changes', COLORS.CYAN);
    }
  } catch (error) {
    results.hasDriverChanges = false;
  }
  
  // PHASE 6: Smart Publish
  if (results.hasDriverChanges) {
    log('\n🚀 PHASE 6: Smart Publish', COLORS.CYAN);
    log('  Publishing to Homey App Store...');
    
    const isWindows = process.platform === 'win32';
    const publishCmd = isWindows
      ? 'pwsh scripts/automation/SMART_PUBLISH.ps1'
      : 'bash scripts/automation/SMART_PUBLISH.sh'; // À créer si besoin
    
    results.published = runStep(
      '📦 Publishing...',
      publishCmd
    );
    
  } else {
    log('\n✓ PHASE 6: No Publish Needed', COLORS.GREEN);
    log('  No driver changes - skipping Homey publish');
  }
  
  // PHASE 7: Sync Docs to GitHub
  log('\n📄 PHASE 7: Documentation Sync', COLORS.CYAN);
  try {
    execSync('git add docs/', { stdio: 'inherit' });
    const docsStatus = execSync('git status --porcelain docs/', { encoding: 'utf8' });
    
    if (docsStatus.trim()) {
      execSync('git commit -m "docs: weekly enrichment reports $(date +%Y-%m-%d)"', { stdio: 'inherit' });
      execSync('git push origin master', { stdio: 'inherit' });
      results.docsSynced = true;
      log('  ✅ Docs synced to GitHub', COLORS.GREEN);
    } else {
      log('  ℹ️  No doc changes to sync', COLORS.CYAN);
    }
  } catch (error) {
    log('  ⚠️  Doc sync skipped (no changes or error)', COLORS.YELLOW);
  }
  
  // FINAL SUMMARY
  log('\n═'.repeat(70), COLORS.CYAN);
  log('📊 ORCHESTRATION SUMMARY', COLORS.CYAN);
  log('═'.repeat(70), COLORS.CYAN);
  
  log(`\n✅ Results:`);
  log(`   Scraping: ${results.scraping ? '✅' : '⚠️'}`);
  log(`   Enrichment Analysis: ${results.enrichment ? '✅' : '⚠️'}`);
  log(`   Auto-Apply: ${results.autoApply ? '✅' : '⚠️'}`);
  log(`   Validation: ${results.validation ? '✅' : '❌'}`);
  log(`   Driver Changes: ${results.hasDriverChanges ? '🔥 YES' : '✓ None'}`);
  log(`   Published to Homey: ${results.published ? '✅ YES' : '✓ No (not needed)'}`);
  log(`   Docs Synced: ${results.docsSynced ? '✅' : '✓ No changes'}`);
  
  log(`\n📈 Impact:`);
  if (results.hasDriverChanges) {
    log(`   🎯 New version published to Homey App Store!`);
    log(`   🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee`);
  } else {
    log(`   📄 Documentation updated`);
    log(`   🔍 Enrichment data collected for future improvements`);
  }
  
  log(`\n💡 Next Steps:`);
  if (results.hasDriverChanges) {
    log(`   1. Monitor user feedback on forum`);
    log(`   2. Check Homey App Store dashboard`);
    log(`   3. Wait for community testing`);
  } else {
    log(`   1. Review enrichment reports in docs/enrichment/`);
    log(`   2. Check for user data requests`);
    log(`   3. Manual enrichments may be available`);
  }
  
  log(`\n✅ WEEKLY ORCHESTRATION COMPLETE!`, COLORS.GREEN);
  log(`Finished: ${new Date().toISOString()}`);
  log('═'.repeat(70), COLORS.CYAN);
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Orchestration failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
