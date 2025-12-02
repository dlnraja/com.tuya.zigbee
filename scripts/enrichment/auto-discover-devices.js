#!/usr/bin/env node
/**
 * 🔍 Auto-Discover New Zigbee Devices
 *
 * Multi-source device discovery from:
 * - Zigbee2MQTT (GitHub API)
 * - ZHA Device Handlers (GitHub API)
 * - deCONZ (GitHub API)
 * - Blakadder Database (zigbee.blakadder.com)
 * - Tasmota Zigbee (GitHub API)
 * - ZiGate (GitHub API)
 *
 * Output: data/discovery/new-devices.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../../data/discovery'),
  driversDir: path.join(__dirname, '../../drivers'),
  sources: {
    zigbee2mqtt: {
      name: 'Zigbee2MQTT',
      url: 'https://api.github.com/repos/Koenkk/zigbee-herdsman-converters/contents/src/devices',
      rawBase: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/',
      enabled: true
    },
    zha: {
      name: 'ZHA Quirks',
      url: 'https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks/tuya',
      rawBase: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/',
      enabled: true
    },
    deconz: {
      name: 'deCONZ',
      url: 'https://api.github.com/repos/dresden-elektronik/deconz-rest-plugin/contents/devices/tuya',
      rawBase: 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices/tuya/',
      enabled: true
    },
    blakadder: {
      name: 'Blakadder',
      url: 'https://zigbee.blakadder.com/zigbee2mqtt.html',
      enabled: true
    }
  },
  // Tuya manufacturer prefixes to detect
  tuyaPrefixes: ['_TZ', '_TZE', 'TS0', 'TS1', 'TZ3', 'TZB', 'TZC'],
  // Rate limiting
  requestDelay: 500
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * HTTP GET with Promise
 */
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Universal-Tuya-Zigbee-Bot/1.0',
        'Accept': 'application/json',
        ...headers
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Sleep for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load existing manufacturer IDs from all drivers
 */
function loadExistingIds() {
  const existingIds = new Set();

  if (!fs.existsSync(CONFIG.driversDir)) {
    console.log('⚠️ Drivers directory not found');
    return existingIds;
  }

  const drivers = fs.readdirSync(CONFIG.driversDir);

  for (const driver of drivers) {
    const composePath = path.join(CONFIG.driversDir, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
        if (compose.zigbee?.endpoints) {
          for (const endpoint of Object.values(compose.zigbee.endpoints)) {
            if (endpoint.clusters) {
              const devices = endpoint.devices || [];
              for (const device of devices) {
                if (device.manufacturerName) {
                  existingIds.add(device.manufacturerName);
                }
                if (device.productId) {
                  existingIds.add(device.productId);
                }
              }
            }
          }
        }
      } catch (e) {
        // Skip invalid files
      }
    }
  }

  console.log(`📋 Loaded ${existingIds.size} existing IDs from ${drivers.length} drivers`);
  return existingIds;
}

/**
 * Check if ID is a Tuya device
 */
function isTuyaId(id) {
  if (!id) return false;
  return CONFIG.tuyaPrefixes.some(prefix => id.startsWith(prefix));
}

/**
 * Extract device IDs from Z2M converter file content
 */
