#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * APPLY ENRICHMENT - Applique l'enrichissement aux drivers
 * Usage: node apply-enrichment.js [family] [--dry-run]
 */

const ANALYSIS_FILE = path.join(__dirname, '..', 'driver-enrichment-analysis.json');
const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

// Load analysis
if (!fs.existsSync(ANALYSIS_FILE)) {
  console.error('❌ Analysis file not found. Run enrich-all-drivers.js first.');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
const targetFamily = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!targetFamily) {
  console.log('📋 Available families:');
  Object.keys(analysis.byFamily).forEach(family => {
    const count = analysis.byFamily[family].length;
    console.log(`  - ${family} (${count} drivers)`);
  });
  console.log('\nUsage: node apply-enrichment.js [family] [--dry-run]');
  process.exit(0);
}

if (!analysis.byFamily[targetFamily]) {
  console.error(`❌ Family '${targetFamily}' not found`);
  process.exit(1);
}

const drivers = analysis.byFamily[targetFamily];

console.log(`\n🚀 Enriching ${drivers.length} drivers in family: ${targetFamily}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}\n`);

// Load complete templates
const FLOW_TEMPLATES = require('./complete-flow-templates.js');

function createFlowCard(driverName, cardType, cardId) {
  const templateFn = FLOW_TEMPLATES[cardId];
  if (!templateFn) {
    console.warn(`  ⚠️  No template for ${cardId}`);
    return null;
  }
  
  const card = templateFn(driverName);
  const fileName = `${driverName}_${cardId}.json`;
  const filePath = path.join(FLOW_BASE, cardType, fileName);
  
  if (dryRun) {
    console.log(`  [DRY] Would create: ${cardType}/${fileName}`);
    return true;
  }
  
  // Create directory
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Check if exists
  if (fs.existsSync(filePath)) {
    console.log(`  ⏭️  Skip existing: ${cardType}/${fileName}`);
    return false;
  }
  
  // Write file
  fs.writeFileSync(filePath, JSON.stringify(card, null, 2));
  console.log(`  ✅ Created: ${cardType}/${fileName}`);
  return true;
}

function enrichDriver(driver) {
  console.log(`\n📦 ${driver.driverName}`);
  console.log(`  Family: ${driver.family}`);
  console.log(`  Missing capabilities: ${driver.missingCapabilities.join(', ') || 'none'}`);
  
  let created = 0;
  
  // Create flow cards
  const { triggers = [], conditions = [], actions = [] } = driver.flowCards;
  
  triggers.forEach(cardId => {
    if (createFlowCard(driver.driverName, 'triggers', cardId)) created++;
  });
  
  conditions.forEach(cardId => {
    if (createFlowCard(driver.driverName, 'conditions', cardId)) created++;
  });
  
  actions.forEach(cardId => {
    if (createFlowCard(driver.driverName, 'actions', cardId)) created++;
  });
  
  console.log(`  📊 Flow cards created: ${created}`);
  
  return created;
}

// Process drivers
let totalCreated = 0;

drivers.forEach(driver => {
  totalCreated += enrichDriver(driver);
});

console.log('\n' + '='.repeat(80));
console.log(`✅ Enrichment ${dryRun ? 'preview' : 'completed'}`);
console.log(`   Family: ${targetFamily}`);
console.log(`   Drivers: ${drivers.length}`);
console.log(`   Flow cards created: ${totalCreated}`);
console.log('='.repeat(80) + '\n');

if (dryRun) {
  console.log('💡 Remove --dry-run to apply changes\n');
} else {
  console.log('🚀 Next: homey app build\n');
}
