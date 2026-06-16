#!/usr/bin/env node
'use strict';

/**
 * MFS Aggregator Engine v1.0.0
 * ==========================================================================
 * Fetches Tuya Zigbee manufacturer fingerprints from 10+ external sources,
 * cross-references them, and builds a unified database (mfs_db.json) with
 * variant support, confidence scoring, and diff reporting.
 *
 * Sources:
 *   1.  Local drivers (driver.compose.json)
 *   2.  Zigbee2MQTT (Koenkk z2m tuya.ts)
 *   3.  ZHA Quirks (Home Assistant)
 *   4.  Blakadder Zigbee Database
 *   5.  deCONZ / Phoscon
 *   6.  Hubitat Elevation
 *   7.  SmartThings
 *   8.  ioBroker Zigbee
 *   9.  Domoticz
 *  10.  zigpy / zigpy-znp
 *  11.  Community Issues & PRs
 *
 * Uses SHA-256 content hashing via CacheManager to avoid re-fetching unchanged
 * data. Outputs statistics, diff reports, and the unified mfs_db.json.
 *
 * Usage:
 *   node scripts/automation/mfs-aggregator.js [--force] [--source=z2m] [--verbose]
 *   node scripts/automation/mfs-aggregator.js --diff        # show last diff only
 *   node scripts/automation/mfs-aggregator.js --stats       # show stats only
 *   node scripts/automation/mfs-aggregator.js --invalidate  # clear all caches
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Paths ───────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const DRIVERS_DIR = path.join(REPO_ROOT, 'drivers');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'sources');
const MFS_DB_PATH = path.join(DATA_DIR, 'mfs_db.json');

// ── Lazy-load CacheManager (with inline fallback) ───────────────────────────
let CacheManager;
try {
  CacheManager = require(path.join(REPO_ROOT, 'lib', 'utils', 'CacheManager.js'));
} catch {
  // Inline minimal fallback so the script is self-contained even without CacheManager on disk
  const https = require('https');
  const http = require('http');
  CacheManager = class {
    constructor() {}
    async fetchOrGet(id, url) {
      return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, { headers: { 'User-Agent': 'TuyaUnifiedMFS/1.0' }, timeout: 30000 }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            return resolve(this.fetchOrGet(id, res.headers.location));
          }
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            resolve({
              data: body,
              cached: false,
              sha256: crypto.createHash('sha256').update(body).digest('hex'),
              sourceId: id,
            });
          });
        }).on('error', reject);
      });
    }
    invalidate() {}
    clearAll() {}
    stats() { return { entries: 0 }; }
  };
}

// ── Colours ─────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', W: '\x1b[37m', X: '\x1b[0m',
};
const log = (c, ...a) => console.log(`${c}${a.join(' ')}${C.X}`);

// ── CLI argument parsing ────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.some(a => a === `--${name}` || a === `-${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

const VERBOSE = FLAG('verbose');
const DIFF_ONLY = FLAG('diff');
const STATS_ONLY = FLAG('stats');
const INVALIDATE = FLAG('invalidate');
const SINGLE_SOURCE = OPT('source');

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SOURCES = {
  local: {
    name: 'Local driver.compose.json',
    fn: 'fetchLocal',
  },
  z2m: {
    name: 'Zigbee2MQTT (Koenkk)',
    fn: 'fetchZ2M',
    urls: {
      tuya: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
      index: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/index.ts',
    },
  },
  zha: {
    name: 'ZHA Quirks',
    fn: 'fetchZHA',
    urls: {
      devices: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
      ts0601: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0601.py',
    },
  },
  blakadder: {
    name: 'Blakadder Zigbee DB',
    fn: 'fetchBlakadder',
    urls: {
      devices: 'https://zigbee.blakadder.com/all.html',
    },
  },
  deconz: {
    name: 'deCONZ / Phoscon',
    fn: 'fetchDeconz',
    urls: {
      devices: 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices.json',
    },
  },
  hubitat: {
    name: 'Hubitat Drivers (kkossev)',
    fn: 'fetchHubitat',
    urls: {
      tuyaSwitches: 'https://api.github.com/repos/kkossev/Hubitat/git/trees/main?recursive=1',
    },
  },
  smartthings: {
    name: 'SmartThings Edge Drivers',
    fn: 'fetchSmartThings',
    urls: {
      tree: 'https://api.github.com/repos/SmartThingsCommunity/SmartThingsEdgeDrivers/git/trees/main?recursive=1',
      ikea: 'https://raw.githubusercontent.com/SmartThingsCommunity/SmartThingsEdgeDrivers/main/drivers/ikea-smart-control/zigbee/manufacturer-specific.yaml',
    },
  },
  ioBroker: {
    name: 'ioBroker Zigbee',
    fn: 'fetchIoBroker',
    urls: {
      devices: 'https://raw.githubusercontent.com/ioBroker/ioBroker.zigbee/main/lib/devices.js',
    },
  },
  domoticz: {
    name: 'Domoticz',
    fn: 'fetchDomoticz',
    urls: {
      zigbee: 'https://raw.githubusercontent.com/zigpy/zigpy-znp/dev/zigpy_znp/quirks/__init__.py',
    },
  },
  zigpy: {
    name: 'zigpy / zigpy-znp',
    fn: 'fetchZigpy',
    urls: {
      quirks: 'https://raw.githubusercontent.com/zigpy/zigpy-znp/dev/zigpy_znp/quirks/__init__.py',
    },
  },
  community: {
    name: 'Community Issues & PRs',
    fn: 'fetchCommunity',
    urls: {},
  },
  phoscon: {
    name: 'Phoscon Compatibility (1,090+ devices)',
    fn: 'fetchPhoscon',
    urls: {
      compatible: 'https://www.phoscon.de/en/conbee2/compatible',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function classToDeviceType(cls) {
  const map = {
    light: 'light', dimmable: 'light', switch: 'switch', fan: 'fan',
    sensor: 'sensor', thermostat: 'thermostat', cover: 'cover',
    lock: 'lock', remote: 'remote', siren: 'siren',
  };
  return map[cls] || 'unknown';
}

function inferPowerSource(compose) {
  const caps = compose.capabilities || [];
  if (caps.includes('measure_battery') || caps.includes('alarm_battery')) return 'battery';
  return 'mains';
}

/**
 * Extract Tuya variant prefixes from a manufacturer ID.
 * e.g. "_TZE200_abc123" -> ["_TZE200_"]
 */