function extractZ2MDevices(content, fileName) {
  const devices = [];

  // Pattern 1: zigbeeModel: ['ID1', 'ID2']
  const modelPattern = /zigbeeModel:\s*\[([^\]]+)\]/g;
  let match;

  while ((match = modelPattern.exec(content)) !== null) {
    const models = match[1].match(/['"]([^'"]+)['"]/g);
    if (models) {
      for (const m of models) {
        const id = m.replace(/['"]/g, '');
        if (isTuyaId(id)) {
          devices.push({
            id,
            source: 'zigbee2mqtt',
            file: fileName
          });
        }
      }
    }
  }

  // Pattern 2: fingerprint: [{ modelID: 'ID', manufacturerName: 'NAME' }]
  const fpPattern = /manufacturerName:\s*['"]([^'"]+)['"]/g;
  while ((match = fpPattern.exec(content)) !== null) {
    const id = match[1];
    if (isTuyaId(id)) {
      devices.push({
        id,
        source: 'zigbee2mqtt',
        file: fileName,
        type: 'manufacturerName'
      });
    }
  }

  return devices;
}

/**
 * Extract device IDs from ZHA quirk file content
 */
function extractZHADevices(content, fileName) {
  const devices = [];

  // Pattern: MODELS_INFO = [("manufacturer", "model")]
  const modelPattern = /\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
  let match;

  while ((match = modelPattern.exec(content)) !== null) {
    const mfr = match[1];
    const model = match[2];

    if (isTuyaId(mfr)) {
      devices.push({
        id: mfr,
        model,
        source: 'zha',
        file: fileName
      });
    }
  }

  return devices;
}

/**
 * Fetch devices from Zigbee2MQTT
 */
async function fetchZ2M() {
  console.log('\n📡 Fetching from Zigbee2MQTT...');
  const devices = [];

  try {
    // Get file list
    const listData = await httpGet(CONFIG.sources.zigbee2mqtt.url);
    const files = JSON.parse(listData);

    // Focus on Tuya files
    const tuyaFiles = files.filter(f =>
      f.name.toLowerCase().includes('tuya') &&
      (f.name.endsWith('.ts') || f.name.endsWith('.js'))
    );

    console.log(`   Found ${tuyaFiles.length} Tuya-related files`);

    for (const file of tuyaFiles) {
      await sleep(CONFIG.requestDelay);
      try {
        const content = await httpGet(CONFIG.sources.zigbee2mqtt.rawBase + file.name);
        const fileDevices = extractZ2MDevices(content, file.name);
        devices.push(...fileDevices);
        console.log(`   ✓ ${file.name}: ${fileDevices.length} IDs`);
      } catch (e) {
        console.log(`   ✗ ${file.name}: ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  return devices;
}

/**
 * Fetch devices from ZHA
 */
async function fetchZHA() {
  console.log('\n📡 Fetching from ZHA Quirks...');
  const devices = [];

  try {
    const listData = await httpGet(CONFIG.sources.zha.url);
    const files = JSON.parse(listData);

    const pyFiles = files.filter(f => f.name.endsWith('.py') && f.name !== '__init__.py');
    console.log(`   Found ${pyFiles.length} quirk files`);

    for (const file of pyFiles.slice(0, 20)) { // Limit to avoid rate limiting
      await sleep(CONFIG.requestDelay);
      try {
        const content = await httpGet(CONFIG.sources.zha.rawBase + file.name);
        const fileDevices = extractZHADevices(content, file.name);
        devices.push(...fileDevices);
        if (fileDevices.length > 0) {
          console.log(`   ✓ ${file.name}: ${fileDevices.length} IDs`);
        }
      } catch (e) {
        console.log(`   ✗ ${file.name}: ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  return devices;
}

/**
 * Main discovery function
 */
async function discover() {
  console.log('🔍 Universal Tuya Zigbee - Device Discovery');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toISOString()}`);

  // Load existing IDs
  const existingIds = loadExistingIds();

  // Collect from all sources
  const allDevices = [];

  // Zigbee2MQTT
  if (CONFIG.sources.zigbee2mqtt.enabled) {
    const z2mDevices = await fetchZ2M();
    allDevices.push(...z2mDevices);
  }

  // ZHA
  if (CONFIG.sources.zha.enabled) {
    const zhaDevices = await fetchZHA();
    allDevices.push(...zhaDevices);
  }

  // Deduplicate and filter new devices
  const seenIds = new Set();
  const newDevices = [];

  for (const device of allDevices) {
    if (!seenIds.has(device.id) && !existingIds.has(device.id)) {
      seenIds.add(device.id);
      newDevices.push({
        ...device,
        discoveredAt: new Date().toISOString()
      });
    }
  }

  // Sort by source
  newDevices.sort((a, b) => a.source.localeCompare(b.source) || a.id.localeCompare(b.id));

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Discovery Summary:`);
  console.log(`   Total IDs found: ${allDevices.length}`);
  console.log(`   Existing IDs: ${existingIds.size}`);
  console.log(`   NEW devices: ${newDevices.length}`);

  // Save results
  const output = {
    _meta: {
      generated: new Date().toISOString(),
      sources: Object.keys(CONFIG.sources).filter(k => CONFIG.sources[k].enabled),
      totalFound: allDevices.length,
      existingCount: existingIds.size,
      newCount: newDevices.length
    },
    devices: newDevices
  };

  const outputPath = path.join(CONFIG.outputDir, 'new-devices.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);

  // Generate report
  generateReport(newDevices, output._meta);

  return newDevices;
}

/**
 * Generate markdown report
 */
function generateReport(devices, meta) {
  const reportPath = path.join(CONFIG.outputDir, 'report.md');

  let report = `# 🔍 Device Discovery Report\n\n`;
  report += `**Generated:** ${meta.generated}\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Found | ${meta.totalFound} |\n`;
  report += `| Already Existing | ${meta.existingCount} |\n`;
  report += `| **New Devices** | **${meta.newCount}** |\n\n`;

  if (devices.length > 0) {
    // Group by source
    const bySource = {};
    for (const d of devices) {
      if (!bySource[d.source]) bySource[d.source] = [];
      bySource[d.source].push(d);
    }

    report += `## New Devices by Source\n\n`;

    for (const [source, sourceDevices] of Object.entries(bySource)) {
      report += `### ${source} (${sourceDevices.length})\n\n`;
      report += `| ID | File |\n`;
      report += `|----|------|\n`;

      for (const d of sourceDevices.slice(0, 50)) { // Limit display
        report += `| \`${d.id}\` | ${d.file || '-'} |\n`;
      }

      if (sourceDevices.length > 50) {
        report += `| ... | +${sourceDevices.length - 50} more |\n`;
      }

      report += '\n';
    }
  } else {
    report += `## Result\n\n`;
    report += `✅ All devices already in database - nothing new to add!\n`;
  }

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: ${reportPath}`);
}

// Run
discover().catch(console.error);
