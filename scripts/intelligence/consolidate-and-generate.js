#!/usr/bin/env node
/**
 * CONSOLIDATE & AUTO-GENERATE DRIVERS
 * 
 * Consolide toutes les sources:
 * - Zigbee2MQTT extracted data
 * - Blakadder extracted data  
 * - Existing tuya-datapoints-database.js
 * - Existing drivers configurations
 * 
 * Auto-génère:
 * - driver.compose.json complets
 * - device.js avec DPs configurés
 * - Ranges et limites validés
 * - Documentation technique
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data/extracted');
const LIB_DIR = path.join(__dirname, '../../lib');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const OUTPUT_DIR = path.join(__dirname, '../../data/consolidated');

// Create output dir
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔄 CONSOLIDATE & AUTO-GENERATE');
console.log('═════════════════════════════════════\n');

/**
 * Load all extracted data
 */
function loadExtractedData() {
  const data = {
    z2m: null,
    blakadder: null,
    existing: null
  };
  
  // Load Z2M
  const z2mPath = path.join(DATA_DIR, 'zigbee2mqtt-extracted.json');
  if (fs.existsSync(z2mPath)) {
    data.z2m = JSON.parse(fs.readFileSync(z2mPath, 'utf8'));
    console.log(`✅ Loaded ${data.z2m.devices.length} devices from Z2M`);
  } else {
    console.log('⚠️  No Z2M data found');
  }
  
  // Load Blakadder
  const blakadderPath = path.join(DATA_DIR, 'blakadder-extracted.json');
  if (fs.existsSync(blakadderPath)) {
    data.blakadder = JSON.parse(fs.readFileSync(blakadderPath, 'utf8'));
    console.log(`✅ Loaded ${data.blakadder.devices.length} devices from Blakadder`);
  } else {
    console.log('⚠️  No Blakadder data found');
  }
  
  // Load existing DataPoints database
  const existingPath = path.join(__dirname, '../../utils/parsers/tuya-datapoints-database.js');
  if (fs.existsSync(existingPath)) {
    try {
      data.existing = require(existingPath);
      const dpCount = Object.values(data.existing).reduce((sum, category) => {
        return sum + Object.keys(category).length;
      }, 0);
      console.log(`✅ Loaded ${dpCount} existing DataPoints`);
    } catch (err) {
      console.log('⚠️  Failed to load existing DataPoints:', err.message);
    }
  }
  
  console.log();
  return data;
}

/**
 * Merge device info from multiple sources
 */
function mergeDeviceInfo(model) {
  const merged = {
    model: model,
    sources: [],
    capabilities: new Set(),
    datapoints: {},
    manufacturerIds: new Set(),
    features: [],
    ranges: {},
    notes: []
  };
  
  // TODO: Implement smart merging logic
  // Priority: Z2M > Blakadder > Existing
  
  return merged;
}

/**
 * Consolidate DataPoints from all sources
 */
function consolidateDataPoints(sources) {
  console.log('📊 Consolidating DataPoints...\n');
  
  const consolidated = {};
  const stats = {
    total: 0,
    bySource: {},
    byCapability: {},
    conflicts: []
  };
  
  // Start with existing DataPoints
  if (sources.existing) {
    for (const [category, dps] of Object.entries(sources.existing)) {
      if (!consolidated[category]) {
        consolidated[category] = {};
      }
      
      for (const [dp, info] of Object.entries(dps)) {
        consolidated[category][dp] = {
          ...info,
          sources: ['existing'],
          confidence: 'high'
        };
        stats.total++;
        stats.bySource['existing'] = (stats.bySource['existing'] || 0) + 1;
      }
    }
  }
  
  // Add Z2M DataPoints
  if (sources.z2m) {
    for (const device of sources.z2m.devices) {
      if (!device.datapoints) continue;
      
      for (const dp of device.datapoints) {
        const category = determineCategory(device.class);
        if (!consolidated[category]) {
          consolidated[category] = {};
        }
        
        const dpNum = dp.dp.toString();
        
        if (consolidated[category][dpNum]) {
          // Merge with existing
          if (!consolidated[category][dpNum].sources.includes('zigbee2mqtt')) {
            consolidated[category][dpNum].sources.push('zigbee2mqtt');
          }
          
          // Check for conflicts
          if (consolidated[category][dpNum].name !== dp.name) {
            stats.conflicts.push({
              dp: dpNum,
              existing: consolidated[category][dpNum].name,
              z2m: dp.name
            });
          }
        } else {
          // New DataPoint
          consolidated[category][dpNum] = {
            name: dp.name,
            converter: dp.converter,
            sources: ['zigbee2mqtt'],
            confidence: 'medium'
          };
          stats.total++;
          stats.bySource['zigbee2mqtt'] = (stats.bySource['zigbee2mqtt'] || 0) + 1;
        }
      }
    }
  }
  
  // Add Blakadder features
  if (sources.blakadder) {
    for (const device of sources.blakadder.devices) {
      for (const feature of device.features) {
        const cap = feature.capability;
        stats.byCapability[cap] = (stats.byCapability[cap] || 0) + 1;
      }
    }
  }
  
  console.log('📊 Consolidation Stats:');
  console.log(`  Total DataPoints: ${stats.total}`);
  console.log('  By Source:');
  Object.entries(stats.bySource).forEach(([source, count]) => {
    console.log(`    - ${source}: ${count}`);
  });
  console.log(`  Conflicts found: ${stats.conflicts.length}`);
  if (stats.conflicts.length > 0) {
    console.log('  Conflicts:');
    stats.conflicts.slice(0, 5).forEach(c => {
      console.log(`    - DP ${c.dp}: '${c.existing}' vs '${c.z2m}'`);
    });
  }
  console.log();
  
  return { consolidated, stats };
}

