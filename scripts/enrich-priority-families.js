#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

/**
 * ENRICH PRIORITY FAMILIES
 * Applique l'enrichissement aux familles prioritaires
 */

const PRIORITY_FAMILIES = [
  'bulbs',      // 13 drivers - éclairage
  'plugs',      // 16 drivers - prises intelligentes
  'switches',   // 38 drivers - interrupteurs
  'motion',     // 10 drivers - détecteurs mouvement
  'contact',    // 4 drivers - capteurs contact
  'buttons',    // 17 drivers - télécommandes
  'climate',    // 11 drivers - climat/qualité air
  'water',      // 6 drivers - fuites/vannes
  'smoke',      // 6 drivers - détecteurs fumée/gaz
  'thermostat'  // 6 drivers - thermostats/vannes
];

console.log('🚀 ENRICHISSEMENT MASSIF - FAMILLES PRIORITAIRES\n');
console.log(`Processing ${PRIORITY_FAMILIES.length} families...\n`);

let totalCreated = 0;
const results = [];

PRIORITY_FAMILIES.forEach((family, index) => {
  console.log(`\n[${ index + 1}/${PRIORITY_FAMILIES.length}] Processing: ${family}`);
  console.log('='.repeat(80));
  
  try {
    const output = execSync(`node scripts/apply-enrichment.js ${family}`, {
      cwd: __dirname + '/..',
      encoding: 'utf8'
    });
    
    console.log(output);
    
    // Extract created count
    const match = output.match(/Flow cards created: (\d+)/);
    const created = match ? parseInt(match[1]) : 0;
    totalCreated += created;
    
    results.push({
      family,
      status: 'success',
      created
    });
    
  } catch (error) {
    console.error(`❌ Error processing ${family}:`, error.message);
    results.push({
      family,
      status: 'error',
      error: error.message
    });
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 ENRICHISSEMENT SUMMARY');
console.log('='.repeat(80));

results.forEach(result => {
  const status = result.status === 'success' ? '✅' : '❌';
  const info = result.status === 'success' ? 
    `${result.created} flow cards` : 
    result.error;
  console.log(`${status} ${result.family}: ${info}`);
});

console.log('\n' + '='.repeat(80));
console.log(`✅ Total flow cards created: ${totalCreated}`);
console.log(`✅ Families processed: ${results.filter(r => r.status === 'success').length}/${PRIORITY_FAMILIES.length}`);
console.log('='.repeat(80) + '\n');

console.log('🚀 Next steps:');
console.log('  1. homey app build');
console.log('  2. homey app validate');
console.log('  3. git commit\n');
