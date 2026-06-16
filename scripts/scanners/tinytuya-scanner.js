#!/usr/bin/env node
/**
 * TinyTuya Scanner
 * Fetches device definitions from jasonacox/tinytuya GitHub repo.
 * Extracts DP type definitions, device categories, and maps to Homey capabilities.
 *
 * Run: node scripts/scanners/tinytuya-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'tinytuya-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'tinytuya';

// ── GitHub API base ──────────────────────────────────────────────────────
const TINYTUYA_API = 'https://api.github.com';
const TINYTUYA_RAW = 'https://raw.githubusercontent.com/jasonacox/tinytuya/main';

// Key directories to scan for device definitions
const SCAN_PATHS = [
  'tinytuya',
  'examples',
];

// ── HTTP helpers ─────────────────────────────────────────────────────────
function githubGet(urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'HomeyTuyaScanner/1.0',
        'Accept': 'application/vnd.github.v3+json',
      },
      timeout: 30000,
    };
    https.get(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve([]); }
      });
    }).on('error', reject);
  });
}

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'HomeyTuyaScanner/1.0' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRaw(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── DP type mapping to Homey capabilities ────────────────────────────────
const DP_TO_CAPABILITY = {
  // Tuya DP IDs commonly found in TinyTuya
  1: 'onoff',           // Switch / Boolean
  2: 'dim',             // Brightness / Dimmer
  3: 'onoff',           // Switch 2
  4: 'onoff',           // Switch 3
  5: 'onoff',           // Switch 4
  6: 'onoff',           // Switch 5
  7: 'onoff',           // Switch 6
  8: 'onoff',           // Switch 7
  9: 'onoff',           // Switch 8
  10: 'measure_temperature',
  11: 'target_temperature',
  12: 'measure_humidity',
  13: 'measure_battery',
  14: 'onoff',
  16: 'onoff',          // Light switch
  17: 'dim',            // Light brightness
  18: 'light_hue',
  19: 'light_saturation',
  20: 'light_mode',
  21: 'measure_power',  // Power consumption
  22: 'measure_voltage',
  23: 'measure_current',
  24: 'meter_power',    // Total energy
  25: 'alarm_motion',
  26: 'alarm_smoke',
  27: 'alarm_co',
  28: 'alarm_gas',
  29: 'alarm_water_leak',
  32: 'onoff',          // Cover control
  33: 'dim',            // Cover position
  34: 'windowcovering_state',
  101: 'measure_temperature',
  102: 'measure_humidity',
  103: 'measure_battery',
  104: 'target_temperature',
  105: 'onoff',
  106: 'measure_power',
  107: 'meter_power',
  110: 'measure_temperature',
  111: 'measure_humidity',
  112: 'measure_battery',
  113: 'measure_luminance',
  116: 'alarm_motion',
  118: 'measure_pm25',
  119: 'measure_co2',
  120: 'measure_voc',
  121: 'measure_aqi',
  122: 'measure_tvoc',
};

// ── TinyTuya DP type definitions ─────────────────────────────────────────
const TINYTUYA_DP_TYPES = {
  'RAW': 'raw',
  'BOOL': 'boolean',
  'STRING': 'string',
  'VALUE': 'integer',
  'ENUM': 'enum',
  'BITMAP': 'bitmap',
};

// ── Parse TinyTuya source for DP mappings ────────────────────────────────
function parseTinyTuyaSource(source, filename) {
  const results = [];

  // Extract DP definitions: dpid=X, datatype=Y, description=Z
  const dpRe = /dpid\s*[=:]\s*(\d+).*?datatype\s*[=:]\s*['"]?(\w+)['"]?.*?(?:description\s*[=:]\s*['"]([^'"]+)['"])?/gs;
  let match;
  while ((match = dpRe.exec(source)) !== null) {
    const dpId = parseInt(match[1], 10);
    const dataType = match[2];
    const description = match[3] || '';
    results.push({
      dpId,
      dataType: TINYTUYA_DP_TYPES[dataType.toUpperCase()] || dataType.toLowerCase(),
      description,
      capability: DP_TO_CAPABILITY[dpId] || null,
      source: filename,
    });
  }

  // Extract device category definitions
  const catRe = /(?:class|category|device_type)\s*[=:]\s*['"]([^'"]+)['"]/gi;
  while ((match = catRe.exec(source)) !== null) {
    results.push({
      type: 'category',
      value: match[1],
      source: filename,
    });
  }

  // Extract manufacturer patterns
  const mfrRe = /(?:manufacturer|brand)\s*[=:]\s*['"]([^'"]+)['"]/gi;
  while ((match = mfrRe.exec(source)) !== null) {
    results.push({
      type: 'manufacturer',
      value: match[1],
      source: filename,
    });
  }

  return results;
}

// ── Load local fingerprints for cross-reference ──────────────────────────
function getLocalFingerprints() {
  const mfrs = new Set();
  if (!fs.existsSync(DRIVERS_DIR)) return mfrs;
  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf));
      for (const m of (data.zigbee?.manufacturerName || [])) mfrs.add(m);
    } catch (e) { /* skip */ }
  }
  return mfrs;
}