function extractVariantPrefixes(mfrId) {
  const prefixes = [];
  const re = /^(_T[A-Z]{2,3}[0-9]{4})_/i;
  const m = re.exec(mfrId);
  if (m) prefixes.push(m[1] + '_');
  return prefixes;
}

/**
 * Build the "base" manufacturer ID by stripping the variant prefix.
 * Groups _TZE200_xyz and _TZE204_xyz together.
 */
function baseManufacturerId(mfrId) {
  return mfrId.replace(/^_T[A-Z]{2,3}[0-9]{4}_/i, '_BASE_');
}

/**
 * Compute confidence score: unique_sources / total_sources (capped at 1.0).
 */
function computeConfidence(device, totalSources) {
  return Math.min(1.0, device.sources.size / Math.max(totalSources, 1));
}

function hashEntry(entry) {
  const str = JSON.stringify({
    manufacturerId: entry.manufacturerId,
    modelIds: [...(entry.modelIds || [])].sort(),
    sources: [...(entry.sources || [])].sort(),
    driverHint: entry.driverHint,
    deviceType: entry.deviceType,
    capabilities: [...(entry.capabilities || [])].sort(),
    powerSource: entry.powerSource,
  });
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. LOCAL - Extract fingerprints from all driver.compose.json files
 */
function fetchLocal() {
  const entries = [];
  if (!fs.existsSync(DRIVERS_DIR)) return entries;

  const drivers = fs.readdirSync(DRIVERS_DIR);
  for (const driverId of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const manufacturerNames = (compose.zigbee && compose.zigbee.manufacturerName) || [];
      const productIds = (compose.zigbee && compose.zigbee.productId) || [];
      const capabilities = compose.capabilities || [];
      const deviceClass = compose.class || 'other';

      for (const mfr of manufacturerNames) {
        entries.push({
          manufacturerId: mfr.toLowerCase(),
          modelId: productIds[0] || 'unknown',
          driverHint: driverId,
          deviceType: classToDeviceType(deviceClass),
          capabilities,
          powerSource: inferPowerSource(compose),
          source: 'local',
          raw: { driverId, productIds, allManufacturerNames: manufacturerNames },
        });
      }
    } catch {
      /* skip malformed compose */
    }
  }
  return entries;
}

/**
 * 2. Z2M - Parse Zigbee2MQTT TypeScript definitions for Tuya
 */
async function fetchZ2M(cache) {
  const entries = [];
  const urls = SOURCES.z2m.urls;

  try {
    const tuyaSource = await cache.fetchOrGet('z2m-tuya', urls.tuya);
    const results = extractFromTuyaTs(tuyaSource.data, 'z2m-tuya');
    for (const r of results) {
      entries.push({ ...r, source: 'z2m', raw: { file: 'tuya.ts' } });
    }
  } catch (e) {
    log(C.Y, `[Z2M] tuya.ts fetch failed: ${e.message}`);
  }

  try {
    const indexSource = await cache.fetchOrGet('z2m-index', urls.index);
    const tuyaRefs = extractTuyaRefsFromIndex(indexSource.data);
    for (const ref of tuyaRefs) {
      entries.push({
        manufacturerId: ref.manufacturerId.toLowerCase(),
        modelId: ref.modelId,
        driverHint: 'unknown',
        deviceType: ref.deviceType || 'unknown',
        capabilities: [],
        source: 'z2m',
        raw: { file: 'index.ts', reference: ref.original },
      });
    }
  } catch (e) {
    log(C.Y, `[Z2M] index.ts fetch failed: ${e.message}`);
  }

  return entries;
}

