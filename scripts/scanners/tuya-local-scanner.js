#!/usr/bin/env node
/**
 * Tuya-Local Scanner
 * Fetches YAML config files from make-all/tuya-local GitHub repo.
 * Extracts DP mappings, device categories, and maps to Homey capabilities.
 *
 * Run: node scripts/scanners/tuya-local-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'tuya-local-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try { ScannerCache = require('./scanner-cache').ScannerCache; } catch { /* fallback: no caching */ }
const CACHE_ID = 'tuya-local';

// P53: per-URL blob cache (saves ~95% of network traffic on re-runs)
let DiffCache;
try { DiffCache = require('./diff-cache').DiffCache; } catch { /* fallback */ }
let diffCache;

// P53: bounded parallel fetcher
let fetchAll;
try { fetchAll = require('./concurrent-fetch').fetchAll; } catch { /* fallback to sequential */ }

const TUYALOCAL_RAW = 'https://raw.githubusercontent.com/make-all/tuya-local/main';
const TUYALOCAL_API = 'https://api.github.com';

// Config directory in tuya-local repo
const CONFIG_DIR = 'custom_components/tuya_local/devices';

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

// P53: Use diff-cache + parallel fetcher when available
async function fetchRaw(url) {
  if (diffCache) {
    try {
      const { body } = await diffCache.fetchIfChanged(url, { timeout: 30000 });
      return body.toString('utf8');
    } catch (e) {
      // Fall through to plain fetch
    }
  }
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

// ── YAML parser (minimal, for DP mapping extraction) ─────────────────────
function parseYamlLight(content) {
  const result = {
    primaryEntity: null,
    entities: [],
    dpMappings: [],
    manufacturer: null,
    model: null,
    category: null,
  };

  const lines = content.split('\n');
  let currentEntity = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Extract top-level keys
    const primaryMatch = trimmed.match(/^primary_entity:\s*(.+)/);
    if (primaryMatch) {
      result.primaryEntity = primaryMatch[1].replace(/['"]/g, '').trim();
      continue;
    }

    // Extract entity names
    const entityMatch = trimmed.match(/^(\w+)_entity:/);
    if (entityMatch) {
      currentEntity = entityMatch[1];
      result.entities.push(currentEntity);
      continue;
    }

    // Extract manufacturer
    const mfrMatch = trimmed.match(/^manufacturer:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (mfrMatch) {
      result.manufacturer = mfrMatch[1].trim();
      continue;
    }

    // Extract model
    const modelMatch = trimmed.match(/^model:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (modelMatch) {
      result.model = modelMatch[1].trim();
      continue;
    }

    // Extract category
    const catMatch = trimmed.match(/^category:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (catMatch) {
      result.category = catMatch[1].trim();
      continue;
    }

    // Extract DP mappings: dps: with id and type
    const dpIdMatch = trimmed.match(/^\s*-\s*id:\s*(\d+)/);
    if (dpIdMatch) {
      const dpEntry = { dpId: parseInt(dpIdMatch[1], 10), type: null, name: null };
      result.dpMappings.push(dpEntry);
      continue;
    }

    // Extract DP name within a dp block
    const dpNameMatch = trimmed.match(/^name:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (dpNameMatch && result.dpMappings.length > 0) {
      result.dpMappings[result.dpMappings.length - 1].name = dpNameMatch[1].trim();
      continue;
    }

    // Extract DP type
    const dpTypeMatch = trimmed.match(/^type:\s*['"]?([^'"]+?)['"]?\s*$/);
    if (dpTypeMatch && result.dpMappings.length > 0) {
      result.dpMappings[result.dpMappings.length - 1].type = dpTypeMatch[1].trim();
      continue;
    }
  }

  return result;
}

// ── Map tuya-local entity types to Homey capabilities ────────────────────
const ENTITY_TO_CAPABILITY = {
  'switch': 'onoff',
  'light': 'onoff',
  'dimmer': 'dim',
  'fan': 'onoff',
  'cover': 'windowcovering_state',
  'climate': 'target_temperature',
  'sensor': null, // Depends on type
  'binary_sensor': null, // Depends on type
  'number': null,
  'select': null,
  'button': null,
  'scene': null,
  'lock': 'onoff',
  'vacuum': 'onoff',
  'humidifier': 'onoff',
  'water_heater': 'target_temperature',
};

// Map sensor sub-types to capabilities
const SENSOR_TYPE_MAP = {
  'temperature': 'measure_temperature',
  'humidity': 'measure_humidity',
  'battery': 'measure_battery',
  'power': 'measure_power',
  'energy': 'meter_power',
  'voltage': 'measure_voltage',
  'current': 'measure_current',
  'pm25': 'measure_pm25',
  'co2': 'measure_co2',
  'pm10': 'measure_pm10',
  'illuminance': 'measure_luminance',
  'co': 'alarm_carbon_monoxide',
  'smoke': 'alarm_smoke',
  'gas': 'alarm_gas',
  'water': 'alarm_water_leak',
  'motion': 'alarm_motion',
  'contact': 'alarm_contact',
  'opening': 'alarm_contact',
};

// ── Load local fingerprints ──────────────────────────────────────────────
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

  console.log('=== Tuya-Local Scanner ===');
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

  // P53: per-URL diff cache (persisted across GHA runs via artifact)
  if (DiffCache) {
    diffCache = new DiffCache(CACHE_ID);
    const entries = diffCache.listEntries();
    console.log(`Diff cache: ${entries.length} URLs already cached`);
  }

  const localMfrs = getLocalFingerprints();
  console.log(`Loaded ${localMfrs.size} local manufacturer fingerprints`);

  const allDevices = [];
  let pageCount = 0;
  let page = 1;

  // Paginate through config directory
  while (true) {
    console.log(`\nFetching page ${page} of ${CONFIG_DIR}...`);
    let items;
    try {
      items = await githubGet(`/repos/make-all/tuya-local/contents/${CONFIG_DIR}?per_page=100&page=${page}`);
    } catch (e) {
      console.error(`Error fetching page ${page}: ${e.message}`);
      break;
    }

    if (!Array.isArray(items) || items.length === 0) break;
    pageCount++;

    const yamlFiles = items.filter((f) => f.name && (f.name.endsWith('.yaml') || f.name.endsWith('.yml')));
    console.log(`  Found ${yamlFiles.length} YAML files on this page`);

    // P53: parallel fetch (10x speedup) with diff-cache (95% network reduction on re-runs)
    const urls = yamlFiles.map(f => f.download_url || `${TUYALOCAL_RAW}/${CONFIG_DIR}/${f.name}`);

    let fetched = [];
    if (fetchAll) {
      // P53.5: bumped concurrency 10 -> 30 to compensate for slow GHA network (~5-10s per fetch)
      // P53.6: removed perHost rate limit - GH_TOKEN gives 5000 req/hr = 1.4/sec,
      //         and rate limiting throttles us more than needed in GHA
      // P55: throttle progress output (every 25) to avoid filling pipe buffer
      let lastProgress = 0;
      fetched = await fetchAll(urls, {
        concurrency: 50,
        timeout: 30000,
        onProgress: (d, t) => {
          if (d === t || d - lastProgress >= 25) {
            process.stdout.write(`\r    fetching ${d}/${t}...`);
            lastProgress = d;
          }
        },
      });
      process.stdout.write('\n');
    } else {
      // Fallback: sequential
      for (const url of urls) {
        try {
          const content = await fetchRaw(url);
          fetched.push({ url, body: Buffer.from(content) });
        } catch (e) {
          fetched.push({ url, error: e.message });
        }
      }
    }

    for (let fi = 0; fi < yamlFiles.length; fi++) {
      const file = yamlFiles[fi];
      const r = fetched[fi];
      if (r.error) {
        console.error(`  [FAIL] ${file.name}: ${r.error}`);
        continue;
      }
      try {
        const content = r.body.toString('utf8');
        const parsed = parseYamlLight(content);

        if (parsed.dpMappings.length > 0 || parsed.manufacturer) {
          // Map entity type to capabilities
          const capabilities = [];
          if (parsed.primaryEntity && ENTITY_TO_CAPABILITY[parsed.primaryEntity]) {
            capabilities.push(ENTITY_TO_CAPABILITY[parsed.primaryEntity]);
          }
          for (const entity of parsed.entities) {
            if (ENTITY_TO_CAPABILITY[entity]) {
              capabilities.push(ENTITY_TO_CAPABILITY[entity]);
            }
          }

          // Map DP names to capabilities
          for (const dp of parsed.dpMappings) {
            if (dp.name && SENSOR_TYPE_MAP[dp.name]) {
              dp.capability = SENSOR_TYPE_MAP[dp.name];
              capabilities.push(SENSOR_TYPE_MAP[dp.name]);
            }
          }

          const entry = {
            filename: file.name,
            manufacturer: parsed.manufacturer,
            model: parsed.model,
            category: parsed.category,
            primaryEntity: parsed.primaryEntity,
            entities: parsed.entities,
            dpMappings: parsed.dpMappings,
            inferredCapabilities: [...new Set(capabilities)],
            isNew: parsed.manufacturer ? !localMfrs.has(parsed.manufacturer) : false,
          };

          allDevices.push(entry);
        }
      } catch (e) {
        console.error(`  [FAIL] ${file.name}: ${e.message}`);
      }
    }

    if (items.length < 100) break;
    page++;
  }

  // Summaries
  const newMfrs = allDevices
    .filter((d) => d.isNew && d.manufacturer)
    .map((d) => d.manufacturer);
  const uniqueNewMfrs = [...new Set(newMfrs)];

  const output = {
    timestamp: new Date().toISOString(),
    source: 'tuya-local',
    summary: {
      totalPages: pageCount,
      totalDevices: allDevices.length,
      uniqueManufacturers: [...new Set(allDevices.map((d) => d.manufacturer).filter(Boolean))].length,
      newManufacturers: uniqueNewMfrs.length,
      totalDpMappings: allDevices.reduce((sum, d) => sum + d.dpMappings.length, 0),
    },
    devices: allDevices.slice(0, 500),
    newManufacturers: uniqueNewMfrs.slice(0, 200),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  console.log(`Devices: ${allDevices.length}, New manufacturers: ${uniqueNewMfrs.length}`);

  // Save to cache
  if (cache) {
    cache.save(output);
    console.log(`Cache SAVED (TTL: 24h)`);
  }

  // P53: log diff cache stats
  if (diffCache) {
    const s = diffCache.getStats();
    console.log(`Diff cache stats: ${s.hits} hits, ${s.misses} misses, ${s.notModified} 304s, ${(s.bytesFetched/1024).toFixed(1)}KB fetched, ${(s.bytesCached/1024).toFixed(1)}KB cached`);
  }

  return output;
}

// ── Run if executed directly ─────────────────────────────────────────────
if (require.main === module) {
  scan().catch((e) => {
    console.error('Tuya-Local Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseYamlLight, ENTITY_TO_CAPABILITY, SENSOR_TYPE_MAP };
