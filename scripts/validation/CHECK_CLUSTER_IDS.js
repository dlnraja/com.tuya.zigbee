#!/usr/bin/env node
'use strict';

/**
 * SDK3 VALIDATION: Check Cluster IDs are Numeric
 * 
 * RÈGLE SDK3: Cluster IDs doivent être des NUMBERS, pas des strings
 * 
 * Exemples:
 * ✅ CORRECT:   "clusters": [0, 3, 6, 8, 768]
 * ❌ INCORRECT: "clusters": ["0", "3", "6", "8", "768"]
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 SDK3 VALIDATION: Checking Cluster IDs Format\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let errors = 0;
let warnings = 0;
let checked = 0;

appJson.drivers.forEach(driver => {
  if (!driver.zigbee || !driver.zigbee.endpoints) return;
  
  Object.entries(driver.zigbee.endpoints).forEach(([epId, ep]) => {
    // Check clusters
    if (ep.clusters && Array.isArray(ep.clusters)) {
      ep.clusters.forEach((cluster, idx) => {
        checked++;
        if (typeof cluster !== 'number') {
          console.error(`❌ ERROR: Driver "${driver.id}"`);
          console.error(`   Endpoint ${epId} cluster[${idx}] = "${cluster}" (type: ${typeof cluster})`);
          console.error(`   Must be: ${parseInt(cluster)} (type: number)\n`);
          errors++;
        }
      });
    }
    
    // Check bindings
    if (ep.bindings && Array.isArray(ep.bindings)) {
      ep.bindings.forEach((binding, idx) => {
        checked++;
        if (typeof binding !== 'number') {
          console.error(`❌ ERROR: Driver "${driver.id}"`);
          console.error(`   Endpoint ${epId} binding[${idx}] = "${binding}" (type: ${typeof binding})`);
          console.error(`   Must be: ${parseInt(binding)} (type: number)\n`);
          errors++;
        }
      });
    }
    
    // Check for common proprietary clusters
    if (ep.clusters) {
      const proprietaryClusters = ep.clusters.filter(c => c >= 0xFC00);
      if (proprietaryClusters.length > 0) {
        console.log(`ℹ️  Driver "${driver.id}" uses proprietary clusters:`, proprietaryClusters);
        warnings++;
      }
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60) + '\n');

console.log(`📊 Checked: ${checked} cluster/binding IDs`);
console.log(`✅ Drivers: ${appJson.drivers.length}`);

if (errors === 0) {
  console.log(`\n✅ SUCCESS: All cluster IDs are numeric!\n`);
  process.exit(0);
} else {
  console.error(`\n❌ FAILED: Found ${errors} non-numeric cluster/binding IDs`);
  console.error(`\n🔧 To fix automatically, run:`);
  console.error(`   node scripts/fixes/FIX_CLUSTER_IDS_TO_NUMERIC.js\n`);
  process.exit(1);
}