function extractFromTuyaTs(source, sourceName) {
  const results = [];
  const seen = new Set();

  // Extract manufacturerName from fingerprint blocks
  const mfrRe = /manufacturerName:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = mfrRe.exec(source)) !== null) {
    const key = `mfr:${m[1].toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      manufacturerId: m[1],
      modelId: 'TS0601',
      driverHint: 'unknown',
      deviceType: 'unknown',
      capabilities: [],
      source: sourceName,
    });
  }

  // Extract zigbeeModel arrays
  const modelRe = /zigbeeModel:\s*\[([^\]]+)\]/g;
  while ((m = modelRe.exec(source)) !== null) {
    const inner = m[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let s;
    while ((s = strRe.exec(inner)) !== null) {
      if (s[1].length > 1 && !seen.has(`pid:${s[1]}`)) {
        seen.add(`pid:${s[1]}`);
        results.push({
          manufacturerId: null,
          modelId: s[1],
          driverHint: 'unknown',
          deviceType: 'unknown',
          capabilities: [],
          source: sourceName,
        });
      }
    }
  }

  // Extract _TZ patterns from string literals
  const tzRe = /(_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)/g;
  while ((m = tzRe.exec(source)) !== null) {
    const key = `mfr:${m[1].toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        manufacturerId: m[1],
        modelId: 'TS0601',
        driverHint: 'unknown',
        deviceType: 'unknown',
        capabilities: [],
        source: sourceName,
      });
    }
  }

  return results;
}

function extractTuyaRefsFromIndex(source) {
  const refs = [];
  const re = /['"]([^'"]*_T[SEZ][A-Z0-9]*_[a-zA-Z0-9]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    refs.push({
      manufacturerId: m[1],
      modelId: 'TS0601',
      deviceType: 'unknown',
      original: m[0],
    });
  }
  return refs;
}

/**
 * 3. ZHA - Parse ZHA device handler quirks for Tuya devices
 */
async function fetchZHA(cache) {
  const entries = [];
  const urls = SOURCES.zha.urls;
  const seen = new Set();

  for (const [key, url] of Object.entries(urls)) {
    try {
      const res = await cache.fetchOrGet(`zha-${key}`, url);
      const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;
      let m;
      while ((m = tzRe.exec(res.data)) !== null) {
        const mfr = m[1];
        if (seen.has(mfr)) continue;
        seen.add(mfr);
        entries.push({
          manufacturerId: mfr,
          modelId: 'TS0601',
          driverHint: 'unknown',
          deviceType: 'unknown',
          capabilities: [],
          source: 'zha',
          raw: { file: key },
        });
      }
    } catch (e) {
      log(C.Y, `[ZHA] ${key} fetch failed: ${e.message}`);
    }
  }
  return entries;
}

/**
 * 4. BLAKADDER - Community Zigbee database (HTML scraping)
 */
async function fetchBlakadder(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('blakadder-devices', SOURCES.blakadder.urls.devices);
    const html = res.data;

    // Extract table rows from HTML: look for <td> elements with manufacturer/model data
    // Blakadder HTML format: rows in <table> with manufacturer, model, device type columns
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(html)) !== null) {
      const rowHtml = rowMatch[1];
      const cells = [];
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
        // Strip HTML tags from cell content
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
      }

      if (cells.length >= 2) {
        const mfr = cells[0] || '';
        const model = cells[1] || '';
        const category = cells[2] || '';
        if (!mfr || mfr.length < 2) continue;

        entries.push({
          manufacturerId: mfr.toLowerCase(),
          modelId: model,
          driverHint: 'unknown',
          deviceType: categorizeBlakadderType({ category }),
          capabilities: [],
          source: 'blakadder',
          raw: { cells },
        });
      }
    }

    // Also try JSON parsing (fallback if page structure changed back)
    if (entries.length === 0 && html.trim().startsWith('[')) {
      const devices = JSON.parse(html);
      for (const dev of (Array.isArray(devices) ? devices : [])) {
        const mfr = dev.manufacturer || dev.vendor || '';
        const model = dev.model || dev.modelId || '';
        if (!mfr) continue;
        entries.push({
          manufacturerId: mfr.toLowerCase(),
          modelId: model,
          driverHint: 'unknown',
          deviceType: categorizeBlakadderType(dev),
          capabilities: [],
          source: 'blakadder',
          raw: { original: dev },
        });
      }
    }
  } catch (e) {
    log(C.Y, `[Blakadder] fetch failed: ${e.message}`);
  }
  return entries;
}

