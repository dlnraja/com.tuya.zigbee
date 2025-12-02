#!/usr/bin/env node
/**
 * 🔄 REORGANIZE DRIVERS V2 - Correct Structure
 *
 * Handles the actual Homey driver structure where:
 * - zigbee.productId is an array of product IDs
 * - zigbee.manufacturerName is an array of manufacturer names
 *
 * This script:
 * 1. Scans all driver.compose.json files
 * 2. Identifies misplaced IDs
 * 3. Moves them to correct drivers
 * 4. NEVER removes - only reorganizes and enriches
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  driversDir: path.join(__dirname, '../../drivers'),
  backupDir: path.join(__dirname, '../../data/reorganization-backup'),
  reportFile: path.join(__dirname, '../../data/reorganization-report.json'),
  dryRun: process.argv.includes('--dry-run'),
  apply: process.argv.includes('--apply')
};

// Classification rules - Product IDs to Driver mapping
// Updated: 2025-12-02 - All driver names are UNBRANDED (no product numbers)
const PRODUCT_RULES = {
  // ============ SWITCHES ============
  'TS0001': 'switch_1gang',
  'TS0011': 'switch_1gang',
  'TS0002': 'switch_2gang',
  'TS0012': 'switch_2gang',
  'TS0003': 'switch_3gang',
  'TS0013': 'switch_3gang',
  'TS0004': 'switch_4gang',
  'TS0014': 'switch_4gang',
  'TS0005': 'switch_wall_5gang',
  'TS0006': 'switch_wall_6gang',

  // ============ BUTTONS/REMOTES ============
  'TS0041': 'button_wireless_1',
  'TS0042': 'button_wireless_2',
  'TS0043': 'button_wireless_3',
  'TS0044': 'button_wireless_4',

  // ============ PLUGS ============
  'TS011F': 'plug_smart',
  'TS0121': 'plug_smart',
  'SP-EUC01': 'plug_smart',
  'S31ZB': 'plug_smart',

  // ============ SENSORS ============
  'TS0201': 'climate_sensor',
  'TS0202': 'motion_sensor',
  'TS0203': 'contact_sensor',
  'TS0205': 'smoke_detector_advanced',
  'TS0207': 'water_leak_sensor',
  'TS0210': 'vibration_sensor',

  // ============ COVERS ============
  'TS130F': 'curtain_motor',
  'TS0302': 'curtain_motor',

  // ============ DIMMERS ============
  'TS0101': 'dimmer_wall_1gang',
  'TS110F': 'dimmer_wall_1gang',
  'TS110E': 'dimmer_wall_1gang',
  'TS1101': 'dimmer_dual_channel',

  // ============ LIGHTS ============
  'TS0501A': 'bulb_dimmable',
  'TS0501B': 'bulb_dimmable',
  'TS0502A': 'bulb_tunable_white',
  'TS0502B': 'bulb_tunable_white',
  'TS0503A': 'bulb_rgb',
  'TS0503B': 'bulb_rgb',
  'TS0504A': 'bulb_rgbw',
  'TS0504B': 'led_strip_rgbw',
  'TS0505A': 'bulb_rgbw',
  'TS0505B': 'bulb_rgbw',

  // ============ THERMOSTATS ============
  // Note: TS0601 depends on manufacturer - see TS0601_PATTERNS
  'BHT-002': 'thermostat_tuya_dp',
  'BRT-100': 'thermostat_tuya_dp',
  'SEA801': 'thermostat_tuya_dp',
  'ME167': 'thermostat_tuya_dp',

  // ============ VALVES ============
  'TS0001-valve': 'valve_single',

  // ============ SONOFF/SHELLY ============
  'BASICZBR3': 'switch_1gang',
  'ZBMINI': 'switch_1gang',
  'ZBMINIL2': 'switch_1gang',
  'SHSW-1': 'switch_1gang',
  'Shelly1': 'switch_1gang',

  // ============ AIR QUALITY ============
  'TS0601-air': 'air_quality_comprehensive'
};

// Manufacturer patterns for TS0601 disambiguation
const TS0601_PATTERNS = {
  curtain: ['_TZE200_cowvfni3', '_TZE200_wmcdj3aq', '_TZE200_fctwhugx', '_TZE200_zpzndjez', '_TZE200_nogaemzt', '_TZE200_5zbp6j0u', '_TZE200_fdtjuw7u', '_TZE200_r0jdjrvi', '_TZE200_gubdgai2', '_TZE200_y5pvvau', '_TZE200_pw7mji0l'],
  thermostat: ['_TZE200_aoclfnxz', '_TZE200_2ekuz3dz', '_TZE200_b6wax7g0', '_TZE200_c88teujp', '_TZE200_cwbvmsar', '_TZE200_chyvmhay', '_TZE200_d0ypnbvn', '_TZE200_dv8abrrz', '_TZE200_dzuqwsyg'],
  presence: ['_TZE200_3towulqd', '_TZE200_ztc6ggyl', '_TZE200_ikvncluo', '_TZE200_lyetpprm', '_TZE200_wukb7rhc', '_TZE200_jva8ink8', '_TZE200_mrf6vtua', '_TZE200_holel4dk'],
  air_quality: ['_TZE200_dwcarsat', '_TZE200_ryfmq5rl', '_TZE200_yvx5lh6k', '_TZE200_8ygsuhe1']
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

/**
 * Load all drivers
 */
