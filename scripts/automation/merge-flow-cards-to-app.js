#!/usr/bin/env node

/**
 * MERGE FLOW CARDS TO APP.JSON
 * 
 * Takes generated flow cards from project-data/generated-flow-cards.json
 * and intelligently merges them into app.json
 * 
 * Features:
 * - Preserves existing flow cards
 * - Avoids duplicates by ID
 * - Adds missing flow cards automatically
 * - Updates app.json in place
 * 
 * Usage: node scripts/automation/merge-flow-cards-to-app.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Main execution
 */
function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  🔄 MERGING FLOW CARDS TO APP.JSON                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  const projectRoot = path.join(__dirname, '../..');
  const appJsonPath = path.join(projectRoot, 'app.json');
  const generatedPath = path.join(projectRoot, 'project-data', 'generated-flow-cards.json');
  
  // Read files
  console.log('[READ] Loading app.json...');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  console.log('[READ] Loading generated flow cards...');
  const generatedFlowCards = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
  
  // Get existing flow triggers
  const existingTriggers = appJson.flow?.triggers || [];
  console.log(`[INFO] Found ${existingTriggers.length} existing flow triggers in app.json`);
  
  // Create map of existing triggers by ID
  const existingTriggersMap = {};
  for (const trigger of existingTriggers) {
    existingTriggersMap[trigger.id] = trigger;
  }
  
  // Stats
  const stats = {
    totalGenerated: 0,
    added: 0,
    skipped: 0,
    byDriver: {}
  };
  
  // Merge new flow cards
  console.log('\n[MERGE] Processing generated flow cards...\n');
  
  for (const driverData of generatedFlowCards) {
    const driverId = driverData.driver;
    const flowCards = driverData.flowCards;
    
    stats.byDriver[driverId] = {
      generated: flowCards.length,
      added: 0,
      skipped: 0
    };
    
    for (const flowCard of flowCards) {
      stats.totalGenerated++;
      
      const cardId = flowCard.id;
      
      // Check if already exists
      if (existingTriggersMap[cardId]) {
        console.log(`[SKIP] ${cardId} - Already exists`);
        stats.skipped++;
        stats.byDriver[driverId].skipped++;
      } else {
        console.log(`[ADD]  ${cardId} - Adding to app.json`);
        existingTriggers.push(flowCard);
        existingTriggersMap[cardId] = flowCard;
        stats.added++;
        stats.byDriver[driverId].added++;
      }
    }
  }
  
  // Update app.json
  if (!appJson.flow) {
    appJson.flow = {};
  }
  appJson.flow.triggers = existingTriggers;
  
  // Backup original app.json
  const backupPath = path.join(projectRoot, 'project-data', 'app.json.backup');
  console.log(`\n[BACKUP] Creating backup at ${backupPath}`);
  fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));
  
  // Write updated app.json
  console.log('[WRITE] Updating app.json...');
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  
  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  📊 MERGE SUMMARY                                   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`Total flow cards generated: ${stats.totalGenerated}`);
  console.log(`Flow cards added: ${stats.added} ✅`);
  console.log(`Flow cards skipped (already exist): ${stats.skipped}`);
  console.log(`\nTotal flow triggers in app.json: ${existingTriggers.length}`);
  
  // Print per-driver stats
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  📊 PER-DRIVER STATS                                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  const driversWithAdded = Object.entries(stats.byDriver)
    .filter(([_, s]) => s.added > 0)
    .sort((a, b) => b[1].added - a[1].added);
  
  console.log(`\nDrivers with new flow cards: ${driversWithAdded.length}\n`);
  
  for (const [driverId, driverStats] of driversWithAdded.slice(0, 20)) {
    console.log(`${driverId.padEnd(40)} +${driverStats.added} cards`);
  }
  
  if (driversWithAdded.length > 20) {
    console.log(`... and ${driversWithAdded.length - 20} more drivers`);
  }
  
  console.log('\n✅ MERGE COMPLETED SUCCESSFULLY!\n');
  console.log('Next steps:');
  console.log('1. Review changes: git diff app.json');
  console.log('2. Validate: homey app validate --level publish');
  console.log('3. Commit & push\n');
}

// Run!
try {
  main();
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
