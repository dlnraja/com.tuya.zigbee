#!/usr/bin/env node
/**
 * 🔍 Zigbee2MQTT Tuya DP Parser
 *
 * Parses zigbee-herdsman-converters to extract:
 * - Tuya device definitions
 * - DP mappings (tuyaDatapoints)
 * - Exposes (capabilities)
 * - ZCL cluster mappings
 *
 * Output: CSV + JSON for enrichment pipeline
 *
 * Usage:
 *   node scripts/enrichment/parse-z2m-tuya-dps.js
 *
 * Prerequisites:
 *   Clone zigbee-herdsman-converters in parent directory or set Z2M_CONVERTERS_PATH
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  z2mPath: process.env.Z2M_CONVERTERS_PATH || path.join(__dirname, '../../external/zigbee-herdsman-converters'),
  outputDir: path.join(__dirname, '../../data/z2m-enrichment'),
  outputJson: 'tuya-dp-mappings.json',
  outputCsv: 'tuya-dp-mappings.csv'
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main entry point
 */
async function main() {
  console.log('🔍 Zigbee2MQTT Tuya DP Parser');
  console.log('='.repeat(50));

  // Check if Z2M converters exist
  if (!fs.existsSync(CONFIG.z2mPath)) {
    console.log('\n⚠️  zigbee-herdsman-converters not found at:', CONFIG.z2mPath);
    console.log('\nTo use this script:');
    console.log('  1. Clone the repository:');
    console.log('     git clone https://github.com/Koenkk/zigbee-herdsman-converters.git external/zigbee-herdsman-converters');
    console.log('  2. Or set Z2M_CONVERTERS_PATH environment variable');
    console.log('\nGenerating sample output structure instead...\n');

    generateSampleOutput();
    return;
  }

  // Parse devices
  const devices = await parseZ2MDevices();

  // Extract DP mappings
  const dpMappings = extractDPMappings(devices);

  // Generate outputs
  generateOutputs(dpMappings);

  console.log('\n✅ Done!');
}

/**
 * Parse Z2M device files
 */