function categorizeBlakadderType(dev) {
  const cat = (dev.category || dev.type || '').toLowerCase();
  if (cat.includes('sensor')) return 'sensor';
  if (cat.includes('switch') || cat.includes('relay')) return 'switch';
  if (cat.includes('light') || cat.includes('bulb') || cat.includes('lamp')) return 'light';
  if (cat.includes('cover') || cat.includes('blind') || cat.includes('shutter')) return 'cover';
  if (cat.includes('thermostat') || cat.includes('climate')) return 'thermostat';
  if (cat.includes('remote') || cat.includes('button')) return 'remote';
  return 'unknown';
}

/**
 * 5. DECONZ - Phoscon device database
 */
async function fetchDeconz(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('deconz-devices', SOURCES.deconz.urls.devices);
    const devices = JSON.parse(res.data);

    for (const dev of (Array.isArray(devices) ? devices : [])) {
      const mfr = dev.manufacturer || dev.vendor || '';
      const model = dev.model || '';
      if (!mfr || !mfr.toLowerCase().includes('tuya')) continue;

      entries.push({
        manufacturerId: mfr.toLowerCase(),
        modelId: model,
        driverHint: 'unknown',
        deviceType: 'unknown',
        capabilities: [],
        source: 'deconz',
        raw: { original: dev },
      });
    }
  } catch (e) {
    log(C.Y, `[deCONZ] fetch failed: ${e.message}`);
  }
  return entries;
}

/**
 * 6. HUBITAT - kkossev Hubitat drivers (GitHub API tree)
 */
async function fetchHubitat(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('hubitat-tree', SOURCES.hubitat.urls.tuyaSwitches);
    const tree = JSON.parse(res.data);

    // Find Groovy driver files that likely contain Tuya manufacturer IDs
    const tuyaFiles = (tree.tree || [])
      .filter(item => item.path && item.type === 'blob' &&
        item.path.endsWith('.groovy') &&
        (item.path.toLowerCase().includes('tuya') ||
         item.path.toLowerCase().includes('switch') ||
         item.path.toLowerCase().includes('blind') ||
         item.path.toLowerCase().includes('cover') ||
         item.path.toLowerCase().includes('curtain')));
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;

    for (const file of tuyaFiles.slice(0, 50)) { // Limit to 50 files to avoid rate limits
      try {
        const rawUrl = `https://raw.githubusercontent.com/kkossev/Hubitat/main/${file.path}`;
        const fileRes = await cache.fetchOrGet(`hubitat-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`, rawUrl);
        let m;
        while ((m = tzRe.exec(fileRes.data)) !== null) {
          entries.push({
            manufacturerId: m[1],
            modelId: 'TS0601',
            driverHint: path.basename(file.path, '.groovy'),
            deviceType: inferTypeFromPath(file.path),
            capabilities: [],
            source: 'hubitat',
            raw: { file: file.path },
          });
        }
      } catch {
        /* skip individual file fetch failures */
      }
    }
  } catch (e) {
    log(C.Y, `[Hubitat] fetch failed: ${e.message}`);
  }
  return entries;
}

function inferTypeFromPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes('switch') || lower.includes('relay')) return 'switch';
  if (lower.includes('blind') || lower.includes('cover') || lower.includes('curtain')) return 'cover';
  if (lower.includes('light') || lower.includes('bulb') || lower.includes('dimmer')) return 'light';
  if (lower.includes('sensor') || lower.includes('temp')) return 'sensor';
  if (lower.includes('thermostat') || lower.includes('climate')) return 'thermostat';
  return 'unknown';
}

/**
 * 7. SMARTTHINGS - SmartThingsEdgeDrivers (GitHub API tree)
 */
async function fetchSmartThings(cache) {
  const entries = [];
  const seen = new Set();

  // First, try fetching the IKEA manufacturer-specific.yaml (existing approach)
  try {
    const res = await cache.fetchOrGet('smartthings-ikea', SOURCES.smartthings.urls.ikea);
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;
    let m;
    while ((m = tzRe.exec(res.data)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        entries.push({
          manufacturerId: m[1],
          modelId: 'TS0601',
          driverHint: 'ikea-smart-control',
          deviceType: 'unknown',
          capabilities: [],
          source: 'smartthings',
          raw: { file: 'ikea-smart-control/.../manufacturer-specific.yaml' },
        });
      }
    }
  } catch (e) {
    log(C.Y, `[SmartThings] ikea yaml fetch failed: ${e.message}`);
  }

  // Then fetch the repo tree to find all YAML files in zigbee directories
  try {
    const res = await cache.fetchOrGet('smartthings-tree', SOURCES.smartthings.urls.tree);
    const tree = JSON.parse(res.data);

    const yamlFiles = (tree.tree || [])
      .filter(item => item.path && item.type === 'blob' &&
        item.path.endsWith('.yaml') &&
        item.path.includes('zigbee') &&
        (item.path.includes('manufacturer') || item.path.includes('profile')));
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;

    for (const file of yamlFiles.slice(0, 100)) { // Limit to avoid rate limits
      try {
        const rawUrl = `https://raw.githubusercontent.com/SmartThingsCommunity/SmartThingsEdgeDrivers/main/${file.path}`;
        const fileRes = await cache.fetchOrGet(`smartthings-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`, rawUrl);
        let m;
        while ((m = tzRe.exec(fileRes.data)) !== null) {
          if (!seen.has(m[1])) {
            seen.add(m[1]);
            entries.push({
              manufacturerId: m[1],
              modelId: 'TS0601',
              driverHint: file.path.split('/').slice(-2, -1)[0] || 'unknown',
              deviceType: 'unknown',
              capabilities: [],
              source: 'smartthings',
              raw: { file: file.path },
            });
          }
        }
      } catch {
        /* skip individual file failures */
      }
    }
  } catch (e) {
    log(C.Y, `[SmartThings] tree fetch failed: ${e.message}`);
  }
  return entries;
}