// ── Main scanner ─────────────────────────────────────────────────────────
async function scan() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('=== TinyTuya Scanner ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Check cache first
  let cache;
  if (ScannerCache) {
    cache = new ScannerCache(CACHE_ID);
    if (cache.isValid()) {
      console.log(`Cache HIT (${cache.getAge()} old, TTL: ${cache.getRemainingTTL()}ms remaining)`);
      const cached = cache.load();
      if (cached) return cached;
    } else {
      console.log('Cache EXPIRED or MISSING - fetching fresh data');
    }
  }

  const allResults = [];
  const localMfrs = getLocalFingerprints();
  console.log(`Loaded ${localMfrs.size} local manufacturer fingerprints`);

  // Get file tree from TinyTuya repo
  for (const scanPath of SCAN_PATHS) {
    console.log(`\nScanning path: ${scanPath}`);
    try {
      const items = await githubGet(`/repos/jasonacox/tinytuya/contents/${scanPath}`);
      if (!Array.isArray(items)) {
        console.log(`  No items found at ${scanPath}`);
        continue;
      }

      const pyFiles = items.filter((f) => f.name && f.name.endsWith('.py'));
      console.log(`  Found ${pyFiles.length} Python files`);

      for (const file of pyFiles) {
        try {
          const rawUrl = file.download_url || `${TINYTUYA_RAW}/${scanPath}/${file.name}`;
          const source = await fetchRaw(rawUrl);
          const parsed = parseTinyTuyaSource(source, `${scanPath}/${file.name}`);
          allResults.push(...parsed);
          if (parsed.length > 0) {
            console.log(`  [OK] ${file.name}: ${parsed.length} items`);
          }
        } catch (e) {
          console.error(`  [FAIL] ${file.name}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`  Error scanning ${scanPath}: ${e.message}`);
    }
  }

  // Separate results by type
  const dpMappings = allResults.filter((r) => r.dpId);
  const categories = allResults.filter((r) => r.type === 'category');
  const manufacturers = allResults.filter((r) => r.type === 'manufacturer');

  // Cross-reference with local drivers
  const newMfrs = manufacturers.filter((m) => !localMfrs.has(m.value));
  const matchedMfrs = manufacturers.filter((m) => localMfrs.has(m.value));

  // Build output
  const output = {
    timestamp: new Date().toISOString(),
    source: 'tinytuya',
    summary: {
      totalDpMappings: dpMappings.length,
      totalCategories: categories.length,
      totalManufacturers: manufacturers.length,
      newManufacturers: newMfrs.length,
      matchedManufacturers: matchedMfrs.length,
    },
    dpMappings: dpMappings.slice(0, 500), // Cap for file size
    categories: categories.slice(0, 200),
    manufacturers: manufacturers.slice(0, 500),
    newManufacturers: newMfrs.slice(0, 200),
    capabilityMapping: Object.entries(DP_TO_CAPABILITY).map(([dp, cap]) => ({
      dpId: parseInt(dp, 10),
      capability: cap,
    })),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  console.log(`DP mappings: ${dpMappings.length}, Categories: ${categories.length}, Manufacturers: ${manufacturers.length}`);
  console.log(`New manufacturers not in local: ${newMfrs.length}`);

  // Save to cache
  if (cache) {
    cache.save(output);
    console.log(`Cache SAVED (TTL: 24h)`);
  }

  return output;
}

// ── Run if executed directly ─────────────────────────────────────────────
if (require.main === module) {
  scan().catch((e) => {
    console.error('TinyTuya Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseTinyTuyaSource, DP_TO_CAPABILITY };