function loadAllDrivers() {
  const drivers = {};

  const driverDirs = fs.readdirSync(CONFIG.driversDir);

  for (const driverName of driverDirs) {
    const composePath = path.join(CONFIG.driversDir, driverName, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const content = fs.readFileSync(composePath, 'utf-8');
        const data = JSON.parse(content);

        drivers[driverName] = {
          path: composePath,
          originalContent: content,
          data: data,
          productIds: data.zigbee?.productId || [],
          manufacturerNames: data.zigbee?.manufacturerName || []
        };
      } catch (e) {
        console.log(`   ⚠️ Error loading ${driverName}: ${e.message}`);
      }
    }
  }

  console.log(`📂 Loaded ${Object.keys(drivers).length} drivers`);
  return drivers;
}

/**
 * Get correct driver for a TS0601 based on manufacturer
 */
function getTS0601Driver(manufacturerName) {
  const mfr = manufacturerName.toLowerCase();

  for (const [category, patterns] of Object.entries(TS0601_PATTERNS)) {
    for (const pattern of patterns) {
      if (mfr === pattern.toLowerCase()) {
        switch (category) {
          case 'curtain': return 'curtain_motor';
          case 'thermostat': return 'thermostat_tuya_dp';
          case 'presence': return 'presence_sensor_radar';
          case 'air_quality': return 'air_quality_comprehensive';
        }
      }
    }
  }

  return null; // Keep in current driver
}

/**
 * Get correct driver for a product ID
 */
function getCorrectDriver(productId, manufacturerName = '') {
  const prod = productId.toUpperCase();

  // Direct mapping
  if (PRODUCT_RULES[prod]) {
    return PRODUCT_RULES[prod];
  }

  // TS0601 needs manufacturer disambiguation
  if (prod === 'TS0601' && manufacturerName) {
    return getTS0601Driver(manufacturerName);
  }

  // Pattern matching for partial matches
  if (prod.startsWith('TS000')) {
    const gangNum = parseInt(prod.charAt(5));
    if (gangNum >= 1 && gangNum <= 4) {
      return `switch_${gangNum}gang`;
    }
  }

  if (prod.startsWith('TS001')) {
    const gangNum = parseInt(prod.charAt(5));
    if (gangNum >= 1 && gangNum <= 4) {
      return `switch_${gangNum}gang`;
    }
  }

  if (prod.startsWith('TS004')) {
    const buttonNum = parseInt(prod.charAt(5));
    if (buttonNum >= 1 && buttonNum <= 4) {
      return `button_wireless_${buttonNum}`;
    }
  }

  return null; // Unknown - keep in place
}

/**
 * Analyze misplacements
 */
function analyzeDrivers(drivers) {
  const analysis = {
    totalProductIds: 0,
    totalManufacturerIds: 0,
    misplacedProducts: [],
    moves: {} // { fromDriver: { toDriver: [ids] } }
  };

  for (const [driverName, driver] of Object.entries(drivers)) {
    // Check product IDs
    for (const productId of driver.productIds) {
      analysis.totalProductIds++;

      const correctDriver = getCorrectDriver(productId);

      if (correctDriver && correctDriver !== driverName) {
        analysis.misplacedProducts.push({
          id: productId,
          type: 'productId',
          currentDriver: driverName,
          correctDriver: correctDriver
        });

        // Track move
        if (!analysis.moves[driverName]) {
          analysis.moves[driverName] = {};
        }
        if (!analysis.moves[driverName][correctDriver]) {
          analysis.moves[driverName][correctDriver] = { productIds: [], manufacturerNames: [] };
        }
        analysis.moves[driverName][correctDriver].productIds.push(productId);
      }
    }

    // Count manufacturer IDs
    analysis.totalManufacturerIds += driver.manufacturerNames.length;
  }

  return analysis;
}

/**
 * Apply reorganization
 */
