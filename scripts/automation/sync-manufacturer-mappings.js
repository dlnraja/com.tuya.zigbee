#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          MANUFACTURER MAPPING SYNC SCRIPT - v5.5.97                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  This script reads data/manufacturer_mapping.json and ensures all           ║
 * ║  manufacturerName/modelId pairs are present in their respective drivers.    ║
 * ║                                                                              ║
 * ║  Usage: node scripts/automation/sync-manufacturer-mappings.js [--dry-run]   ║
 * ║                                                                              ║
 * ║  Options:                                                                    ║
 * ║    --dry-run    Show what would be changed without making changes           ║
 * ║    --verbose    Show detailed logs                                          ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const MAPPING_FILE = path.join(ROOT, 'data/manufacturer_mapping.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

function log(...msg) {
  console.log('[SYNC]', ...msg);
}

function verbose(...msg) {
  if (VERBOSE) console.log('[DEBUG]', ...msg);
}

function loadMapping() {
  if (!fs.existsSync(MAPPING_FILE)) {
    throw new Error(`Mapping file not found: ${MAPPING_FILE}`);
  }
  return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
}

function loadDriverCompose(driverId) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    return null;
  }
  return {
    path: composePath,
    data: JSON.parse(fs.readFileSync(composePath, 'utf8'))
  };
}

function saveDriverCompose(composePath, data) {
  if (DRY_RUN) {
    log(`[DRY-RUN] Would update: ${composePath}`);
    return;
  }
  fs.writeFileSync(composePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  log(`✅ Updated: ${composePath}`);
}

function extractManufacturerAndModel(key) {
  // Format: "_TZ3000_xxx/TS0001" -> ["_TZ3000_xxx", "TS0001"]
  const parts = key.split('/');
  return {
    manufacturerName: parts[0],
    modelId: parts[1] || null
  };
}

function syncMappings() {
  log('═══════════════════════════════════════════════════════════════');
  log('       MANUFACTURER MAPPING SYNC SCRIPT');
  log('═══════════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    log('🔍 DRY-RUN MODE - No changes will be made');
  }

  const mapping = loadMapping();
  const stats = {
    driversUpdated: 0,
    manufacturersAdded: 0,
    modelsAdded: 0,
    errors: []
  };

  // Process each category in the mapping
  for (const [category, devices] of Object.entries(mapping)) {
    if (category.startsWith('_')) continue; // Skip metadata fields

    verbose(`Processing category: ${category}`);

    for (const [deviceKey, driverId] of Object.entries(devices)) {
      if (deviceKey.startsWith('_')) continue; // Skip comments

      const { manufacturerName, modelId } = extractManufacturerAndModel(deviceKey);
      verbose(`  ${deviceKey} -> ${driverId}`);

      const driver = loadDriverCompose(driverId);
      if (!driver) {
        stats.errors.push(`Driver not found: ${driverId}`);
        continue;
      }

      let updated = false;

      // Check and add manufacturerName
      if (driver.data.zigbee?.manufacturerName) {
        if (!driver.data.zigbee.manufacturerName.includes(manufacturerName)) {
          driver.data.zigbee.manufacturerName.push(manufacturerName);
          stats.manufacturersAdded++;
          updated = true;
          log(`  + Added manufacturerName: ${manufacturerName} to ${driverId}`);
        }
      }

      // Check and add productId (modelId)
      if (modelId && driver.data.zigbee?.productId) {
        if (!driver.data.zigbee.productId.includes(modelId)) {
          driver.data.zigbee.productId.push(modelId);
          stats.modelsAdded++;
          updated = true;
          log(`  + Added productId: ${modelId} to ${driverId}`);
        }
      }

      if (updated) {
        saveDriverCompose(driver.path, driver.data);
        stats.driversUpdated++;
      }
    }
  }

  log('');
  log('═══════════════════════════════════════════════════════════════');
  log('                        SUMMARY');
  log('═══════════════════════════════════════════════════════════════');
  log(`  Drivers updated:      ${stats.driversUpdated}`);
  log(`  ManufacturerNames:    +${stats.manufacturersAdded}`);
  log(`  ProductIds:           +${stats.modelsAdded}`);
  log(`  Errors:               ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    log('');
    log('Errors:');
    stats.errors.forEach(err => log(`  ❌ ${err}`));
  }

  log('═══════════════════════════════════════════════════════════════');

  return stats;
}

// Run
try {
  syncMappings();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