/**
 * 8. ioBROKER - Zigbee adapter device list
 */
async function fetchIoBroker(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('iobroker-zigbee', SOURCES.ioBroker.urls.devices);
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;
    let m;
    while ((m = tzRe.exec(res.data)) !== null) {
      entries.push({
        manufacturerId: m[1],
        modelId: 'TS0601',
        driverHint: 'unknown',
        deviceType: 'unknown',
        capabilities: [],
        source: 'ioBroker',
      });
    }
    const modelRe = /model['":\s]+['"]((?:TS|ZG|TY)\w+)['"]/g;
    while ((m = modelRe.exec(res.data)) !== null) {
      entries.push({
        manufacturerId: null,
        modelId: m[1],
        driverHint: 'unknown',
        deviceType: 'unknown',
        capabilities: [],
        source: 'ioBroker',
      });
    }
  } catch (e) {
    log(C.Y, `[ioBroker] fetch failed: ${e.message}`);
  }
  return entries;
}

/**
 * 9. DOMOTICZ - Zigbee plugin devices
 */
async function fetchDomoticz(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('domoticz-zigbee', SOURCES.domoticz.urls.zigbee);
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;
    let m;
    while ((m = tzRe.exec(res.data)) !== null) {
      entries.push({
        manufacturerId: m[1],
        modelId: 'TS0601',
        driverHint: 'unknown',
        deviceType: 'unknown',
        capabilities: [],
        source: 'domoticz',
      });
    }
  } catch (e) {
    log(C.Y, `[Domoticz] fetch failed: ${e.message}`);
  }
  return entries;
}

/**
 * 10. ZIGPY - zigpy-znp quirks
 */
async function fetchZigpy(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('zigpy-quirks', SOURCES.zigpy.urls.quirks);
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;
    let m;
    while ((m = tzRe.exec(res.data)) !== null) {
      entries.push({
        manufacturerId: m[1],
        modelId: 'TS0601',
        driverHint: 'unknown',
        deviceType: 'unknown',
        capabilities: [],
        source: 'zigpy',
      });
    }
  } catch (e) {
    log(C.Y, `[zigpy] fetch failed: ${e.message}`);
  }
  return entries;
}

/**
 * 12. PHOSCON - ConBee/deCONZ compatible devices (HTML scraping)
 */
async function fetchPhoscon(cache) {
  const entries = [];
  try {
    const res = await cache.fetchOrGet('phoscon-compatible', SOURCES.phoscon.urls.compatible);
    const html = res.data;

    // Extract manufacturer IDs from the compatibility page
    // Look for _T patterns in the HTML content
    const tzRe = /['"](_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+)['"]/g;
    let m;
    const seen = new Set();
    while ((m = tzRe.exec(html)) !== null) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      entries.push({
        manufacturerId: m[1],
        modelId: 'TS0601',
        driverHint: 'phoscon',
        deviceType: 'unknown',
        capabilities: [],
        source: 'phoscon',
      });
    }

    // Also extract from table rows (Phoscon uses HTML tables for device listings)
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(html)) !== null) {
      const cells = [];
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length >= 2) {
        const mfr = cells[0] || '';
        const model = cells[1] || '';
        if (mfr && mfr.length > 2 && !seen.has(mfr.toLowerCase())) {
          seen.add(mfr.toLowerCase());
          entries.push({
            manufacturerId: mfr.toLowerCase(),
            modelId: model,
            driverHint: 'phoscon',
            deviceType: 'unknown',
            capabilities: [],
            source: 'phoscon',
            raw: { cells },
          });
        }
      }
    }
  } catch (e) {
    log(C.Y, `[Phoscon] fetch failed: ${e.message}`);
  }
  return entries;
}

