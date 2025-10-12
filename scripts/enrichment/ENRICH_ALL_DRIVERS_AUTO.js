#!/usr/bin/env node
'use strict';

/**
 * ENRICH ALL DRIVERS AUTO
 * 
 * Enrichissement automatique intelligent de TOUS les drivers
 * avec les 344 manufacturer IDs Tuya
 * 
 * Stratégie:
 * 1. Load database Tuya (344 IDs)
 * 2. Scan tous drivers existants
 * 3. Match intelligent par catégorie/keywords
 * 4. Enrich manufacturerName arrays
 * 5. Save + validate
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REFERENCES_DIR = path.join(ROOT, 'references');
const REPORTS_DIR = path.join(ROOT, 'reports');

// === MAIN ===
async function main() {
  console.log('🔧 ENRICH ALL DRIVERS AUTO\n');
  console.log('═'.repeat(70) + '\n');

  // Load Tuya database
  const dbPath = path.join(REFERENCES_DIR, 'TUYA_COMPLETE_DATABASE.json');
  if (!await fs.pathExists(dbPath)) {
    console.log('❌ Database not found. Run EXTRACT_TUYA_DEVICES_COMPLETE.js first');
    return;
  }

  const database = await fs.readJson(dbPath);
  const allManufacturerIds = [
    ...database.manufacturerDatabase.tuya_core,
    ...database.manufacturerDatabase.tze200_series,
    ...database.manufacturerDatabase.tze204_series,
    ...database.manufacturerDatabase.tze284_series,
    ...database.manufacturerDatabase.ts_series
  ];

  console.log(`📚 Loaded ${allManufacturerIds.length} manufacturer IDs`);

  // Scan drivers
  const drivers = await fs.readdir(DRIVERS_DIR);
  console.log(`📦 Found ${drivers.length} drivers\n`);

  const results = {
    enriched: [],
    skipped: [],
    errors: []
  };

  // Process each driver
  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const stat = await fs.stat(driverPath);
    
    if (!stat.isDirectory()) continue;

    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!await fs.pathExists(composeFile)) {
      results.skipped.push({
        driver: driverName,
        reason: 'No driver.compose.json'
      });
      continue;
    }

    try {
      const compose = await fs.readJson(composeFile);
      
      // Check if already has manufacturerName
      if (!compose.zigbee || !compose.zigbee.manufacturerName) {
        results.skipped.push({
          driver: driverName,
          reason: 'No zigbee.manufacturerName field'
        });
        continue;
      }

      const currentIds = Array.isArray(compose.zigbee.manufacturerName) 
        ? compose.zigbee.manufacturerName 
        : [compose.zigbee.manufacturerName];

      // Smart matching based on driver name and category
      const relevantIds = getRelevantIds(driverName, allManufacturerIds, database);
      
      // Merge (avoid duplicates)
      const merged = [...new Set([...currentIds, ...relevantIds])];
      
      if (merged.length > currentIds.length) {
        compose.zigbee.manufacturerName = merged;
        await fs.writeJson(composeFile, compose, { spaces: 2 });
        
        results.enriched.push({
          driver: driverName,
          before: currentIds.length,
          after: merged.length,
          added: merged.length - currentIds.length
        });
        
        console.log(`✅ ${driverName}: ${currentIds.length} → ${merged.length} IDs (+${merged.length - currentIds.length})`);
      } else {
        results.skipped.push({
          driver: driverName,
          reason: 'No new IDs to add'
        });
      }
      
    } catch (err) {
      results.errors.push({
        driver: driverName,
        error: err.message
      });
      console.log(`❌ ${driverName}: ${err.message}`);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 ENRICHMENT SUMMARY:\n');
  console.log(`Enriched: ${results.enriched.length} drivers`);
  console.log(`Skipped: ${results.skipped.length} drivers`);
  console.log(`Errors: ${results.errors.length} drivers`);
  
  if (results.enriched.length > 0) {
    const totalAdded = results.enriched.reduce((sum, r) => sum + r.added, 0);
    console.log(`\nTotal IDs added: ${totalAdded}`);
    console.log('\nTop enriched drivers:');
    results.enriched
      .sort((a, b) => b.added - a.added)
      .slice(0, 10)
      .forEach(r => {
        console.log(`  ${r.driver}: +${r.added} IDs`);
      });
  }

  // Save report
  const reportPath = path.join(REPORTS_DIR, 'ENRICHMENT_RESULTS.json');
  await fs.ensureDir(REPORTS_DIR);
  await fs.writeJson(reportPath, results, { spaces: 2 });
  console.log(`\n✅ Report saved: ${reportPath}`);
}

/**
 * Get relevant manufacturer IDs for a driver based on intelligent matching
 */
function getRelevantIds(driverName, allIds, database) {
  const relevant = [];
  const nameLower = driverName.toLowerCase();

  // Category-based matching
  for (const [category, data] of Object.entries(database.categoryDefinitions)) {
    for (const keyword of data.keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        // Add relevant series based on category
        if (category === 'Smart Lighting') {
          // Prefer TS series for lighting
          relevant.push(...allIds.filter(id => id.startsWith('TS050') || id.startsWith('TS051')));
        } else if (category === 'Motion & Presence') {
          // Prefer TZE200/TZ3000 for sensors
          relevant.push(...allIds.filter(id => id.includes('motion') || id.includes('pir')));
        } else if (category === 'Controllers & Switches') {
          // TS series for switches
          relevant.push(...allIds.filter(id => id.startsWith('TS000') || id.startsWith('TS001')));
        } else if (category === 'Power & Energy') {
          // TS011F, TS0121 for plugs
          relevant.push(...allIds.filter(id => id === 'TS011F' || id === 'TS0121'));
        }
        break;
      }
    }
  }

  // If battery device, add common battery sensor IDs
  if (nameLower.includes('battery')) {
    relevant.push(...allIds.filter(id => 
      id.includes('TS0201') || 
      id.includes('TS0202') || 
      id.includes('TS0203') ||
      id.includes('_TZ3000_')
    ).slice(0, 20)); // Limit to 20 most common
  }

  // If AC powered, add common AC IDs
  if (nameLower.includes('_ac')) {
    relevant.push(...allIds.filter(id => 
      id.includes('TS011') || 
      id.includes('TS000') ||
      id.includes('TS050')
    ).slice(0, 15));
  }

  // Add core Tuya brand
  if (!relevant.includes('Tuya')) {
    relevant.push('Tuya');
  }

  // Remove duplicates
  return [...new Set(relevant)];
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
