#!/usr/bin/env node
/**
 * 🌐 Fetch Blakadder Zigbee Database
 *
 * Source: https://zigbee.blakadder.com
 *
 * Blakadder aggregates devices compatible with:
 * - ZHA (Home Assistant)
 * - Zigbee2MQTT
 * - deCONZ
 * - Tasmota
 * - ZiGate
 * - ioBroker
 *
 * This script fetches the device index and extracts Tuya devices.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Blakadder uses a JSON index at this endpoint
  indexUrl: 'https://zigbee.blakadder.com/devices.json',
  // Fallback: scrape the main page
  mainUrl: 'https://zigbee.blakadder.com/',
  outputDir: path.join(__dirname, '../../data/blakadder'),
  outputFile: 'blakadder-tuya-devices.json',
  tuyaPrefixes: ['_TZ', '_TZE', 'TS0', 'TS1', 'TZ3', 'Tuya']
};

// Ensure output directory
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * HTTP GET with redirects
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');

    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 Universal-Tuya-Zigbee-Bot/1.0',
        'Accept': 'text/html,application/json'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Extract Tuya devices from Blakadder HTML page
 */
function extractFromHTML(html) {
  const devices = [];

  // Pattern: Look for device links and model IDs
  // Blakadder format: <a href="/TS0001.html">TS0001</a>
  const linkPattern = /<a[^>]*href="\/([^"]+)\.html"[^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const slug = match[1];
    const name = match[2].trim();

    // Check if Tuya device
    const isTuya = CONFIG.tuyaPrefixes.some(prefix =>
      slug.toUpperCase().startsWith(prefix) ||
      name.toUpperCase().includes('TUYA') ||
      name.toUpperCase().includes(prefix)
    );

    if (isTuya) {
      devices.push({
        slug,
        name,
        url: `https://zigbee.blakadder.com/${slug}.html`,
        source: 'blakadder'
      });
    }
  }

  // Also look for table data
  // Pattern: <td>_TZ3000_xxx</td>
  const tdPattern = /<td[^>]*>([^<]*(?:_TZ|TS0|_TZE)[^<]*)<\/td>/gi;

  while ((match = tdPattern.exec(html)) !== null) {
    const id = match[1].trim();
    if (id && !devices.some(d => d.slug === id || d.name === id)) {
      devices.push({
        slug: id,
        name: id,
        source: 'blakadder-table'
      });
    }
  }

  return devices;
}

/**
 * Extract from JSON index (if available)
 */
function extractFromJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    const devices = [];

    // Handle different JSON structures
    if (Array.isArray(data)) {
      for (const item of data) {
        const id = item.model || item.zigbeeModel || item.id;
        const isTuya = CONFIG.tuyaPrefixes.some(prefix =>
          (id && id.toUpperCase().startsWith(prefix)) ||
          (item.vendor && item.vendor.toLowerCase() === 'tuya')
        );

        if (isTuya) {
          devices.push({
            id: id,
            vendor: item.vendor,
            name: item.name || item.description,
            supports: item.supports || [],
            source: 'blakadder-json'
          });
        }
      }
    } else if (data.devices) {
      return extractFromJSON(JSON.stringify(data.devices));
    }

    return devices;
  } catch (e) {
    return [];
  }
}

/**
 * Fetch and parse Blakadder
 */
async function fetchBlakadder() {
  console.log('🌐 Fetching Blakadder Zigbee Database');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toISOString()}\n`);

  let devices = [];

  // Try JSON endpoint first
  console.log('📡 Trying JSON endpoint...');
  try {
    const jsonData = await httpGet(CONFIG.indexUrl);
    devices = extractFromJSON(jsonData);
    console.log(`   ✅ Found ${devices.length} Tuya devices from JSON`);
  } catch (e) {
    console.log(`   ⚠️ JSON endpoint failed: ${e.message}`);
  }

  // If JSON didn't work, try HTML scraping
  if (devices.length === 0) {
    console.log('\n📡 Falling back to HTML scraping...');
    try {
      const html = await httpGet(CONFIG.mainUrl);
      devices = extractFromHTML(html);
      console.log(`   ✅ Found ${devices.length} Tuya devices from HTML`);
    } catch (e) {
      console.log(`   ❌ HTML scraping failed: ${e.message}`);
    }
  }

  // Try known Tuya-specific pages
  const tuyaPages = [
    'https://zigbee.blakadder.com/tuya.html',
    'https://zigbee.blakadder.com/zigbee2mqtt.html'
  ];

  for (const pageUrl of tuyaPages) {
    console.log(`\n📡 Fetching: ${pageUrl}`);
    try {
      const html = await httpGet(pageUrl);
      const pageDevices = extractFromHTML(html);

      // Merge new devices
      for (const device of pageDevices) {
        if (!devices.some(d => d.slug === device.slug || d.id === device.slug)) {
          devices.push(device);
        }
      }
      console.log(`   ✅ Found ${pageDevices.length} devices`);
    } catch (e) {
      console.log(`   ⚠️ Failed: ${e.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueDevices = devices.filter(d => {
    const key = d.id || d.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n📊 Total unique Tuya devices: ${uniqueDevices.length}`);

  // Save results
  const output = {
    _meta: {
      source: 'Blakadder Zigbee Database',
      url: 'https://zigbee.blakadder.com',
      fetched: new Date().toISOString(),
      totalDevices: uniqueDevices.length,
      description: 'Devices compatible with ZHA, Zigbee2MQTT, deCONZ, Tasmota, ZiGate, ioBroker'
    },
    devices: uniqueDevices
  };

  const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);

  // Generate summary
  generateSummary(uniqueDevices);

  return uniqueDevices;
}

/**
 * Generate summary by device type
 */
function generateSummary(devices) {
  const summary = {
    switches: devices.filter(d => /TS000[1-4]|switch/i.test(d.slug || d.id)),
    plugs: devices.filter(d => /TS011|TS012|plug|outlet/i.test(d.slug || d.id)),
    sensors: devices.filter(d => /TS020[0-9]|sensor/i.test(d.slug || d.id)),
    covers: devices.filter(d => /curtain|blind|cover|TS0601/i.test(d.slug || d.id)),
    lights: devices.filter(d => /TS050|light|bulb|led/i.test(d.slug || d.id)),
    thermostats: devices.filter(d => /thermo|trv|BHT|BRT/i.test(d.slug || d.id))
  };

  console.log('\n📈 By Category:');
  for (const [category, items] of Object.entries(summary)) {
    if (items.length > 0) {
      console.log(`   ${category}: ${items.length}`);
    }
  }

  // Save summary
  const summaryPath = path.join(CONFIG.outputDir, 'blakadder-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

// Run
fetchBlakadder().catch(console.error);
