#!/usr/bin/env node
/**
 * Hubitat Groovy Scanner
 * Fetches Groovy driver files from GitHub repositories that contain Tuya Zigbee drivers.
 * Extracts manufacturer names, fingerprints, DP mappings, and maps to Homey drivers.
 *
 * Run: node scripts/scanners/hubitat-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'hubitat-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'hubitat';

// Known Hubitat Tuya Zigbee driver repos
const HUBITAT_REPOS = [
  { owner: 'kira1966', repo: 'drivers', path: '' },
  { owner: 'bravenel', repo: 'Hubitat', path: '' },
  { owner: 'jw2100', repo: 'Hubitat-Code', path: '' },
];

// Search for Groovy files containing Tuya patterns via GitHub search
const SEARCH_QUERIES = [
  'manufacturerName Tuya zigbee language:Groovy',
  '_TZ3000 language:Groovy',
  '_TZE200 language:Groovy',
  'ts0601 language:Groovy',
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

// ── Parse Groovy source for Tuya-related patterns ────────────────────────
function parseGroovySource(source, filename) {
  const results = {
    filename,
    manufacturerNames: [],
    modelIds: [],
    dpMappings: [],
    capabilities: [],
    clusterIds: [],
  };

  // Extract manufacturerName strings (Tuya patterns: _TZ*, _TZE*, _TY*)
  const mfrRe = /['"](_T[ZS][A-Z0-9]{0,4}_[a-zA-Z0-9_]+)['"]/g;
  let match;
  while ((match = mfrRe.exec(source)) !== null) {
    results.manufacturerNames.push(match[1]);
  }

  // Also match Zigbee manufacturer name patterns like "Manufacturer"
  const zigbeeMfrRe = /manufacturerName\s*[=:]\s*['"]([^'"]+)['"]/gi;
  while ((match = zigbeeMfrRe.exec(source)) !== null) {
    if (!results.manufacturerNames.includes(match[1])) {
      results.manufacturerNames.push(match[1]);
    }
  }

  // Extract model IDs (TS0xxx pattern)
  const modelRe = /['"](TS\d{4}[a-zA-Z0-9]*)['"]/g;
  while ((match = modelRe.exec(source)) !== null) {
    if (!results.modelIds.includes(match[1])) {
      results.modelIds.push(match[1]);
    }
  }

  // Extract model ID assignments
  const modelAssignRe = /(?:model|modelId)\s*[=:]\s*['"]([^'"]+)['"]/gi;
  while ((match = modelAssignRe.exec(source)) !== null) {
    if (!results.modelIds.includes(match[1])) {
      results.modelIds.push(match[1]);
    }
  }

  // Extract DP mappings: sendTuyaCommand(dpId, datatype, value)
  const dpCmdRe = /(?:sendTuya|tuyaCommand|sendCommand)\s*\(\s*(\d+)\s*,\s*(\d+)/g;
  while ((match = dpCmdRe.exec(source)) !== null) {
    results.dpMappings.push({
      dpId: parseInt(match[1], 10),
      dataType: parseInt(match[2], 10),
    });
  }

  // Extract DP definitions from attribute declarations
  const dpAttrRe = /attribute\s+['"]([^'"]+)['"].*?['"](\d+)['"]/g;
  while ((match = dpAttrRe.exec(source)) !== null) {
    const dpId = parseInt(match[2], 10);
    if (dpId >= 1 && dpId <= 200) {
      results.dpMappings.push({
        dpId,
        name: match[1],
      });
    }
  }

  // Extract Zigbee cluster IDs
  const clusterRe = /cluster\s*[=:]\s*['"]?(0x[0-9A-Fa-f]{4}|\d{2,5})['"]?/gi;
  while ((match = clusterRe.exec(source)) !== null) {
    results.clusterIds.push(match[1]);
  }

  // Extract capability statements
  const capRe = /capability\s+['"]([^'"]+)['"]/gi;
  while ((match = capRe.exec(source)) !== null) {
    results.capabilities.push(match[1]);
  }

  // Deduplicate
  results.manufacturerNames = [...new Set(results.manufacturerNames)];
  results.modelIds = [...new Set(results.modelIds)];
  results.dpMappings = results.dpMappings.filter((dp, i, arr) =>
    arr.findIndex((d) => d.dpId === dp.dpId) === i
  );
  results.clusterIds = [...new Set(results.clusterIds)];
  results.capabilities = [...new Set(results.capabilities)];

  return results;
}

// ── Load local fingerprints ──────────────────────────────────────────────
function getLocalFingerprints() {
  const mfrs = new Set();
  const driverMap = new Map();
  if (!fs.existsSync(DRIVERS_DIR)) return { mfrs, driverMap };
  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf));
      for (const m of (data.zigbee?.manufacturerName || [])) {
        mfrs.add(m);
        if (!driverMap.has(m)) driverMap.set(m, []);
        driverMap.get(m).push(d);
      }
    } catch (e) { /* skip */ }
  }
  return { mfrs, driverMap };
}