/**
 * Determine category from device class
 */
function determineCategory(deviceClass) {
  const mapping = {
    'socket': 'ENERGY',
    'light': 'LIGHTING',
    'sensor': 'SENSORS',
    'thermostat': 'CLIMATE',
    'windowcoverings': 'COVERING',
    'button': 'BUTTONS',
    'lock': 'LOCK_VALVE',
    'other': 'COMMON'
  };
  
  return mapping[deviceClass] || 'COMMON';
}

/**
 * Generate driver configuration
 */
function generateDriverConfig(deviceInfo) {
  // TODO: Implement full driver generation
  return {
    id: deviceInfo.id,
    name: deviceInfo.name,
    class: deviceInfo.class,
    capabilities: Array.from(deviceInfo.capabilities),
    capabilitiesOptions: generateCapabilitiesOptions(deviceInfo),
    energy: deviceInfo.energy,
    zigbee: deviceInfo.zigbee,
    settings: generateSettings(deviceInfo),
    metadata: {
      sources: deviceInfo.sources,
      generated: new Date().toISOString(),
      confidence: calculateConfidence(deviceInfo)
    }
  };
}

/**
 * Generate capability options with ranges/limits
 */
function generateCapabilitiesOptions(deviceInfo) {
  const options = {};
  
  for (const [cap, range] of Object.entries(deviceInfo.ranges || {})) {
    options[cap] = {
      min: range.min,
      max: range.max,
      step: range.step
    };
    
    if (range.unit) {
      options[cap].units = { en: range.unit };
    }
  }
  
  return options;
}

/**
 * Generate settings configuration
 */
function generateSettings(deviceInfo) {
  const settings = [];
  
  // Always add power source setting
  settings.push({
    id: 'power_source',
    type: 'dropdown',
    label: { en: 'Power Source' },
    value: 'auto',
    values: [
      { id: 'auto', label: { en: 'Auto Detect' } },
      { id: 'battery', label: { en: 'Battery' } },
      { id: 'mains', label: { en: 'Mains' } }
    ]
  });
  
  // Add device-specific settings
  if (deviceInfo.features.includes('sensitivity')) {
    settings.push({
      id: 'sensitivity',
      type: 'dropdown',
      label: { en: 'Sensitivity' },
      value: 'medium',
      values: [
        { id: 'low', label: { en: 'Low' } },
        { id: 'medium', label: { en: 'Medium' } },
        { id: 'high', label: { en: 'High' } }
      ]
    });
  }
  
  return settings;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(deviceInfo) {
  let score = 0;
  
  if (deviceInfo.sources.includes('zigbee2mqtt')) score += 40;
  if (deviceInfo.sources.includes('blakadder')) score += 30;
  if (deviceInfo.sources.includes('existing')) score += 20;
  if (deviceInfo.datapoints && Object.keys(deviceInfo.datapoints).length > 0) score += 10;
  
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

/**
 * Save consolidated database
 */
function saveConsolidatedData(consolidated, stats) {
  // Save DataPoints
  const dpPath = path.join(OUTPUT_DIR, 'datapoints-consolidated.json');
  fs.writeFileSync(dpPath, JSON.stringify(consolidated, null, 2));
  console.log(`💾 Saved consolidated DataPoints: ${dpPath}`);
  
  // Save stats
  const statsPath = path.join(OUTPUT_DIR, 'consolidation-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`📊 Saved stats: ${statsPath}`);
  
  // Generate JavaScript module
  const jsContent = `/**
 * CONSOLIDATED TUYA DATAPOINTS DATABASE
 * 
 * Auto-generated from:
 * - Zigbee2MQTT
 * - Blakadder Database
 * - Existing DataPoints
 * 
 * Generated: ${new Date().toISOString()}
 * Total DataPoints: ${stats.total}
 */

module.exports = ${JSON.stringify(consolidated, null, 2)};
`;
  
  const jsPath = path.join(OUTPUT_DIR, 'datapoints-consolidated.js');
  fs.writeFileSync(jsPath, jsContent);
  console.log(`📝 Generated JS module: ${jsPath}`);
}

/**
 * Main process
 */
async function main() {
  console.log('🚀 Starting consolidation...\n');
  
  // Step 1: Load all data
  const sources = loadExtractedData();
  
  // Step 2: Consolidate DataPoints
  const { consolidated, stats } = consolidateDataPoints(sources);
  
  // Step 3: Save results
  saveConsolidatedData(consolidated, stats);
  
  console.log('\n═════════════════════════════════════');
  console.log('✅ Consolidation complete!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('  1. Review consolidated DataPoints');
  console.log('  2. Resolve any conflicts manually');
  console.log('  3. Generate drivers with: npm run generate:drivers');
}

// Run
main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
