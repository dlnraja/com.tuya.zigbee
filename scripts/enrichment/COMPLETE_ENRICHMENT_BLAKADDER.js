#!/usr/bin/env node
'use strict';

/**
 * COMPLETE_ENRICHMENT_BLAKADDER.js
 * Enrichissement complet depuis Blakadder database
 * Cross-reference avec drivers existants
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const ENRICHMENT_DIR = path.join(__dirname, '../../docs/enrichment');

// Blakadder Zigbee Database (extrait des devices les plus courants)
const BLAKADDER_DATABASE = {
  // Motion Sensors
  '_TZ3000_mmtwjmaq': {
    model: 'TS0202',
    type: 'motion_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 1, 3, 1280, 1026] } },
    capabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
    verified: true
  },
  '_TZ3000_kmh5qpmb': {
    model: 'TS0202',
    type: 'motion_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 1, 3, 1280] } },
    capabilities: ['alarm_motion', 'measure_battery'],
    verified: true
  },
  '_TZE200_3towulqd': {
    model: 'TS0601',
    type: 'motion_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 4, 5, 61184] } },
    capabilities: ['alarm_motion', 'measure_battery'],
    verified: true
  },
  
  // Contact Sensors
  '_TZ3000_26fmupbb': {
    model: 'TS0203',
    type: 'contact_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 1, 3, 1280] } },
    capabilities: ['alarm_contact', 'measure_battery'],
    verified: true
  },
  '_TZ3000_n2egfsli': {
    model: 'TS0203',
    type: 'contact_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 1, 3, 6, 1280] } },
    capabilities: ['alarm_contact', 'measure_battery'],
    verified: true
  },
  
  // Climate Sensors
  '_TZE200_cwbvmsar': {
    model: 'TS0601',
    type: 'climate_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 4, 5, 61184] } },
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    verified: true
  },
  '_TZE200_bjawzodf': {
    model: 'TS0601',
    type: 'climate_sensor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 4, 5, 61184] } },
    capabilities: ['measure_temperature', 'measure_humidity'],
    verified: true
  },
  
  // Switches
  '_TZ3000_qzjcsmar': {
    model: 'TS0001',
    type: 'switch_1gang',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 3, 4, 5, 6] } },
    capabilities: ['onoff'],
    verified: true
  },
  '_TZ3000_ji4araar': {
    model: 'TS0011',
    type: 'switch_2gang',
    manufacturer: 'Tuya',
    endpoints: { 
      1: { clusters: [0, 3, 4, 5, 6] },
      2: { clusters: [0, 4, 5, 6] }
    },
    capabilities: ['onoff'],
    verified: true
  },
  
  // Plugs
  '_TZ3000_g5xawfcq': {
    model: 'TS011F',
    type: 'plug',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 3, 4, 5, 6, 1794, 2820] } },
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    verified: true
  },
  '_TZ3000_cehuw1lw': {
    model: 'TS011F',
    type: 'plug',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 4, 5, 6, 1794] } },
    capabilities: ['onoff', 'measure_power'],
    verified: true
  },
  
  // Curtains
  '_TZE200_fctwhugx': {
    model: 'TS0601',
    type: 'curtain_motor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 4, 5, 61184] } },
    capabilities: ['windowcoverings_set', 'onoff'],
    verified: true
  },
  '_TZE200_cowvfni3': {
    model: 'TS0601',
    type: 'curtain_motor',
    manufacturer: 'Tuya',
    endpoints: { 1: { clusters: [0, 4, 5, 61184] } },
    capabilities: ['windowcoverings_set'],
    verified: true
  }
};

/**
 * Scan tous les drivers et match avec Blakadder
 */