function applyReorganization(drivers, analysis) {
  if (Object.keys(analysis.moves).length === 0) {
    console.log('✅ No reorganization needed!');
    return { moved: 0 };
  }

  console.log('\n🔄 Applying reorganization...\n');

  const stats = { moved: 0 };
  const modifiedDrivers = new Set();

  for (const [fromDriver, targets] of Object.entries(analysis.moves)) {
    for (const [toDriver, ids] of Object.entries(targets)) {
      // Check if target driver exists
      if (!drivers[toDriver]) {
        console.log(`   ⚠️ Target driver "${toDriver}" doesn't exist - skipping`);
        continue;
      }

      console.log(`\n📦 ${fromDriver} → ${toDriver}:`);

      // Move product IDs
      for (const productId of ids.productIds) {
        // Remove from source
        const sourceIdx = drivers[fromDriver].data.zigbee.productId.indexOf(productId);
        if (sourceIdx !== -1) {
          drivers[fromDriver].data.zigbee.productId.splice(sourceIdx, 1);
          modifiedDrivers.add(fromDriver);
        }

        // Add to target (if not already there)
        if (!drivers[toDriver].data.zigbee.productId.includes(productId)) {
          drivers[toDriver].data.zigbee.productId.push(productId);
          modifiedDrivers.add(toDriver);
          stats.moved++;
          console.log(`   ✓ ${productId}`);
        }
      }
    }
  }

  // Save modified drivers
  if (CONFIG.apply && !CONFIG.dryRun) {
    console.log('\n💾 Saving changes...');

    for (const driverName of modifiedDrivers) {
      const driver = drivers[driverName];

      // Backup
      const backupPath = path.join(CONFIG.backupDir, `${driverName}_${Date.now()}.json`);
      fs.writeFileSync(backupPath, driver.originalContent);

      // Sort arrays for consistency
      driver.data.zigbee.productId.sort();
      if (driver.data.zigbee.manufacturerName) {
        driver.data.zigbee.manufacturerName.sort();
      }

      // Save
      fs.writeFileSync(driver.path, JSON.stringify(driver.data, null, 2));
      console.log(`   💾 ${driverName}`);
    }
  }

  return stats;
}

/**
 * Generate summary report
 */
function generateReport(drivers, analysis, stats) {
  // Count totals
  let totalProductIds = 0;
  let totalManufacturerIds = 0;

  for (const driver of Object.values(drivers)) {
    totalProductIds += driver.productIds.length;
    totalManufacturerIds += driver.manufacturerNames.length;
  }

  const report = {
    timestamp: new Date().toISOString(),
    totals: {
      drivers: Object.keys(drivers).length,
      productIds: totalProductIds,
      manufacturerIds: totalManufacturerIds,
      misplaced: analysis.misplacedProducts.length,
      moved: stats.moved
    },
    misplacedDetails: analysis.misplacedProducts,
    driverSummary: {}
  };

  // Per-driver summary
  for (const [name, driver] of Object.entries(drivers)) {
    report.driverSummary[name] = {
      productIds: driver.productIds.length,
      manufacturerIds: driver.manufacturerNames.length
    };
  }

  fs.writeFileSync(CONFIG.reportFile, JSON.stringify(report, null, 2));

  return report;
}

/**
 * Main
 */
function main() {
  console.log('🔄 REORGANIZE DRIVERS V2');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toISOString()}`);

  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE\n');
  } else if (!CONFIG.apply) {
    console.log('ℹ️  Analysis only. Use --apply to make changes.\n');
  }

  // Load drivers
  const drivers = loadAllDrivers();

  // Analyze
  console.log('\n🔍 Analyzing...');
  const analysis = analyzeDrivers(drivers);

  // Summary
  console.log('\n📊 Analysis Summary:');
  console.log(`   Total Product IDs: ${analysis.totalProductIds}`);
  console.log(`   Total Manufacturer IDs: ${analysis.totalManufacturerIds}`);
  console.log(`   Misplaced Product IDs: ${analysis.misplacedProducts.length}`);

  // Show misplacements
  if (analysis.misplacedProducts.length > 0) {
    console.log('\n🔀 Misplaced IDs:');

    // Group by current driver
    const byDriver = {};
    for (const item of analysis.misplacedProducts) {
      if (!byDriver[item.currentDriver]) {
        byDriver[item.currentDriver] = [];
      }
      byDriver[item.currentDriver].push(item);
    }

    for (const [driver, items] of Object.entries(byDriver)) {
      console.log(`\n   📂 ${driver}:`);
      for (const item of items.slice(0, 10)) {
        console.log(`      ${item.id} → ${item.correctDriver}`);
      }
      if (items.length > 10) {
        console.log(`      ... +${items.length - 10} more`);
      }
    }
  }

  // Apply if requested
  const stats = applyReorganization(drivers, analysis);

  // Generate report
  const report = generateReport(drivers, analysis, stats);

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Drivers: ${report.totals.drivers}`);
  console.log(`   Product IDs: ${report.totals.productIds}`);
  console.log(`   Manufacturer IDs: ${report.totals.manufacturerIds}`);
  console.log(`   Moved: ${stats.moved}`);
  console.log(`\n📄 Report: ${CONFIG.reportFile}`);

  if (!CONFIG.apply && analysis.misplacedProducts.length > 0) {
    console.log('\n💡 Run with --apply to make changes');
  }
}

// Run
main();
