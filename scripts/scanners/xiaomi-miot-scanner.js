#!/usr/bin/env node
/**
 * Xiaomi MIoT Scanner
 * Fetches device specs from miot-spec.com and Xiaomi GitHub repos.
 * Extracts manufacturer names, device properties, and maps to Homey capabilities.
 *
 * Run: node scripts/scanners/xiaomi-miot-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'xiaomi-miot-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'xiaomi-miot';

// P53: per-URL blob cache (persisted across GHA runs)
let DiffCache;
try { DiffCache = require('./diff-cache').DiffCache; } catch { /* fallback */ }
let diffCache;

// P53: bounded parallel fetcher
let fetchAll;
try { fetchAll = require('./concurrent-fetch').fetchAll; } catch { /* fallback */ }

const MIOT_SPEC_BASE = 'https://miot-spec.org/miot-spec-v2';
const MIOT_SPEC_INSTANCE = `${MIOT_SPEC_BASE}/instance`;
const MIOT_SPEC_ORG = 'https://miot-spec.org';

const MIOT_API = 'https://api.github.com';

// Known Xiaomi/MIoT repos on GitHub
const MIOT_REPOS = [
  { owner: 'Koenkk', repo: 'zigbee-herdsman-converters', path: 'src/devices/lumi.ts' },
  { owner: 'Avenitos', repo: 'zha_xiaomi' },
];

// MIoT spec device categories to scan
const MIOT_CATEGORIES = [
  'light', 'switch', 'sensor', 'thermostat', 'air-conditioner',
  'curtain', 'fan', 'humidifier', 'vacuum', 'lock',
  'camera', 'doorlock', 'water-heater', 'air-purifier',
  'electric-cooker', 'cleaner', 'washer', 'dryer',
];

// ── GitHub API authentication ────────────────────────────────────────────
const GH_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GH_HEADERS = {
  'User-Agent': 'HomeyTuyaScanner/1.0',
  'Accept': 'application/vnd.github.v3+json',
  ...(GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {}),
};

// ── HTTP helpers ─────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'HomeyTuyaScanner/1.0' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
      });
    }).on('error', reject);
  });
}

function fetchRaw(url) {
  if (diffCache) {
    return diffCache.fetchIfChanged(url, { timeout: 30000 })
      .then(r => r.body.toString('utf8'))
      .catch(() => fetchRawPlain(url));
  }
  return fetchRawPlain(url);
}

