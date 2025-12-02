#!/usr/bin/env node
/**
 * 🔧 Add New Devices to Drivers
 *
 * Takes enriched devices and adds their manufacturer IDs
 * to the appropriate driver.compose.json files.
 *
 * Safety features:
 * - Validates JSON before writing
 * - Creates backup before modification
 * - Skips unknown/low-confidence classifications
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  enrichedFile: path.join(__dirname, '../../data/discovery/enriched-devices.json'),
  driversDir: path.join(__dirname, '../../drivers'),
  backupDir: path.join(__dirname, '../../data/discovery/backups'),
  minConfidence: ['pattern', 'keyword', 'prefix'], // Skip 'fallback' and 'none'
  dryRun: process.argv.includes('--dry-run')
};

/**
 * Load enriched devices
 */
function loadEnrichedDevices() {
  if (!fs.existsSync(CONFIG.enrichedFile)) {
    console.log('⚠️ No enriched devices file found');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(CONFIG.enrichedFile, 'utf-8'));
  return data.devices || [];
}

/**
 * Create backup of driver file
 */
function backupDriver(driverName, content) {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `${driverName}_${timestamp}.json`);
  fs.writeFileSync(backupPath, content);
  return backupPath;
}

/**
 * Add manufacturer ID to driver
 */
function addIdToDriver(driverName, manufacturerId) {
  const composePath = path.join(CONFIG.driversDir, driverName, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    console.log(`   ⚠️ Driver not found: ${driverName}`);
    return false;
  }

  try {
    const content = fs.readFileSync(composePath, 'utf-8');
    const compose = JSON.parse(content);

    // Find the zigbee endpoint to add to
    if (!compose.zigbee?.endpoints) {
      console.log(`   ⚠️ No zigbee endpoints in: ${driverName}`);
      return false;
    }

    // Get first endpoint (usually "1" or "11")
    const endpointKeys = Object.keys(compose.zigbee.endpoints);
    if (endpointKeys.length === 0) {
      console.log(`   ⚠️ No endpoints found in: ${driverName}`);
      return false;
    }

    const endpoint = compose.zigbee.endpoints[endpointKeys[0]];

    // Initialize devices array if not exists
    if (!endpoint.devices) {
      endpoint.devices = [];
    }

    // Check if ID already exists
    const exists = endpoint.devices.some(d =>
      d.manufacturerName === manufacturerId || d.productId === manufacturerId
    );

    if (exists) {
      return false; // Already exists
    }

    // Add new device entry
    const newDevice = {
      manufacturerName: manufacturerId
    };

    // For TS* models, also add as productId
    if (manufacturerId.startsWith('TS')) {
      newDevice.productId = manufacturerId;
      delete newDevice.manufacturerName;
    }

    endpoint.devices.push(newDevice);

    // Backup and save
    if (!CONFIG.dryRun) {
      backupDriver(driverName, content);
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    }

    return true;
  } catch (e) {
    console.log(`   ❌ Error processing ${driverName}: ${e.message}`);
    return false;
  }
}

/**
 * Main function
 */
function addToDrivers() {
  console.log('🔧 Adding New Devices to Drivers');
  console.log('='.repeat(50));

  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load enriched devices
  const devices = loadEnrichedDevices();
  console.log(`📋 Loaded ${devices.length} enriched devices`);

  if (devices.length === 0) {
    console.log('ℹ️ No devices to add');
    return;
  }

  // Filter by confidence
  const eligibleDevices = devices.filter(d =>
    d.classification &&
    CONFIG.minConfidence.includes(d.classification.confidence) &&
    d.classification.driver !== 'unknown'
  );

  console.log(`✅ ${eligibleDevices.length} devices have sufficient confidence`);

  // Group by driver
  const byDriver = {};
  for (const device of eligibleDevices) {
    const driver = device.classification.driver;
    if (!byDriver[driver]) {
      byDriver[driver] = [];
    }
    byDriver[driver].push(device);
  }

  // Process each driver
  const stats = {
    added: 0,
    skipped: 0,
    errors: 0
  };

  console.log('\n📝 Processing drivers:\n');

  for (const [driverName, driverDevices] of Object.entries(byDriver)) {
    console.log(`\n📂 ${driverName} (${driverDevices.length} devices):`);

    for (const device of driverDevices) {
      const result = addIdToDriver(driverName, device.id);

      if (result) {
        console.log(`   ✅ Added: ${device.id}`);
        stats.added++;
      } else {
        stats.skipped++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Added: ${stats.added}`);
  console.log(`   ⏭️ Skipped (existing/error): ${stats.skipped}`);

  if (CONFIG.dryRun) {
    console.log('\n🔍 DRY RUN - No files were modified');
  } else {
    console.log(`\n💾 Changes saved to driver files`);
    console.log(`📁 Backups saved to: ${CONFIG.backupDir}`);
  }

  // Save stats
  const statsPath = path.join(CONFIG.backupDir, 'last-run-stats.json');
  if (!fs.existsSync(path.dirname(statsPath))) {
    fs.mkdirSync(path.dirname(statsPath), { recursive: true });
  }
  fs.writeFileSync(statsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun: CONFIG.dryRun,
    stats,
    driversModified: Object.keys(byDriver)
  }, null, 2));

  return stats;
}

// Run
addToDrivers();