// ── Infer Homey driver from Groovy patterns ──────────────────────────────
function inferHomeyDriver(mfr, modelId, dpMappings) {
  const p = (modelId || '').toUpperCase();

  if (p === 'TS0001') return 'switch_1gang';
  if (p === 'TS0002') return 'switch_2gang';
  if (p === 'TS0003') return 'switch_3gang';
  if (p === 'TS0004') return 'switch_4gang';
  if (p === 'TS011F' || p === 'TS0121') return 'plug_energy_monitor';
  if (/^TS004[1-6]$/.test(p)) return 'button_wireless';
  if (p === 'TS0201' || p === 'TS0222') return 'climate_sensor';
  if (p === 'TS0202' || p === 'TS0225') return 'motion_sensor';
  if (p === 'TS0203') return 'contact_sensor';
  if (p === 'TS0207') return 'water_leak_sensor';
  if (p === 'TS0215A') return 'button_wireless';
  if (/^TS050[1-5]$/.test(p)) return 'bulb_rgbw';
  if (p === 'TS110E' || p === 'TS110F') return 'dimmer_wall_1gang';
  if (p === 'TS130F' || p === 'TS0302') return 'curtain_motor';

  if (p === 'TS0601' || p === 'TS0602') {
    const ml = (mfr || '').toLowerCase();
    if (/temp|humid|climate/i.test(ml)) return 'climate_sensor';
    if (/presence|radar|human|pir/i.test(ml)) return 'presence_sensor_radar';
    if (/curtain|blind|cover/i.test(ml)) return 'curtain_motor';
    if (/valve|trv|thermo/i.test(ml)) return 'radiator_valve';
    if (/smoke|fire/i.test(ml)) return 'smoke_detector_advanced';
    if (/water|leak/i.test(ml)) return 'water_leak_sensor';
    if (/door|contact/i.test(ml)) return 'contact_sensor';
    if (/soil/i.test(ml)) return 'soil_sensor';
    return 'generic_diy';
  }

  return null;
}

// ── Main scanner ─────────────────────────────────────────────────────────
async function scan() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('=== Hubitat Groovy Scanner ===');
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

  const { mfrs: localMfrs, driverMap } = getLocalFingerprints();
  console.log(`Loaded ${localMfrs.size} local manufacturer fingerprints`);

  const allDrivers = [];

  // Search GitHub for Groovy files with Tuya patterns
  for (const query of SEARCH_QUERIES) {
    console.log(`\nSearching: "${query}"`);
    try {
      const searchResult = await githubGet(`/search/code?q=${encodeURIComponent(query)}&per_page=30`);
      const items = searchResult.items || [];
      console.log(`  Found ${items.length} files`);

      for (const item of items) {
        if (!item.path || !item.path.endsWith('.groovy')) continue;
        const repoFullName = item.repository?.full_name;
        if (!repoFullName) continue;

        try {
          const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/master/${item.path}`;
          let source;
          try {
            source = await fetchRaw(rawUrl);
          } catch (e) {
            // Try 'main' branch
            const altUrl = `https://raw.githubusercontent.com/${repoFullName}/main/${item.path}`;
            source = await fetchRaw(altUrl);
          }

          const parsed = parseGroovySource(source, `${repoFullName}/${item.path}`);
          if (parsed.manufacturerNames.length > 0 || parsed.dpMappings.length > 0) {
            // Cross-reference with local drivers
            const localMatches = [];
            const newFingerprints = [];
            for (const mfr of parsed.manufacturerNames) {
              if (localMfrs.has(mfr)) {
                localMatches.push({ manufacturer: mfr, drivers: driverMap.get(mfr) || [] });
              } else {
                newFingerprints.push(mfr);
              }
            }

            allDrivers.push({
              ...parsed,
              repo: repoFullName,
              inferredDrivers: parsed.modelIds.map((mid) => ({
                modelId: mid,
                homeyDriver: inferHomeyDriver(parsed.manufacturerNames[0], mid, parsed.dpMappings),
              })),
              localMatches,
              newFingerprints,
              isNew: newFingerprints.length > 0,
            });

            console.log(`  [OK] ${item.path}: ${parsed.manufacturerNames.length} mfrs, ${parsed.dpMappings.length} DPs`);
          }
        } catch (e) {
          console.error(`  [FAIL] ${item.path}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`  Search error: ${e.message}`);
    }
  }

  // Summaries
  const allNewMfrs = allDrivers.flatMap((d) => d.newFingerprints);
  const uniqueNewMfrs = [...new Set(allNewMfrs)];

  const output = {
    timestamp: new Date().toISOString(),
    source: 'hubitat',
    summary: {
      totalDriversScanned: allDrivers.length,
      totalManufacturerNames: [...new Set(allDrivers.flatMap((d) => d.manufacturerNames))].length,
      totalDpMappings: allDrivers.reduce((sum, d) => sum + d.dpMappings.length, 0),
      newFingerprints: uniqueNewMfrs.length,
      matchedToLocal: allDrivers.reduce((sum, d) => sum + d.localMatches.length, 0),
    },
    drivers: allDrivers.slice(0, 300),
    newFingerprints: uniqueNewMfrs.slice(0, 200),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  console.log(`Drivers: ${allDrivers.length}, New fingerprints: ${uniqueNewMfrs.length}`);

  // Save to cache
  if (cache) {
    cache.save(output);
    console.log(`Cache SAVED (TTL: 12h)`);
  }

  return output;
}

// ── Run if executed directly ─────────────────────────────────────────────
if (require.main === module) {
  scan().catch((e) => {
    console.error('Hubitat Groovy Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseGroovySource, inferHomeyDriver };