async function parseZ2MDevices() {
  const devicesDir = path.join(CONFIG.z2mPath, 'src/devices');
  const devices = [];

  console.log('\n📂 Scanning:', devicesDir);

  if (!fs.existsSync(devicesDir)) {
    console.log('   ❌ Directory not found');
    return devices;
  }

  const files = fs.readdirSync(devicesDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  console.log(`   Found ${files.length} device files`);

  // Focus on Tuya files
  const tuyaFiles = files.filter(f => f.toLowerCase().includes('tuya'));
  console.log(`   Tuya-specific files: ${tuyaFiles.length}`);

  for (const file of tuyaFiles) {
    const filePath = path.join(devicesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract device definitions using regex
    // Looking for patterns like: { zigbeeModel: [...], model: '...', vendor: '...', ... }
    const deviceMatches = extractDeviceDefinitions(content, file);
    devices.push(...deviceMatches);
  }

  console.log(`\n📊 Total Tuya devices found: ${devices.length}`);
  return devices;
}

/**
 * Extract device definitions from file content
 */
function extractDeviceDefinitions(content, fileName) {
  const devices = [];

  // Pattern 1: tuyaDatapoints array
  const dpPattern = /tuyaDatapoints\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
  let match;

  while ((match = dpPattern.exec(content)) !== null) {
    const dpBlock = match[1];
    const dps = parseTuyaDatapoints(dpBlock);
    if (dps.length > 0) {
      devices.push({
        source: fileName,
        datapoints: dps
      });
    }
  }

  // Pattern 2: Individual DP definitions
  // [dpNum, 'type', 'capability', converter]
  const singleDpPattern = /\[\s*(\d+)\s*,\s*['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g;

  while ((match = singleDpPattern.exec(content)) !== null) {
    const dp = {
      dp: parseInt(match[1]),
      type: match[2],
      expose: match[3]
    };

    // Check if this DP is already in a device
    let found = false;
    for (const device of devices) {
      if (device.datapoints.some(d => d.dp === dp.dp)) {
        found = true;
        break;
      }
    }

    if (!found) {
      devices.push({
        source: fileName,
        datapoints: [dp]
      });
    }
  }

  return devices;
}

/**
 * Parse tuyaDatapoints array content
 */
function parseTuyaDatapoints(content) {
  const dps = [];

  // Match individual DP entries: [dpNum, 'type', 'capability', ...]
  const entryPattern = /\[\s*(\d+)\s*,\s*['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = entryPattern.exec(content)) !== null) {
    dps.push({
      dp: parseInt(match[1]),
      type: match[2],
      expose: match[3]
    });
  }

  return dps;
}

/**
 * Extract and consolidate DP mappings
 */
function extractDPMappings(devices) {
  const dpMap = new Map();

  for (const device of devices) {
    for (const dp of device.datapoints) {
      const key = `${dp.dp}-${dp.type}-${dp.expose}`;

      if (!dpMap.has(key)) {
        dpMap.set(key, {
          dp: dp.dp,
          type: dp.type,
          expose: dp.expose,
          sources: [device.source],
          count: 1
        });
      } else {
        const existing = dpMap.get(key);
        if (!existing.sources.includes(device.source)) {
          existing.sources.push(device.source);
        }
        existing.count++;
      }
    }
  }

  // Sort by DP number
  return Array.from(dpMap.values()).sort((a, b) => a.dp - b.dp);
}

/**
 * Generate output files
 */
function generateOutputs(dpMappings) {
  // JSON output
  const jsonOutput = {
    _meta: {
      generated: new Date().toISOString(),
      source: 'zigbee-herdsman-converters',
      totalMappings: dpMappings.length
    },
    mappings: dpMappings
  };

  const jsonPath = path.join(CONFIG.outputDir, CONFIG.outputJson);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n📄 JSON output: ${jsonPath}`);

  // CSV output
  const csvHeader = 'dp,type,expose,count,sources\n';
  const csvRows = dpMappings.map(m =>
    `${m.dp},${m.type},${m.expose},${m.count},"${m.sources.join(';')}"`
  ).join('\n');

  const csvPath = path.join(CONFIG.outputDir, CONFIG.outputCsv);
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`📄 CSV output: ${csvPath}`);
}

/**
 * Generate sample output when Z2M not available
 */
function generateSampleOutput() {
  const sampleMappings = [
    { dp: 1, type: 'Bool', expose: 'state', count: 150, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 2, type: 'Enum', expose: 'cover_state', count: 45, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 3, type: 'Value', expose: 'cover_position', count: 40, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 4, type: 'Value', expose: 'target_temperature', count: 30, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 10, type: 'Value', expose: 'battery', count: 80, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 13, type: 'Bool', expose: 'child_lock', count: 25, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 101, type: 'Value', expose: 'temperature', count: 60, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 102, type: 'Value', expose: 'humidity', count: 55, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 103, type: 'Value', expose: 'pressure', count: 10, sources: ['tuya.ts'], confidence: 'heuristic' },
    { dp: 108, type: 'Bool', expose: 'child_lock', count: 15, sources: ['tuya.ts'], confidence: 'community' },
    { dp: 114, type: 'Value', expose: 'co2', count: 8, sources: ['tuya.ts'], confidence: 'heuristic' },
    { dp: 115, type: 'Value', expose: 'pm25', count: 5, sources: ['tuya.ts'], confidence: 'heuristic' },
    { dp: 117, type: 'Value', expose: 'voc', count: 5, sources: ['tuya.ts'], confidence: 'heuristic' }
  ];

  const jsonOutput = {
    _meta: {
      generated: new Date().toISOString(),
      source: 'SAMPLE - zigbee-herdsman-converters not found',
      note: 'Clone Z2M converters to get real data',
      totalMappings: sampleMappings.length
    },
    mappings: sampleMappings
  };

  const jsonPath = path.join(CONFIG.outputDir, CONFIG.outputJson);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`📄 Sample JSON output: ${jsonPath}`);

  // CSV
  const csvHeader = 'dp,type,expose,count,sources,confidence\n';
  const csvRows = sampleMappings.map(m =>
    `${m.dp},${m.type},${m.expose},${m.count},"${m.sources.join(';')}",${m.confidence}`
  ).join('\n');

  const csvPath = path.join(CONFIG.outputDir, CONFIG.outputCsv);
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`📄 Sample CSV output: ${csvPath}`);

  console.log('\n💡 To get real data:');
  console.log('   git clone https://github.com/Koenkk/zigbee-herdsman-converters.git external/zigbee-herdsman-converters');
  console.log('   node scripts/enrichment/parse-z2m-tuya-dps.js');
}

// Run
main().catch(console.error);
