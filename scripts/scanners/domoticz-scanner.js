#!/usr/bin/env node
/**
 * Domoticz Zigbee Scanner
 * Fetches device database files from Domoticz GitHub repos and plugins.
 * Extracts manufacturer names, device types, and maps to Homey drivers.
 *
 * Run: node scripts/scanners/domoticz-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'domoticz-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'domoticz';

const DOMOTICZ_API = 'https://api.github.com';
const DOMOTICZ_RAW = 'https://raw.githubusercontent.com';

// Known Domoticz Zigbee plugin repos
const ZIGBEE_REPOS = [
  { owner: 'danielealbano', repo: 'domoticz-zigbee2mqtt-plugin' },
  { owner: 'gizmocuz', repo: 'domoticz' },
  { owner: 'Smanar', repo: 'Zigbee-for-Domoticz' },
  { owner: 'ziga-laj', repo: 'Domoticz-Zigate' },
];

// Search queries
const SEARCH_QUERIES = [
  'zigbee manufacturer domoticz language:Python',
  'zigbee manufacturer domoticz language:Lua',
  '_TZ3000 domoticz',
  '_TZE200 domoticz zigbee',
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

// ── Parse Python/Lua source for Zigbee device patterns ───────────────────
function parseZigbeeSource(source, filename) {
  const result = {
    filename,
    manufacturerNames: [],
    modelIds: [],
    deviceTypes: [],
    clusters: [],
    dpMappings: [],
  };

  // Extract Tuya manufacturer name patterns
  const mfrRe = /['"](_T[ZS][A-Z0-9]{0,4}_[a-zA-Z0-9_]+)['"]/g;
  let match;
  while ((match = mfrRe.exec(source)) !== null) {
    result.manufacturerNames.push(match[1]);
  }

  // Extract manufacturerName assignments
  const mfrAssignRe = /manufacturer[_\s]*name\s*[=:]\s*['"]([^'"]+)['"]/gi;
  while ((match = mfrAssignRe.exec(source)) !== null) {
    if (!result.manufacturerNames.includes(match[1])) {
      result.manufacturerNames.push(match[1]);
    }
  }

  // Extract model ID patterns
  const modelRe = /['"](TS\d{4}[a-zA-Z0-9]*)['"]/g;
  while ((match = modelRe.exec(source)) !== null) {
    if (!result.modelIds.includes(match[1])) {
      result.modelIds.push(match[1]);
    }
  }

  // Extract device type assignments
  const typeRe = /(?:device[_\s]*type|devicetype|device_type)\s*[=:]\s*['"]([^'"]+)['"]/gi;
  while ((match = typeRe.exec(source)) !== null) {
    result.deviceTypes.push(match[1]);
  }

  // Extract Zigbee cluster IDs
  const clusterRe = /(?:cluster|cluster_id|clusterid)\s*[=:]\s*['"]?(0x[0-9A-Fa-f]{4}|\d{2,5})['"]?/gi;
  while ((match = clusterRe.exec(source)) !== null) {
    result.clusters.push(match[1]);
  }

  // Extract DP mappings (Tuya-specific)
  const dpRe = /dp[_\s]*(?:id|_id)\s*[=:]\s*(\d+)/gi;
  while ((match = dpRe.exec(source)) !== null) {
    const dpId = parseInt(match[1], 10);
    if (dpId >= 1 && dpId <= 200 && !result.dpMappings.find((d) => d.dpId === dpId)) {
      result.dpMappings.push({ dpId });
    }
  }

  // Extract manufacturer codes (numeric Zigbee manufacturer codes)
  const mfgCodeRe = /(?:mfg[_\s]*code|manufacturer[_\s]*code|manufacturerCode)\s*[=:]\s*['"]?(0x[0-9A-Fa-f]{4}|\d{3,5})['"]?/gi;
  while ((match = mfgCodeRe.exec(source)) !== null) {
    result.deviceTypes.push(`mfgCode:${match[1]}`);
  }

  // Deduplicate
  result.manufacturerNames = [...new Set(result.manufacturerNames)];
  result.modelIds = [...new Set(result.modelIds)];
  result.deviceTypes = [...new Set(result.deviceTypes)];
  result.clusters = [...new Set(result.clusters)];

  return result;
}

// ── Parse JSON config files ──────────────────────────────────────────────
function parseJsonConfig(content, filename) {
  const result = {
    filename,
    manufacturerNames: [],
    modelIds: [],
    deviceTypes: [],
    clusters: [],
    dpMappings: [],
  };

  try {
    const data = JSON.parse(content);

    // Recursively search for manufacturer patterns in JSON
    const searchObj = (obj, depth = 0) => {
      if (depth > 10 || !obj) return;
      if (typeof obj === 'string') {
        const mfrMatch = obj.match(/(_T[ZS][A-Z0-9]{0,4}_[a-zA-Z0-9_]+)/);
        if (mfrMatch && !result.manufacturerNames.includes(mfrMatch[1])) {
          result.manufacturerNames.push(mfrMatch[1]);
        }
        const modelMatch = obj.match(/(TS\d{4}[a-zA-Z0-9]*)/);
        if (modelMatch && !result.modelIds.includes(modelMatch[1])) {
          result.modelIds.push(modelMatch[1]);
        }
      } else if (Array.isArray(obj)) {
        for (const item of obj) searchObj(item, depth + 1);
      } else if (typeof obj === 'object') {
        // Check for manufacturer key
        if (obj.manufacturer && typeof obj.manufacturer === 'string') {
          if (!result.manufacturerNames.includes(obj.manufacturer)) {
            result.manufacturerNames.push(obj.manufacturer);
          }
        }
        if (obj.model && typeof obj.model === 'string') {
          if (!result.modelIds.includes(obj.model)) {
            result.modelIds.push(obj.model);
          }
        }
        if (obj.type && typeof obj.type === 'string') {
          result.deviceTypes.push(obj.type);
        }
        if (obj.cluster && typeof obj.cluster === 'string') {
          result.clusters.push(obj.cluster);
        }
        for (const val of Object.values(obj)) {
          searchObj(val, depth + 1);
        }
      }
    };

    searchObj(data);
  } catch (e) {
    // Not JSON, ignore
  }

  result.manufacturerNames = [...new Set(result.manufacturerNames)];
  result.modelIds = [...new Set(result.modelIds)];
  result.deviceTypes = [...new Set(result.deviceTypes)];
  result.clusters = [...new Set(result.clusters)];

  return result;
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

// ── Main scanner ─────────────────────────────────────────────────────────
async function scan() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('=== Domoticz Zigbee Scanner ===');
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

  const allDevices = [];
  const processedFiles = new Set();

  // Scan known repos
  for (const repoInfo of ZIGBEE_REPOS) {
    console.log(`\nScanning repo: ${repoInfo.owner}/${repoInfo.repo}`);
    try {
      // Get tree to find relevant files
      const treeResult = await githubGet(`/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/main?recursive=1`);
      const tree = (treeResult.tree || []).filter((f) => f.path);

      const relevantFiles = tree.filter((f) =>
        f.path.endsWith('.py') || f.path.endsWith('.lua') || f.path.endsWith('.json')
      ).filter((f) => {
        const lower = f.path.toLowerCase();
        return lower.includes('zigbee') || lower.includes('tuya') || lower.includes('device');
      });

      console.log(`  Found ${relevantFiles.length} relevant files`);

      for (const file of relevantFiles.slice(0, 50)) {
        const fileKey = `${repoInfo.owner}/${repoInfo.repo}/${file.path}`;
        if (processedFiles.has(fileKey)) continue;
        processedFiles.add(fileKey);

        try {
          const rawUrl = `${DOMOTICZ_RAW}/${repoInfo.owner}/${repoInfo.repo}/${file.path}`;
          const source = await fetchRaw(rawUrl);

          let parsed;
          if (file.path.endsWith('.json')) {
            parsed = parseJsonConfig(source, fileKey);
          } else {
            parsed = parseZigbeeSource(source, fileKey);
          }

          if (parsed.manufacturerNames.length > 0 || parsed.modelIds.length > 0) {
            const newFps = parsed.manufacturerNames.filter((m) => !localMfrs.has(m));
            const localMatches = parsed.manufacturerNames
              .filter((m) => localMfrs.has(m))
              .map((m) => ({ manufacturer: m, drivers: driverMap.get(m) || [] }));

            allDevices.push({
              ...parsed,
              repo: `${repoInfo.owner}/${repoInfo.repo}`,
              localMatches,
              newFingerprints: newFps,
              isNew: newFps.length > 0,
            });

            if (parsed.manufacturerNames.length > 0) {
              console.log(`  [OK] ${file.path}: ${parsed.manufacturerNames.length} mfrs`);
            }
          }
        } catch (e) {
          // Skip files that can't be fetched (too large, binary, etc.)
        }
      }
    } catch (e) {
      console.error(`  Error scanning ${repoInfo.owner}/${repoInfo.repo}: ${e.message}`);
    }
  }

  // Search GitHub for more patterns
  for (const query of SEARCH_QUERIES) {
    console.log(`\nSearching: "${query}"`);
    try {
      const searchResult = await githubGet(`/search/code?q=${encodeURIComponent(query)}&per_page=20`);
      const items = searchResult.items || [];
      console.log(`  Found ${items.length} files`);

      for (const item of items) {
        if (!item.path) continue;
        const fileKey = `${item.repository?.full_name}/${item.path}`;
        if (processedFiles.has(fileKey)) continue;
        processedFiles.add(fileKey);

        const repoFullName = item.repository?.full_name;
        if (!repoFullName) continue;

        try {
          const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/main/${item.path}`;
          let source;
          try {
            source = await fetchRaw(rawUrl);
          } catch (e) {
            const altUrl = `https://raw.githubusercontent.com/${repoFullName}/master/${item.path}`;
            source = await fetchRaw(altUrl);
          }

          let parsed;
          if (item.path.endsWith('.json')) {
            parsed = parseJsonConfig(source, fileKey);
          } else {
            parsed = parseZigbeeSource(source, fileKey);
          }

          if (parsed.manufacturerNames.length > 0) {
            const newFps = parsed.manufacturerNames.filter((m) => !localMfrs.has(m));
            allDevices.push({
              ...parsed,
              repo: repoFullName,
              newFingerprints: newFps,
              isNew: newFps.length > 0,
            });
            console.log(`  [OK] ${item.path}: ${parsed.manufacturerNames.length} mfrs`);
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
  const allNewMfrs = allDevices.flatMap((d) => d.newFingerprints);
  const uniqueNewMfrs = [...new Set(allNewMfrs)];

  const output = {
    timestamp: new Date().toISOString(),
    source: 'domoticz',
    summary: {
      totalFilesScanned: allDevices.length,
      totalManufacturerNames: [...new Set(allDevices.flatMap((d) => d.manufacturerNames))].length,
      totalModelIds: [...new Set(allDevices.flatMap((d) => d.modelIds))].length,
      totalDpMappings: allDevices.reduce((sum, d) => sum + (d.dpMappings?.length || 0), 0),
      newFingerprints: uniqueNewMfrs.length,
      matchedToLocal: allDevices.reduce((sum, d) => sum + d.localMatches.length, 0),
    },
    devices: allDevices.slice(0, 300),
    newFingerprints: uniqueNewMfrs.slice(0, 200),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  console.log(`Files: ${allDevices.length}, New fingerprints: ${uniqueNewMfrs.length}`);

  // Save to cache
  if (cache) {
    cache.save(output);
    console.log(`Cache SAVED (TTL: 48h)`);
  }

  return output;
}

// ── Run if executed directly ─────────────────────────────────────────────
if (require.main === module) {
  scan().catch((e) => {
    console.error('Domoticz Zigbee Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseZigbeeSource, parseJsonConfig };