function fetchRawPlain(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'HomeyTuyaScanner/1.0' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRawPlain(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

// ── MIoT Spec property to Homey capability mapping ───────────────────────
const MIOT_PROPERTY_MAP = {
  // Xiaomi MIoT spec service types -> Homey capabilities
  'on': 'onoff',
  'brightness': 'dim',
  'color-temperature': 'light_temperature',
  'color': 'light_hue',
  'mode': null,
  'target-temperature': 'target_temperature',
  'current-temperature': 'measure_temperature',
  'current-humidity': 'measure_humidity',
  'target-humidity': null,
  'relative-humidity': 'measure_humidity',
  'pm2.5-density': 'measure_pm25',
  'co2-density': 'measure_co2',
  'tvoc-density': 'measure_voc',
  'illuminance': 'measure_luminance',
  'relative-voltage': 'measure_voltage',
  'electric-current': 'measure_current',
  'electric-power': 'measure_power',
  'consumed-energy': 'meter_power',
  'battery-level': 'measure_battery',
  'charging-state': null,
  'status': null,
  'fault': null,
  'mode-fan': 'fan_mode',
  'status-windowcovering': 'windowcovering_state',
  'target-position': 'dim',
  'position': 'dim',
};

// ── Parse MIoT spec response ─────────────────────────────────────────────
function parseMiotSpec(spec) {
  const result = {
    type: spec.type || null,
    description: spec.description || null,
    services: [],
    manufacturer: null,
    model: null,
    properties: [],
    actions: [],
  };

  if (!spec.services) return result;

  for (const service of spec.services) {
    const serviceResult = {
      iid: service.iid,
      type: service.type,
      description: service.description,
      properties: [],
      actions: [],
    };

    if (service.properties) {
      for (const prop of service.properties) {
        const propResult = {
          iid: prop.iid,
          type: prop.type,
          description: prop.description,
          format: prop.format,
          access: prop.access,
          unit: prop.unit,
          capability: MIOT_PROPERTY_MAP[prop.description] || null,
        };
        serviceResult.properties.push(propResult);
        result.properties.push(propResult);
      }
    }

    if (service.actions) {
      for (const action of service.actions) {
        serviceResult.actions.push({
          iid: action.iid,
          type: action.type,
          description: action.description,
        });
        result.actions.push({
          iid: action.iid,
          type: action.type,
          description: action.description,
        });
      }
    }

    result.services.push(serviceResult);
  }

  return result;
}

// ── Fetch MIoT spec for a device type ────────────────────────────────────
async function fetchMiotSpecDeviceType(typeUrl) {
  try {
    const spec = await httpGet(typeUrl);
    return parseMiotSpec(spec);
  } catch (e) {
    return null;
  }
}

// ── Scan MIoT spec database ──────────────────────────────────────────────
async function scanMiotSpec() {
  const allSpecs = [];

  console.log('Scanning miot-spec.org device categories...');

  // Fetch the spec index
  try {
    const index = await httpGet(`${MIOT_SPEC_BASE}`);
    if (index && index.services) {
      console.log(`  Found ${index.services.length} service types`);

      for (const service of index.services) {
        // Each service type URL contains device definitions
        const serviceSpec = await fetchMiotSpecDeviceType(service.type);
        if (serviceSpec && serviceSpec.type) {
          allSpecs.push({
            ...serviceSpec,
            category: service.description,
          });
        }
      }
    }
  } catch (e) {
    console.error(`  Error fetching spec index: ${e.message}`);
  }

  // Also try known device type URLs
  // P53: parallelize category fetches
  const categoryTasks = MIOT_CATEGORIES.map(async (category) => {
    try {
      const specUrl = `${MIOT_SPEC_BASE}/devicetype?type=urn:miot-spec-v2:device:${category}:0000A001`;
      const spec = await httpGet(specUrl);
      if (spec && spec.instances) {
        console.log(`  ${category}: ${spec.instances.length} device types`);
        // Parallelize instance fetches
        const instanceTasks = spec.instances.slice(0, 10).map(instance => {
          return fetchMiotSpecDeviceType(`${MIOT_SPEC_INSTANCE}/${instance.type}`)
            .then(deviceSpec => deviceSpec ? { ...deviceSpec, category, instance: instance.description } : null)
            .catch(() => null);
        });
        const deviceSpecs = fetchAll
          ? (await Promise.all(instanceTasks)).filter(Boolean)
          : (await (async () => {
              const out = [];
              for (const t of instanceTasks) { const r = await t; if (r) out.push(r); }
              return out;
            })());
        return deviceSpecs;
      }
    } catch (e) {
      // Category might not exist
    }
    return [];
  });

  const categoryResults = fetchAll
    ? (await Promise.all(categoryTasks)).flat()
    : (await (async () => {
        const out = [];
        for (const t of categoryTasks) {
          const r = await t;
          if (r) out.push(...r);
        }
        return out;
      })());
  allSpecs.push(...categoryResults);

  return allSpecs;
}

// ── Parse Z2M/TypeScript for Xiaomi fingerprints ────────────────────────
function parseZigbeeSource(source, filename) {
  const results = {
    manufacturerNames: [],
    modelIds: [],
    zigbeeModel: [],
  };

  // Extract manufacturerName strings
  const mfrRe = /manufacturerName:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = mfrRe.exec(source)) !== null) {
    results.manufacturerNames.push(match[1]);
  }

  // Extract zigbeeModel arrays
  const modelRe = /zigbeeModel:\s*\[([^\]]+)\]/g;
  while ((match = modelRe.exec(source)) !== null) {
    const inner = match[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let s;
    while ((s = strRe.exec(inner)) !== null) {
      if (s[1].length > 1) results.zigbeeModel.push(s[1]);
    }
  }

  // Extract model assignments
  const modelAssignRe = /model:\s*['"]([^'"]+)['"]/g;
  while ((match = modelAssignRe.exec(source)) !== null) {
    results.modelIds.push(match[1]);
  }

  results.manufacturerNames = [...new Set(results.manufacturerNames)];
  results.modelIds = [...new Set(results.modelIds)];
  results.zigbeeModel = [...new Set(results.zigbeeModel)];

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

// ── Main scanner ─────────────────────────────────────────────────────────
async function scan() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('=== Xiaomi MIoT Scanner ===');
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

  // P53: per-URL diff cache
  if (DiffCache) {
    diffCache = new DiffCache(CACHE_ID);
    console.log(`Diff cache: ${diffCache.listEntries().length} URLs already cached`);
  }

  const { mfrs: localMfrs, driverMap } = getLocalFingerprints();
  console.log(`Loaded ${localMfrs.size} local manufacturer fingerprints`);

  // 1. Scan miot-spec.org
  const miotSpecs = [];
  try {
    const specs = await scanMiotSpec();
    miotSpecs.push(...specs);
    console.log(`Scanned ${miotSpecs.length} MIoT spec entries`);
  } catch (e) {
    console.error(`Error scanning MIoT specs: ${e.message}`);
  }

  // 2. Scan Z2M for Xiaomi fingerprints
  const zigbeeDevices = [];
  const z2mFiles = [
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/lumi.ts',
  ];

  // P53: parallel fetch of z2m files (diff-cache aware)
  if (fetchAll && z2mFiles.length > 0) {
    const results = await fetchAll(z2mFiles, {
      concurrency: 5,
      timeout: 60000,
      perHost: { 'raw.githubusercontent.com': 20 },
    });
    for (let i = 0; i < z2mFiles.length; i++) {
      const fileUrl = z2mFiles[i];
      const r = results[i];
      if (r.error) {
        console.error(`Error fetching ${fileUrl}: ${r.error}`);
        continue;
      }
      try {
        const source = r.body.toString('utf8');
        const parsed = parseZigbeeSource(source, fileUrl.split('/').pop());
        zigbeeDevices.push(parsed);
        console.log(`Parsed ${fileUrl.split('/').pop()}: ${parsed.manufacturerNames.length} mfrs`);
      } catch (e) {
        console.error(`Error parsing ${fileUrl}: ${e.message}`);
      }
    }
  } else {
    for (const fileUrl of z2mFiles) {
      try {
        const source = await fetchRaw(fileUrl);
        const parsed = parseZigbeeSource(source, fileUrl.split('/').pop());
        zigbeeDevices.push(parsed);
        console.log(`Parsed ${fileUrl.split('/').pop()}: ${parsed.manufacturerNames.length} mfrs`);
      } catch (e) {
        console.error(`Error fetching ${fileUrl}: ${e.message}`);
      }
    }
  }

  // 3. Scan GitHub for additional Xiaomi data
  const ghSearchQueries = [
    'xiaomi zigbee manufacturerName lumi',
    'aqara zigbee manufacturer fingerprint',
  ];

  for (const query of ghSearchQueries) {
    try {
      const searchResult = await githubGet(`/search/code?q=${encodeURIComponent(query)}&per_page=10`);
      const items = searchResult.items || [];

      // Filter to .ts/.js only
      const candidates = items.filter(item => {
        if (!item.path || (!item.path.endsWith('.ts') && !item.path.endsWith('.js'))) return false;
        if (!item.repository?.full_name) return false;
        return true;
      });

      // P53: parallel fetch
      const fetchTasks = candidates.map(item => {
        const repoFullName = item.repository.full_name;
        const mainUrl = `https://raw.githubusercontent.com/${repoFullName}/main/${item.path}`;
        return fetchRaw(mainUrl)
          .then(body => ({ item, body, url: mainUrl }))
          .catch(() => {
            const masterUrl = `https://raw.githubusercontent.com/${repoFullName}/master/${item.path}`;
            return fetchRaw(masterUrl).then(body => ({ item, body, url: masterUrl })).catch(e => ({ item, error: e.message }));
          });
      });
      const fetched = fetchAll ? await Promise.all(fetchTasks) : await (async () => {
        const out = [];
        for (const t of fetchTasks) out.push(await t);
        return out;
      })();

      for (const r of fetched) {
        if (r.error || !r.body) continue;
        try {
          const source = typeof r.body === 'string' ? r.body : r.body.toString('utf8');
          const parsed = parseZigbeeSource(source, r.item.path);
          if (parsed.manufacturerNames.length > 0) {
            zigbeeDevices.push(parsed);
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (e) {
      console.error(`  Search error: ${e.message}`);
    }
  }

  // Merge all manufacturer names from zigbee sources
  const allZigbeeMfrs = [...new Set(zigbeeDevices.flatMap((d) => d.manufacturerNames))];
  const allZigbeeModels = [...new Set(zigbeeDevices.flatMap((d) => [...d.modelIds, ...d.zigbeeModel]))];

  // Cross-reference with local fingerprints
  const newFingerprints = allZigbeeMfrs.filter((m) => !localMfrs.has(m));
  const matchedFingerprints = allZigbeeMfrs.filter((m) => localMfrs.has(m));

  // Extract all unique MIoT properties with capability mappings
  const allProperties = miotSpecs.flatMap((s) => s.properties || []);
  const mappedProperties = allProperties.filter((p) => p.capability);
  const unmappedProperties = allProperties.filter((p) => !p.capability);

  const output = {
    timestamp: new Date().toISOString(),
    source: 'xiaomi-miot',
    summary: {
      miotSpecEntries: miotSpecs.length,
      miotProperties: allProperties.length,
      mappedCapabilities: mappedProperties.length,
      zigbeeManufacturerNames: allZigbeeMfrs.length,
      zigbeeModels: allZigbeeModels.length,
      newFingerprints: newFingerprints.length,
      matchedFingerprints: matchedFingerprints.length,
    },
    miotSpecs: miotSpecs.slice(0, 100),
    capabilityMappings: Object.entries(MIOT_PROPERTY_MAP).map(([prop, cap]) => ({
      miotProperty: prop,
      homeyCapability: cap,
    })),
    zigbeeFingerprints: allZigbeeMfrs.slice(0, 300).map((mfr) => {
      const match = localMfrs.has(mfr);
      return {
        manufacturer: mfr,
        localDrivers: match ? driverMap.get(mfr) : [],
        isNew: !match,
      };
    }),
    newFingerprints: newFingerprints.slice(0, 200),
    matchedFingerprints: matchedFingerprints.slice(0, 200),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  console.log(`MIoT specs: ${miotSpecs.length}, Zigbee mfrs: ${allZigbeeMfrs.length}, New: ${newFingerprints.length}`);

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
    console.error('Xiaomi MIoT Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseMiotSpec, MIOT_PROPERTY_MAP };