/**
 * 11. COMMUNITY - GitHub issues / PRs fingerprints from local enrichment reports
 */
function fetchCommunity() {
  const entries = [];
  const reportFiles = [
    'COMMUNITY_ENRICHMENT_REPORT.json',
    'PHASE2_ENRICHMENT_REPORT.json',
    'community-intel.json',
  ];
  for (const rf of reportFiles) {
    const fp = path.join(DATA_DIR, rf);
    if (!fs.existsSync(fp)) continue;
    try {
      const report = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const json = JSON.stringify(report);
      const tzRe = /_T[SEZ][A-Z0-9]{4}_[a-zA-Z0-9]+/g;
      let m;
      const seen = new Set();
      while ((m = tzRe.exec(json)) !== null) {
        const mfr = m[0];
        if (seen.has(mfr)) continue;
        seen.add(mfr);
        entries.push({
          manufacturerId: mfr,
          modelId: 'TS0601',
          driverHint: 'unknown',
          deviceType: 'unknown',
          capabilities: [],
          source: 'community',
        });
      }
    } catch {
      /* skip */
    }
  }
  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-REFERENCE & MERGE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function mergeEntries(allEntries) {
  const deviceMap = new Map();

  for (const entry of allEntries) {
    const mfr = (entry.manufacturerId || '').toLowerCase();
    if (!mfr) continue;

    const key = mfr;
    const variants = extractVariantPrefixes(mfr);

    if (!deviceMap.has(key)) {
      deviceMap.set(key, {
        manufacturerId: mfr,
        modelIds: new Set(),
        sources: new Map(),
        driverHint: entry.driverHint,
        deviceType: entry.deviceType,
        capabilities: new Set(entry.capabilities || []),
        powerSource: entry.powerSource || 'unknown',
        variants: new Set(variants),
        lastSeen: null,
      });
    }

    const dev = deviceMap.get(key);

    if (entry.modelId && entry.modelId !== 'unknown') {
      dev.modelIds.add(entry.modelId);
    }

    if (!dev.sources.has(entry.source)) {
      dev.sources.set(entry.source, { count: 0, details: [] });
    }
    const src = dev.sources.get(entry.source);
    src.count++;
    if (src.details.length < 5) src.details.push(entry.raw || {});

    if (entry.source === 'local' && entry.driverHint && entry.driverHint !== 'unknown') {
      dev.driverHint = entry.driverHint;
    }
    if (entry.deviceType && entry.deviceType !== 'unknown' && dev.deviceType === 'unknown') {
      dev.deviceType = entry.deviceType;
    }
    for (const cap of (entry.capabilities || [])) {
      dev.capabilities.add(cap);
    }
    if (entry.powerSource && entry.powerSource !== 'unknown' && dev.powerSource === 'unknown') {
      dev.powerSource = entry.powerSource;
    }
    for (const v of variants) dev.variants.add(v);

    dev.lastSeen = new Date().toISOString();
  }

  return { deviceMap };
}

/**
 * Group related manufacturer IDs by their variant root.
 */
function groupVariants(deviceMap) {
  const groups = new Map();
  for (const [key, dev] of deviceMap) {
    const base = baseManufacturerId(dev.manufacturerId);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(key);
  }
  return groups;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIFF ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function computeDiff(oldDevices, newDevices) {
  const added = [];
  const removed = [];
  const modified = [];

  const oldKeys = new Set(Object.keys(oldDevices || {}));
  const newKeys = new Set(Object.keys(newDevices || {}));

  for (const k of newKeys) {
    if (!oldKeys.has(k)) {
      added.push(k);
    } else {
      const oldHash = hashEntry(oldDevices[k]);
      const newHash = hashEntry(newDevices[k]);
      if (oldHash !== newHash) modified.push(k);
    }
  }
  for (const k of oldKeys) {
    if (!newKeys.has(k)) removed.push(k);
  }

  return { added, removed, modified };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

function buildStats(deviceMap) {
  const totalEntries = deviceMap.size;
  let totalVariants = 0;
  const bySource = {};
  const byType = {};
  let multiSource = 0;

  for (const [, dev] of deviceMap) {
    totalVariants += dev.variants.size;
    for (const [src] of dev.sources) {
      bySource[src] = (bySource[src] || 0) + 1;
    }
    byType[dev.deviceType] = (byType[dev.deviceType] || 0) + 1;
    if (dev.sources.size >= 2) multiSource++;
  }

  return {
    totalEntries,
    totalVariants,
    entriesBySource: bySource,
    entriesByDeviceType: byType,
    coveragePercent: totalEntries > 0 ? Math.round((multiSource / totalEntries) * 100) : 0,
    multiSourceCount: multiSource,
    lastAggregation: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  log(C.B, '====================================================================');
  log(C.G, '  MFS Aggregator Engine v1.0.0');
  log(C.G, '  Manufacturer Fingerprint Schema - Unified Database Builder');
  log(C.B, '====================================================================');
  console.log('');

  // Ensure directories
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Handle --invalidate
  if (INVALIDATE) {
    const cache = new CacheManager(CACHE_DIR);
    cache.clearAll();
    log(C.G, 'Cache cleared.');
    return;
  }

  // Load existing DB for diff
  let existingDb = null;
  if (fs.existsSync(MFS_DB_PATH)) {
    try {
      existingDb = JSON.parse(fs.readFileSync(MFS_DB_PATH, 'utf8'));
    } catch {
      /* empty db */
    }
  }

  // Handle --diff
  if (DIFF_ONLY && existingDb && existingDb.diff) {
    console.log('\nLast Diff Report:');
    console.log(JSON.stringify(existingDb.diff, null, 2));
    return;
  }

  // Handle --stats
  if (STATS_ONLY && existingDb && existingDb.stats) {
    console.log('\nCurrent Statistics:');
    console.log(JSON.stringify(existingDb.stats, null, 2));
    return;
  }

  // Initialise cache manager
  const cache = new CacheManager(CACHE_DIR);

  // Determine which sources to fetch
  const sourceKeys = SINGLE_SOURCE
    ? [SINGLE_SOURCE]
    : Object.keys(SOURCES);

  // ── Phase 1: Fetch all sources ──────────────────────────────────────────
  log(C.Y, '\n[Phase 1/4] Fetching data from sources...\n');

  const allEntries = [];
  const sourceStats = {};

  for (const srcKey of sourceKeys) {
    const srcDef = SOURCES[srcKey];
    if (!srcDef) {
      log(C.R, `  Unknown source: ${srcKey}`);
      continue;
    }

    log(C.W, `  Fetching: ${srcDef.name} ...`);
    const startMs = Date.now();

    try {
      let entries;
      if (srcDef.fn === 'fetchLocal') {
        entries = fetchLocal();
      } else if (srcDef.fn === 'fetchCommunity') {
        entries = fetchCommunity();
      } else {
        // All other sources are async and take cache as argument
        const fn = module.exports[srcDef.fn];
        if (typeof fn === 'function') {
          entries = await fn(cache);
        } else {
          // Resolve function by name from module scope (no eval)
          const fnRef = typeof globalThis[srcDef.fn] === 'function' ? globalThis[srcDef.fn] : null;
          if (fnRef) {
            entries = await fnRef(cache);
          } else {
            log(C.R, `    SKIP: Unknown source function "${srcDef.fn}"`);
            entries = [];
          }
        }
      }

      const elapsed = Date.now() - startMs;
      allEntries.push(...entries);
      sourceStats[srcKey] = { count: entries.length, elapsedMs: elapsed, ok: true };
      log(C.G, `    OK: ${entries.length} entries (${elapsed}ms)`);
    } catch (e) {
      const elapsed = Date.now() - startMs;
      sourceStats[srcKey] = { count: 0, elapsedMs: elapsed, ok: false, error: e.message };
      log(C.R, `    FAIL: ${e.message} (${elapsed}ms)`);
    }
  }

  // ── Phase 2: Cross-reference & merge ────────────────────────────────────
  log(C.Y, '\n[Phase 2/4] Cross-referencing & merging...\n');

  const { deviceMap } = mergeEntries(allEntries);
  log(C.G, `  Merged ${deviceMap.size} unique manufacturer IDs from ${allEntries.length} raw entries`);

  const variantGroups = groupVariants(deviceMap);
  const groupCount = [...variantGroups.values()].filter(g => g.length > 1).length;
  log(C.G, `  Found ${groupCount} variant groups (shared root manufacturer IDs)`);

  // ── Phase 3: Build unified database ─────────────────────────────────────
  log(C.Y, '\n[Phase 3/4] Building unified database...\n');

  const totalSources = Object.keys(SOURCES).length;
  const devices = {};
  const driverMapping = {};

  for (const [key, dev] of deviceMap) {
    const confidence = computeConfidence(dev, totalSources);
    devices[key] = {
      manufacturerId: dev.manufacturerId,
      modelIds: [...dev.modelIds],
      variants: [...dev.variants],
      deviceType: dev.deviceType,
      driverHint: dev.driverHint,
      capabilities: [...dev.capabilities],
      powerSource: dev.powerSource,
      sources: [...dev.sources.keys()],
      sourceDetails: Object.fromEntries(
        [...dev.sources].map(([s, d]) => [s, d.count])
      ),
      confidence: Math.round(confidence * 100) / 100,
      lastSeen: dev.lastSeen,
    };

    if (dev.driverHint && dev.driverHint !== 'unknown') {
      if (!driverMapping[dev.driverHint]) {
        driverMapping[dev.driverHint] = { manufacturerIds: [], modelIds: [], deviceType: dev.deviceType };
      }
      driverMapping[dev.driverHint].manufacturerIds.push(dev.manufacturerId);
      for (const mid of dev.modelIds) {
        if (!driverMapping[dev.driverHint].modelIds.includes(mid)) {
          driverMapping[dev.driverHint].modelIds.push(mid);
        }
      }
    }
  }

  // ── Phase 4: Write database ─────────────────────────────────────────────
  log(C.Y, '\n[Phase 4/4] Writing database...\n');

  const stats = buildStats(deviceMap);
  const diff = existingDb
    ? computeDiff(existingDb.devices, devices)
    : { added: Object.keys(devices), removed: [], modified: [] };

  // Update source metadata
  const updatedSources = {};
  for (const [key, srcDef] of Object.entries(SOURCES)) {
    updatedSources[key] = {
      name: srcDef.name,
      description: srcDef.fn,
      lastFetched: sourceStats[key]?.ok ? new Date().toISOString() : null,
      entryCount: sourceStats[key]?.count || 0,
      sha256: sourceStats[key]?.ok ? 'fetched' : null,
      status: sourceStats[key]?.ok ? 'ok' : (sourceStats[key] ? 'failed' : 'skipped'),
      error: sourceStats[key]?.error || null,
    };
  }

  const db = {
    _meta: {
      version: '1.0.0',
      description: 'MFS Unified Database - Manufacturer Fingerprint Schema',
      generatedAt: new Date().toISOString(),
      generator: 'mfs-aggregator v1.0.0',
    },
    sources: updatedSources,
    devices,
    driverMapping,
    stats,
    diff: {
      lastRun: new Date().toISOString(),
      added: diff.added.slice(0, 500),
      removed: diff.removed.slice(0, 500),
      modified: diff.modified.slice(0, 500),
      summary: {
        added: diff.added.length,
        removed: diff.removed.length,
        modified: diff.modified.length,
      },
    },
  };

  fs.writeFileSync(MFS_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  log(C.G, `  Written: ${MFS_DB_PATH}`);

  // ── Print summary ──────────────────────────────────────────────────────
  console.log('\n' + C.B + '='.repeat(60) + C.X);
  log(C.G, '  AGGREGATION COMPLETE');
  console.log(C.B + '='.repeat(60) + C.X);
  console.log('');
  log(C.W, `  Total unique devices:   ${C.G}${stats.totalEntries}`);
  log(C.W, `  Total variant prefixes: ${C.G}${stats.totalVariants}`);
  log(C.W, `  Multi-source coverage:  ${C.G}${stats.coveragePercent}% (${stats.multiSourceCount} entries)`);
  log(C.W, `  Diff: +${diff.added.length} added, -${diff.removed.length} removed, ~${diff.modified.length} modified`);
  console.log('');

  log(C.W, '  Source Breakdown:');
  for (const [key, stat] of Object.entries(sourceStats)) {
    const icon = stat.ok ? C.G : C.R;
    const label = SOURCES[key]?.name || key;
    log(icon, `    ${stat.ok ? '+' : '!'} ${label}: ${stat.count} entries (${stat.elapsedMs}ms)`);
  }

  console.log('');
  log(C.W, '  Device Type Breakdown:');
  for (const [type, count] of Object.entries(stats.entriesByDeviceType).sort((a, b) => b[1] - a[1])) {
    log(C.D, `    ${type}: ${count}`);
  }

  console.log('');
  if (VERBOSE) {
    log(C.W, '  Diff Details:');
    if (diff.added.length > 0) log(C.G, `    Added (${diff.added.length}): ${diff.added.slice(0, 10).join(', ')}${diff.added.length > 10 ? '...' : ''}`);
    if (diff.modified.length > 0) log(C.Y, `    Modified (${diff.modified.length}): ${diff.modified.slice(0, 10).join(', ')}${diff.modified.length > 10 ? '...' : ''}`);
    if (diff.removed.length > 0) log(C.R, `    Removed (${diff.removed.length}): ${diff.removed.slice(0, 10).join(', ')}${diff.removed.length > 10 ? '...' : ''}`);
  }

  console.log('');
  log(C.D, `  Database: ${MFS_DB_PATH}`);
  log(C.D, `  Cache:    ${CACHE_DIR}`);
  console.log('');

  return db;
}

// ── Expose fetch functions for testing / single-source mode ──────────────────
module.exports = {
  fetchLocal, fetchZ2M, fetchZHA, fetchBlakadder, fetchDeconz,
  fetchHubitat, fetchSmartThings, fetchIoBroker, fetchDomoticz,
  fetchZigpy, fetchCommunity, fetchPhoscon,
  mergeEntries, computeDiff, buildStats, extractVariantPrefixes,
};

// ── Run ─────────────────────────────────────────────────────────────────────
main().catch(err => {
  console.error(`\n${C.R}Fatal error in MFS Aggregator:${C.X}`, err);
  process.exit(1);
});