function scanAndMatchDrivers() {
  console.log('🔍 Scanning drivers and matching with Blakadder database...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });
  
  const results = {
    matched: [],
    needsEnrichment: [],
    alreadyComplete: [],
    total: drivers.length
  };
  
  for (const driver of drivers) {
    const manifestPath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    
    if (!fs.existsSync(manifestPath)) continue;
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.zigbee) continue;
    
    const manufacturerName = manifest.zigbee.manufacturerName;
    
    // Check if in Blakadder database
    if (BLAKADDER_DATABASE[manufacturerName]) {
      const blakadderData = BLAKADDER_DATABASE[manufacturerName];
      
      // Check if needs enrichment
      const hasEndpoints = manifest.zigbee.endpoints && Object.keys(manifest.zigbee.endpoints).length > 0;
      
      if (!hasEndpoints) {
        results.needsEnrichment.push({
          driver,
          manufacturerId: manufacturerName,
          blakadderData
        });
        console.log(`⚠️  ${driver}: NEEDS enrichment (missing endpoints)`);
      } else {
        results.alreadyComplete.push(driver);
        console.log(`✅ ${driver}: Already complete`);
      }
      
      results.matched.push({
        driver,
        manufacturerId: manufacturerName,
        hasEndpoints
      });
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Total drivers: ${results.total}`);
  console.log(`   Matched in Blakadder: ${results.matched.length}`);
  console.log(`   Need enrichment: ${results.needsEnrichment.length}`);
  console.log(`   Already complete: ${results.alreadyComplete.length}`);
  
  return results;
}

/**
 * Apply enrichments from Blakadder
 */
function applyEnrichments(enrichmentList) {
  console.log(`\n🔧 Applying ${enrichmentList.length} enrichments...\n`);
  
  let applied = 0;
  let failed = 0;
  
  for (const item of enrichmentList) {
    const manifestPath = path.join(DRIVERS_DIR, item.driver, 'driver.compose.json');
    
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Add endpoints from Blakadder
      if (item.blakadderData.endpoints) {
        manifest.zigbee.endpoints = item.blakadderData.endpoints;
      }
      
      // Ensure productId if missing
      if (!manifest.zigbee.productId && item.blakadderData.model) {
        manifest.zigbee.productId = [item.blakadderData.model];
      }
      
      // Write back
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      console.log(`  ✅ ${item.driver}: Enriched with endpoints`);
      applied++;
      
    } catch (error) {
      console.log(`  ❌ ${item.driver}: Failed - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Enrichment results:`);
  console.log(`   Applied: ${applied}`);
  console.log(`   Failed: ${failed}`);
  
  return { applied, failed };
}

/**
 * Generate enrichment report
 */
function generateReport(scanResults, enrichmentResults) {
  const report = {
    timestamp: new Date().toISOString(),
    source: 'Blakadder Zigbee Database',
    scan: {
      totalDrivers: scanResults.total,
      matchedInDatabase: scanResults.matched.length,
      needsEnrichment: scanResults.needsEnrichment.length,
      alreadyComplete: scanResults.alreadyComplete.length
    },
    enrichment: enrichmentResults,
    devices: scanResults.needsEnrichment.map(item => ({
      driver: item.driver,
      manufacturerId: item.manufacturerId,
      model: item.blakadderData.model,
      type: item.blakadderData.type,
      verified: item.blakadderData.verified
    }))
  };
  
  if (!fs.existsSync(ENRICHMENT_DIR)) {
    fs.mkdirSync(ENRICHMENT_DIR, { recursive: true });
  }
  
  const reportPath = path.join(ENRICHMENT_DIR, `blakadder_enrichment_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Report saved: ${reportPath}`);
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 COMPLETE ENRICHMENT FROM BLAKADDER DATABASE');
  console.log('═'.repeat(60));
  console.log('Source: zigbee.blakadder.com verified devices');
  console.log('═'.repeat(60));
  console.log('');
  
  // 1. Scan and match
  const scanResults = scanAndMatchDrivers();
  
  // 2. Apply enrichments
  let enrichmentResults = { applied: 0, failed: 0 };
  if (scanResults.needsEnrichment.length > 0) {
    enrichmentResults = applyEnrichments(scanResults.needsEnrichment);
  } else {
    console.log('\n✅ No enrichments needed - all drivers complete!');
  }
  
  // 3. Generate report
  const report = generateReport(scanResults, enrichmentResults);
  
  console.log('\n✅ ENRICHMENT COMPLETE!');
  console.log('═'.repeat(60));
  
  if (enrichmentResults.applied > 0) {
    console.log('🎯 Next steps:');
    console.log('   1. Validate: homey app validate');
    console.log('   2. Test locally');
    console.log('   3. Commit: git sc -Message "enrich: added endpoints from Blakadder"');
    console.log('   4. Publish when ready');
  }
  
  return report;
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { main, scanAndMatchDrivers, applyEnrichments, BLAKADDER_DATABASE };
