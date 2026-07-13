#!/usr/bin/env node
/**
 * SmartThings Edge Scanner
 * Fetches YAML fingerprint files from SmartThings Edge driver repos on GitHub.
 * Extracts manufacturer names, model IDs, and maps to Homey drivers.
 *
 * Run: node scripts/scanners/smartthings-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'smartthings-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'smartthings';

const ST_API = 'https://api.github.com';

// Search queries for SmartThings Edge Tuya drivers
const SEARCH_QUERIES = [
  'manufacturerName fingerprint zigbee language:YAML',
  '_TZ3000 zigbee edge driver language:YAML',
  '_TZE200 zigbee edge driver language:YAML',
  'TS0601 zigbee fingerprint language:YAML',
];

// Known SmartThings Edge Tuya repos
const KNOWN_REPOS = [
  { owner: 'fison67', name: 'TS-Kite' },
  { owner: 'lelandblue', name: 'hubitat' },
  { owner: 'w35l3y', name: 'SmartThingsEdgeDrivers' },
];

// ── GitHub API authentication ────────────────────────────────────────────
const GH_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GH_HEADERS = {
  'User-Agent': 'HomeyTuyaScanner/1.0',
  'Accept': 'application/vnd.github.v3+json',
  ...(GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {}),
};

// ── HTTP helpers ─────────────────────────────────────────────────────────
function githubGet(urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: GH_HEADERS,
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

// ── Minimal YAML parser for SmartThings fingerprint files ────────────────
function parseStYaml(content, filename) {
  const result = {
    filename,
    manufacturerNames: [],
    modelIds: [],
    deviceProfiles: [],
    clusters: [],
    commands: [],
  };

  const lines = content.split('\n');
  let inFingerprint = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect fingerprint block
    if (trimmed.includes('fingerprint:') || trimmed.includes('fingerprint')) {
      inFingerprint = true;
      continue;
    }

    // Exit fingerprint block on dedent or new top-level key
    if (inFingerprint && (line.match(/^[a-zA-Z]/) && !trimmed.startsWith('-'))) {
      inFingerprint = false;
    }

    // Extract manufacturer in fingerprint block
    const mfrMatch = trimmed.match(/^manufacturer:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (mfrMatch) {
      const val = mfrMatch[1].trim();
      if (!result.manufacturerNames.includes(val)) {
        result.manufacturerNames.push(val);
      }
      continue;
    }

    // Extract model in fingerprint block
    const modelMatch = trimmed.match(/^model:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (modelMatch) {
      const val = modelMatch[1].trim();
      if (!result.modelIds.includes(val)) {
        result.modelIds.push(val);
      }
      continue;
    }

    // Extract device profile
    const dpMatch = trimmed.match(/^deviceProfile\s*[=:]\s*['"]?([^'"]+?)['"]?\s*$/);
    if (dpMatch) {
      result.deviceProfiles.push(dpMatch[1].trim());
      continue;
    }

    // Extract cluster IDs
    const clusterMatch = trimmed.match(/(?:cluster|inputCluster|outputCluster)\s*[=:]\s*['"]?(0x[0-9A-Fa-f]{4}|\d{2,5})['"]?/);
    if (clusterMatch) {
      result.clusters.push(clusterMatch[1]);
      continue;
    }

    // Extract manufacturerName patterns in any context
    const zigbeeMfrRe = /['"](_T[ZS][A-Z0-9]{0,4}_[a-zA-Z0-9_]+)['"]/g;
    let m;
    while ((m = zigbeeMfrRe.exec(trimmed)) !== null) {
      if (!result.manufacturerNames.includes(m[1])) {
        result.manufacturerNames.push(m[1]);
      }
    }

    // Extract model patterns
    const modelIdRe = /['"](TS\d{4}[a-zA-Z0-9]*)['"]/g;
    while ((m = modelIdRe.exec(trimmed)) !== null) {
      if (!result.modelIds.includes(m[1])) {
        result.modelIds.push(m[1]);
      }
    }
  }

  // Also try JSON-style SmartThings configs
  try {
    const jsonData = JSON.parse(content);
    if (jsonData.fingerprints) {
      for (const fp of (Array.isArray(jsonData.fingerprints) ? jsonData.fingerprints : [jsonData.fingerprints])) {
        if (fp.manufacturer && !result.manufacturerNames.includes(fp.manufacturer)) {
          result.manufacturerNames.push(fp.manufacturer);
        }
        if (fp.model && !result.modelIds.includes(fp.model)) {
          result.modelIds.push(fp.model);
        }
      }
    }
  } catch (e) {
    // Not JSON, that's fine
  }

  result.manufacturerNames = [...new Set(result.manufacturerNames)];
  result.modelIds = [...new Set(result.modelIds)];
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

  console.log('=== SmartThings Edge Scanner ===');
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

  // Search GitHub
  for (const query of SEARCH_QUERIES) {
    console.log(`\nSearching: "${query}"`);
    try {
      const searchResult = await githubGet(`/search/code?q=${encodeURIComponent(query)}+path:fingerprint.yml&per_page=30`);
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

          const parsed = parseStYaml(source, fileKey);
          if (parsed.manufacturerNames.length > 0 || parsed.modelIds.length > 0) {
            const localMatches = [];
            const newFingerprints = [];
            for (const mfr of parsed.manufacturerNames) {
              if (localMfrs.has(mfr)) {
                localMatches.push({ manufacturer: mfr, drivers: driverMap.get(mfr) || [] });
              } else {
                newFingerprints.push(mfr);
              }
            }

            allDevices.push({
              ...parsed,
              repo: repoFullName,
              localMatches,
              newFingerprints,
              isNew: newFingerprints.length > 0,
            });

            console.log(`  [OK] ${item.path}: ${parsed.manufacturerNames.length} mfrs, ${parsed.modelIds.length} models`);
          }
        } catch (e) {
          console.error(`  [FAIL] ${item.path}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`  Search error: ${e.message}`);
    }
  }

  // Also scan known repos
  for (const repo of KNOWN_REPOS) {
    console.log(`\nScanning known repo: ${repo.owner}/${repo.name}`);
    try {
      const items = await githubGet(`/repos/${repo.owner}/${repo.name}/git/trees/main?recursive=1`);
      const tree = items.tree || [];
      const ymlFiles = tree.filter((f) =>
        f.path && (f.path.endsWith('fingerprint.yml') || f.path.endsWith('fingerprint.yaml'))
      );
      console.log(`  Found ${ymlFiles.length} fingerprint files`);

      for (const file of ymlFiles) {
        const fileKey = `${repo.owner}/${repo.name}/${file.path}`;
        if (processedFiles.has(fileKey)) continue;
        processedFiles.add(fileKey);

        try {
          const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/main/${file.path}`;
          const source = await fetchRaw(rawUrl);
          const parsed = parseStYaml(source, fileKey);
          if (parsed.manufacturerNames.length > 0) {
            const newFps = parsed.manufacturerNames.filter((m) => !localMfrs.has(m));
            allDevices.push({
              ...parsed,
              repo: `${repo.owner}/${repo.name}`,
              newFingerprints: newFps,
              isNew: newFps.length > 0,
            });
          }
        } catch (e) {
          console.error(`  [FAIL] ${file.path}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`  Error scanning ${repo.owner}/${repo.name}: ${e.message}`);
    }
  }

  // Summaries
  const allNewMfrs = allDevices.flatMap((d) => d.newFingerprints);
  const uniqueNewMfrs = [...new Set(allNewMfrs)];

  const output = {
    timestamp: new Date().toISOString(),
    source: 'smartthings',
    summary: {
      totalFilesScanned: allDevices.length,
      totalManufacturerNames: [...new Set(allDevices.flatMap((d) => d.manufacturerNames))].length,
      totalModelIds: [...new Set(allDevices.flatMap((d) => d.modelIds))].length,
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
    console.log(`Cache SAVED (TTL: 12h)`);
  }

  return output;
}

// ── Run if executed directly ─────────────────────────────────────────────
if (require.main === module) {
  scan().catch((e) => {
    console.error('SmartThings Edge Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseStYaml };
