#!/usr/bin/env node
/**
 * Z2M Enrichment Analyzer for Universal Tuya Zigbee
 * Analyzes Zigbee2MQTT, Blakadder, and ZHA sources to enrich the Homey app
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SOURCES = {
  Z2M_TUYA: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
  BLAKADDER: 'https://templates.blakadder.com/assets/device_db.json',
  ZHA_TUYA: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py'
};

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

// Extract manufacturerNames from local drivers
function getLocalManufacturerNames() {
  const manufacturers = new Set();
  const drivers = fs.readdirSync(DRIVERS_PATH);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.zigbee?.manufacturerName) {
          compose.zigbee.manufacturerName.forEach(m => manufacturers.add(m));
        }
      } catch (e) {
        console.error(`Error reading ${composePath}: ${e.message}`);
      }
    }
  }

  return manufacturers;
}

// Fetch URL content
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse Z2M tuya.ts for fingerprints
function parseZ2MFingerprints(content) {
  const fingerprints = [];

  // Match tuya.fingerprint patterns
  const fingerprintRegex = /tuya\.fingerprint\(['"](TS\w+)['"]\s*,\s*\[([^\]]+)\]/g;
  let match;

  while ((match = fingerprintRegex.exec(content)) !== null) {
    const productId = match[1];
    const manufacturerNames = match[2]
      .split(',')
      .map(s => s.trim().replace(/['"]/g, ''))
      .filter(s => s.startsWith('_T'));

    fingerprints.push({ productId, manufacturerNames });
  }

  // Match zigbeeModel patterns
  const zigbeeModelRegex = /zigbeeModel:\s*\[['"](TS\w+)['"]\]/g;
  while ((match = zigbeeModelRegex.exec(content)) !== null) {
    fingerprints.push({ productId: match[1], manufacturerNames: [] });
  }

  // Match manufacturerName patterns
  const mfrRegex = /manufacturerName:\s*['"](_T[^'"]+)['"]/g;
  while ((match = mfrRegex.exec(content)) !== null) {
    fingerprints.push({ productId: null, manufacturerNames: [match[1]] });
  }

  return fingerprints;
}

// Parse tuyaDatapoints for DP mappings
function parseZ2MDatapoints(content) {
  const dpMappings = [];

  const dpRegex = /\[(\d+),\s*['"]([^'"]+)['"]\s*,\s*tuya\.valueConverter\.(\w+)\]/g;
  let match;

  while ((match = dpRegex.exec(content)) !== null) {
    dpMappings.push({
      dp: parseInt(match[1]),
      name: match[2],
      converter: match[3]
    });
  }

  return dpMappings;
}

// Main analysis function
async function analyze() {
  console.log('🔍 Z2M Enrichment Analyzer for Universal Tuya Zigbee\n');
  console.log('=' .repeat(60));

  // Get local manufacturers
  console.log('\n📦 Analyzing local drivers...');
  const localMfrs = getLocalManufacturerNames();
  console.log(`   Found ${localMfrs.size} unique manufacturerNames locally`);

  // Fetch and parse Z2M
  console.log('\n🌐 Fetching Zigbee2MQTT tuya.ts...');
  try {
    const z2mContent = await fetchUrl(SOURCES.Z2M_TUYA);
    console.log(`   Fetched ${(z2mContent.length / 1024).toFixed(0)} KB`);

    const z2mFingerprints = parseZ2MFingerprints(z2mContent);
    const z2mMfrs = new Set();
    z2mFingerprints.forEach(fp => fp.manufacturerNames.forEach(m => z2mMfrs.add(m)));

    console.log(`   Found ${z2mMfrs.size} unique manufacturerNames in Z2M`);

    // Find missing manufacturers
    const missingMfrs = [...z2mMfrs].filter(m => !localMfrs.has(m));
    console.log(`\n⚠️  Missing manufacturerNames: ${missingMfrs.length}`);

    if (missingMfrs.length > 0) {
      // Group by prefix
      const grouped = {};
      missingMfrs.forEach(m => {
        const prefix = m.substring(0, 7);
        if (!grouped[prefix]) grouped[prefix] = [];
        grouped[prefix].push(m);
      });

      console.log('\n   Missing by prefix:');
      Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10)
        .forEach(([prefix, mfrs]) => {
          console.log(`   ${prefix}: ${mfrs.length} devices`);
        });

      // Save missing to file
      const outputPath = path.join(__dirname, 'z2m-missing-manufacturers.json');
      fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        localCount: localMfrs.size,
        z2mCount: z2mMfrs.size,
        missingCount: missingMfrs.length,
        missing: missingMfrs.sort()
      }, null, 2));
      console.log(`\n   ✅ Saved missing list to ${outputPath}`);
    }

    // Parse DP mappings
    const dpMappings = parseZ2MDatapoints(z2mContent);
    console.log(`\n📊 Found ${dpMappings.length} DP mappings in Z2M`);

    // Save DP mappings
    const dpOutputPath = path.join(__dirname, 'z2m-dp-mappings.json');
    const uniqueDPs = {};
    dpMappings.forEach(dp => {
      if (!uniqueDPs[dp.dp]) uniqueDPs[dp.dp] = [];
      if (!uniqueDPs[dp.dp].includes(dp.name)) {
        uniqueDPs[dp.dp].push(dp.name);
      }
    });
    fs.writeFileSync(dpOutputPath, JSON.stringify(uniqueDPs, null, 2));
    console.log(`   ✅ Saved DP mappings to ${dpOutputPath}`);

  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!\n');
}

analyze().catch(console.error);
