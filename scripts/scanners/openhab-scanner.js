#!/usr/bin/env node
/**
 * openHAB XML Scanner
 * Fetches XML Thing type definitions from openHAB GitHub repos.
 * Extracts manufacturer codes, cluster mappings, and maps to Homey drivers.
 *
 * Run: node scripts/scanners/openhab-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'openhab-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'openhab';

const OPENHAB_API = 'https://api.github.com';
const OPENHAB_RAW = 'https://raw.githubusercontent.com';

// Known openHAB Zigbee binding repos with Tuya support
const REPOS_TO_SCAN = [
  { owner: 'openhab', repo: 'openhab-addons', path: 'bundles/org.openhab.binding.zigbee/src/main/resources/ESH-INF/thing' },
  { owner: 'openhab', repo: 'openhab-addons', path: 'bundles/org.openhab.binding.zigbee.tuya/src/main/resources/ESH-INF/thing' },
];

// Search for XML files with Tuya Zigbee patterns
const SEARCH_QUERIES = [
  'manufacturerName zigbee thing language:XML',
  '_TZ3000 zigbee binding language:XML',
  '_TZE200 zigbee thing type language:XML',
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

// ── Parse XML Thing definitions ──────────────────────────────────────────
function parseOpenHabXml(content, filename) {
  const result = {
    filename,
    thingTypes: [],
    manufacturerNames: [],
    modelIds: [],
    clusterMappings: [],
    properties: [],
  };

  // Extract thing-type IDs (often contain manufacturer/model info)
  const thingTypeRe = /<thing-type\s+id\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = thingTypeRe.exec(content)) !== null) {
    result.thingTypes.push(match[1]);
  }

  // Extract manufacturer name from property or parameter
  const mfrRe = /manufacturer[_\s]*(?:name)?\s*[=>:]\s*["']([^"']+)["']/gi;
  while ((match = mfrRe.exec(content)) !== null) {
    result.manufacturerNames.push(match[1]);
  }

  // Also match XML element content containing Tuya patterns
  const tuyaMfrRe = />([^<]*_T[ZS][A-Z0-9]{0,4}_[a-zA-Z0-9_]+[^<]*)</g;
  while ((match = tuyaMfrRe.exec(content)) !== null) {
    const inner = match[1].trim();
    const mfrMatch = inner.match(/(_T[ZS][A-Z0-9]{0,4}_[a-zA-Z0-9_]+)/);
    if (mfrMatch) {
      result.manufacturerNames.push(mfrMatch[1]);
    }
  }

  // Extract model ID patterns
  const modelRe = /["'](TS\d{4}[a-zA-Z0-9]*)["']/g;
  while ((match = modelRe.exec(content)) !== null) {
    result.modelIds.push(match[1]);
  }

  // Extract Zigbee cluster references
  const clusterRe = /cluster[_\s]*(?:id)?\s*[=>:]\s*["']?(0x[0-9A-Fa-f]{4}|\d{2,5})["']?/gi;
  while ((match = clusterRe.exec(content)) !== null) {
    result.clusterMappings.push(match[1]);
  }

  // Extract thing-type-xml references for channels
  const channelRe = /<channel\s+id\s*=\s*"([^"]+)"/g;
  while ((match = channelRe.exec(content)) !== null) {
    const ch = match[1];
    if (ch.includes('temperature') || ch.includes('humidity') || ch.includes('battery')) {
      result.properties.push(ch);
    }
  }

  // Deduplicate
  result.manufacturerNames = [...new Set(result.manufacturerNames)];
  result.modelIds = [...new Set(result.modelIds)];
  result.clusterMappings = [...new Set(result.clusterMappings)];
  result.thingTypes = [...new Set(result.thingTypes)];

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

  console.log('=== openHAB XML Scanner ===');
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
  for (const repoInfo of REPOS_TO_SCAN) {
    console.log(`\nScanning: ${repoInfo.owner}/${repoInfo.repo}/${repoInfo.path}`);
    try {
      const items = await githubGet(`/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${repoInfo.path}`);
      if (!Array.isArray(items)) {
        console.log('  No files found');
        continue;
      }

      const xmlFiles = items.filter((f) => f.name && f.name.endsWith('.xml'));
      console.log(`  Found ${xmlFiles.length} XML files`);

      for (const file of xmlFiles) {
        const fileKey = `${repoInfo.owner}/${repoInfo.repo}/${repoInfo.path}/${file.name}`;
        if (processedFiles.has(fileKey)) continue;
        processedFiles.add(fileKey);

        try {
          const rawUrl = file.download_url || `${OPENHAB_RAW}/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.path}/${file.name}`;
          const source = await fetchRaw(rawUrl);
          const parsed = parseOpenHabXml(source, fileKey);
          if (parsed.manufacturerNames.length > 0 || parsed.thingTypes.length > 0) {
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
            console.log(`  [OK] ${file.name}: ${parsed.manufacturerNames.length} mfrs, ${parsed.thingTypes.length} thing types`);
          }
        } catch (e) {
          console.error(`  [FAIL] ${file.name}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`  Error scanning ${repoInfo.owner}/${repoInfo.repo}: ${e.message}`);
    }
  }

  // Search GitHub for more
  for (const query of SEARCH_QUERIES) {
    console.log(`\nSearching: "${query}"`);
    try {
      const searchResult = await githubGet(`/search/code?q=${encodeURIComponent(query)}&per_page=20`);
      const items = searchResult.items || [];
      console.log(`  Found ${items.length} files`);

      for (const item of items) {
        if (!item.path || !item.path.endsWith('.xml')) continue;
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

          const parsed = parseOpenHabXml(source, fileKey);
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
    source: 'openhab',
    summary: {
      totalFilesScanned: allDevices.length,
      totalManufacturerNames: [...new Set(allDevices.flatMap((d) => d.manufacturerNames))].length,
      totalThingTypes: allDevices.reduce((sum, d) => sum + d.thingTypes.length, 0),
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
    console.error('openHAB XML Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseOpenHabXml };
