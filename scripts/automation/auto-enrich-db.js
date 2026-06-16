#!/usr/bin/env node
'use strict';

/**
 * auto-enrich-db.js - Device Database Auto-Enricher v1.0.0
 * ==========================================================================
 * Reads all manufacturer names from Z2M, ZHA, deCONZ, Phoscon, and Blakadder,
 * cross-references with existing driver.compose.json fingerprints, identifies
 * new manufacturers not yet in the DB, and adds them with correct driverId
 * assignment. Logs all additions.
 *
 * Depends on:
 *   - url-cache-manager.js  (for cached fetching)
 *   - changelog-detector.js (for change detection)
 *   - mfs_db.json           (unified device database)
 *   - drivers/              (existing driver.compose.json files)
 *
 * Usage:
 *   node scripts/automation/auto-enrich-db.js                    # full enrichment
 *   node scripts/automation/auto-enrich-db.js --dry-run          # preview only
 *   node scripts/automation/auto-enrich-db.js --source=z2m       # single source
 *   node scripts/automation/auto-enrich-db.js --min-confidence=0.3
 *   node scripts/automation/auto-enrich-db.js --report           # JSON report
 *   node scripts/automation/auto-enrich-db.js --verbose
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Lazy-load dependencies ────────────────────────────────────────────────────
let UrlCacheManager;
try {
  UrlCacheManager = require('./url-cache-manager');
} catch {
  UrlCacheManager = null;
}

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(REPO_ROOT, 'drivers');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const MFS_DB_PATH = path.join(DATA_DIR, 'mfs_db.json');
const ENRICH_CACHE_DIR = path.join(REPO_ROOT, '.cache', 'devices');
const ENRICH_LOG = path.join(ENRICH_CACHE_DIR, 'enrichment-log.json');
const ENRICH_REPORT = path.join(ENRICH_CACHE_DIR, 'enrichment-report.json');

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m',
};
const log = (c, ...a) => console.log(`${c}[ENRICH]${C.X} ${a.join(' ')}`);

// ── CLI arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.some(a => a === `--${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

const DRY_RUN = FLAG('dry-run');
const VERBOSE = FLAG('verbose');
const REPORT_ONLY = FLAG('report');
const SINGLE_SOURCE = OPT('source');
const MIN_CONFIDENCE = parseFloat(OPT('min-confidence') || '0.15');

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SOURCE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const EXTERNAL_SOURCES = {
  z2m: {
    name: 'Zigbee2MQTT',
    urls: {
      tuya: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    },
  },
  zha: {
    name: 'ZHA Quirks',
    urls: {
      init: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
      ts0601: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0601.py',
    },
  },
  deconz: {
    name: 'deCONZ',
    urls: {
      devices: 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices.json',
    },
  },
  phoscon: {
    name: 'Phoscon',
    urls: {
      compatible: 'https://www.phoscon.de/en/conbee2/compatible',
    },
  },
  blakadder: {
    name: 'Blakadder',
    urls: {
      all: 'https://zigbee.blakadder.com/all.html',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER TYPE INFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer the most likely driver directory from a manufacturer ID and model ID.
 * Uses known Tuya product ID conventions and device type heuristics.
 */
function inferDriver(mfr, modelId, existingDrivers) {
  const pid = (modelId || '').toUpperCase();
  const ml = (mfr || '').toLowerCase();

  // Standard Tuya product ID mappings
  const PID_MAP = {
    'TS0001': 'switch_1gang',
    'TS0002': 'switch_2gang',
    'TS0003': 'switch_3gang',
    'TS0004': 'switch_4gang',
    'TS0005': 'button',
    'TS0011': 'dimmer_1gang',
    'TS0201': 'temperature_humidity_sensor',
    'TS0202': 'motion_sensor',
    'TS0203': 'contact_sensor',
    'TS0204': 'smoke_sensor',
    'TS0205': 'water_leak_sensor',
    'TS0207': 'water_leak_sensor',
    'TS0301': 'thermostat',
    'TS0302': 'thermostat',
    'TS0601': null, // generic, needs inference from name
    'TS130F': 'cover',
    'TS0501': 'light',
    'TS0502': 'light',
  };

  // Try exact PID match
  if (PID_MAP[pid] && PID_MAP[pid] !== null) {
    return PID_MAP[pid];
  }

  // Infer from manufacturer string patterns
  if (ml.includes('air_purifier') || ml.includes('airquality') || ml.includes('pm2.5') || ml.includes('pm25')) return 'air_purifier';
  if (ml.includes('thermostat') || ml.includes('trv') || ml.includes('radiator')) return 'thermostat';
  if (ml.includes('cover') || ml.includes('curtain') || ml.includes('blind')) return 'cover';
  if (ml.includes('dimmer') || ml.includes('dimmable')) return 'dimmer_1gang';
  if (ml.includes('motion') || ml.includes('pir') || ml.includes('occupancy')) return 'motion_sensor';
  if (ml.includes('contact') || ml.includes('door') || ml.includes('window')) return 'contact_sensor';
  if (ml.includes('smoke') || ml.includes('fire')) return 'smoke_sensor';
  if (ml.includes('water') || ml.includes('leak') || ml.includes('flood')) return 'water_leak_sensor';
  if (ml.includes('temp') || ml.includes('humidity') || ml.includes('th')) return 'temperature_humidity_sensor';
  if (ml.includes('light') || ml.includes('bulb') || ml.includes('lamp')) return 'bulb_dimmable';
  if (ml.includes('switch') || ml.includes('relay')) return 'switch_1gang';
  if (ml.includes('plug') || ml.includes('outlet') || ml.includes('socket')) return 'smart_plug';
  if (ml.includes('sensor') || ml.includes('measure')) return 'temperature_humidity_sensor';
  if (ml.includes('siren') || ml.includes('alarm')) return 'siren';
  if (ml.includes('lock')) return 'smart_lock';
  if (ml.includes('scene') || ml.includes('remote') || ml.includes('button')) return 'button';

  // PID-based fallbacks
  if (pid === 'TS0601') return 'switch_1gang'; // most common TS0601

  // Default: check if 'generic_diy' exists, otherwise 'switch_1gang'
  return existingDrivers.has('generic_diy') ? 'generic_diy' : 'switch_1gang';
}

/**
 * Check if a driver directory exists.
 */
function driverExists(driverId) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  return fs.existsSync(composePath);
}

/**
 * Get the set of all existing driver IDs.
 */
function getExistingDriverIds() {
  const ids = new Set();
  try {
    for (const d of fs.readdirSync(DRIVERS_DIR)) {
      if (fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()) {
        ids.add(d);
      }
    }
  } catch { /* ignore */ }
  return ids;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL FINGERPRINT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a map of all existing fingerprints: "mfr|pid" -> driverId
 */
function buildLocalFingerprintMap() {
  const map = new Map(); // key: "mfr_lower|pid" -> driverId
  const mfrSet = new Set(); // all known manufacturer names (lowercase)
  const pidSet = new Set(); // all known product IDs

  try {
    for (const driverId of fs.readdirSync(DRIVERS_DIR)) {
      const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      try {
        const compose = JSON.parse(fs.readFileSync(composePath));
        const mfrs = (compose.zigbee && compose.zigbee.manufacturerName) || [];
        const pids = (compose.zigbee && compose.zigbee.productId) || [];
        for (const m of mfrs) {
          mfrSet.add(m.toLowerCase());
          for (const p of pids) {
            map.set(`${m.toLowerCase()}|${p}`, driverId);
            pidSet.add(p);
          }
        }
      } catch { /* skip malformed */ }
    }
  } catch { /* ignore */ }

  return { map, mfrSet, pidSet };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSERS (one per source type)
// ═══════════════════════════════════════════════════════════════════════════════

function parseZ2M(source) {
  const results = [];
  const seen = new Set();
  const mfrRe = /manufacturerName:\s*['"]([^'"]+)['"]/g;
  const modelRe = /zigbeeModel:\s*\[([^\]]+)\]/g;
  let m;

  while ((m = mfrRe.exec(source)) !== null) {
    const key = m[1].toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ manufacturer: m[1], modelId: 'TS0601', source: 'z2m' });
    }
  }

  while ((m = modelRe.exec(source)) !== null) {
    const inner = m[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let s;
    while ((s = strRe.exec(inner)) !== null) {
      if (s[1].length > 1) {
        const key = `${s[1]}`;
        if (!seen.has(`model:${key}`)) {
          seen.add(`model:${key}`);
          results.push({ manufacturer: null, modelId: s[1], source: 'z2m' });
        }
      }
    }
  }

  return results;
}

function parseZHA(source) {
  const results = [];
  const seen = new Set();
  const mfrRe = /_MANUFACTURER.*?['"]([^'"]+)['"]/g;
  const modelRe = /(?:MODEL|model)\s*=\s*['"]([^'"]+)['"]/g;
  let m;

  while ((m = mfrRe.exec(source)) !== null) {
    const key = m[1].toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ manufacturer: m[1], modelId: null, source: 'zha' });
    }
  }

  while ((m = modelRe.exec(source)) !== null) {
    const key = m[1];
    if (!seen.has(`model:${key}`)) {
      seen.add(`model:${key}`);
      results.push({ manufacturer: null, modelId: key, source: 'zha' });
    }
  }

  return results;
}

function parseDeconz(source) {
  const results = [];
  const seen = new Set();

  try {
    const data = JSON.parse(source);
    const devices = Array.isArray(data) ? data : (data.devices || []);

    for (const dev of devices) {
      const mfr = dev.manufacturer_name || dev.vendor || null;
      const model = dev.modelid || dev.product || null;

      if (mfr) {
        const key = mfr.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ manufacturer: mfr, modelId: model, source: 'deconz' });
        }
      }
    }
  } catch {
    // Non-JSON or malformed, try regex
    const mfrRe = /"manufacturer_name"\s*:\s*"([^"]+)"/g;
    const modelRe = /"modelid"\s*:\s*"([^"]+)"/g;
    let m;

    while ((m = mfrRe.exec(source)) !== null) {
      const key = m[1].toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ manufacturer: m[1], modelId: null, source: 'deconz' });
      }
    }

    while ((m = modelRe.exec(source)) !== null) {
      const key = m[1];
      if (!seen.has(`model:${key}`)) {
        seen.add(`model:${key}`);
        results.push({ manufacturer: null, modelId: key, source: 'deconz' });
      }
    }
  }

  return results;
}

function parseHTML(source, sourceName) {
  const results = [];
  const seen = new Set();

  // Extract manufacturer-like strings from HTML
  const mfrRe = /(?:manufacturer|vendor|brand)[^>]*>\s*([A-Z][A-Za-z0-9\s&.-]+)/gi;
  const modelRe = /(?:model|product)[^>]*>\s*([A-Z][A-Za-z0-9\s&._-]+)/gi;
  let m;

  while ((m = mfrRe.exec(source)) !== null) {
    const val = m[1].trim();
    if (val.length > 2 && val.length < 80) {
      const key = val.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ manufacturer: val, modelId: null, source: sourceName });
      }
    }
  }

  while ((m = modelRe.exec(source)) !== null) {
    const val = m[1].trim();
    if (val.length > 1 && val.length < 60) {
      const key = `model:${val}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ manufacturer: null, modelId: val, source: sourceName });
      }
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safety filter: only auto-add manufacturers matching known patterns.
 */
const SAFE_MFR = /^(_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}|SONOFF|eWeLink|EWELINK|Tuya)$/i;

function isSafeManufacturer(mfr) {
  return SAFE_MFR.test(mfr);
}

/**
 * Load or create the enrichment log.
 */
function loadEnrichLog() {
  try {
    if (fs.existsSync(ENRICH_LOG)) {
      return JSON.parse(fs.readFileSync(ENRICH_LOG));
    }
  } catch { /* ignore */ }
  return { entries: [], lastRun: null };
}

function saveEnrichLog(logData) {
  if (!fs.existsSync(ENRICH_CACHE_DIR)) {
    fs.mkdirSync(ENRICH_CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(ENRICH_LOG, JSON.stringify(logData, null, 2));
}

/**
 * Main enrichment function.
 */
async function enrich() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  AUTO-ENRICH DB v1.0.0 ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  // Build local fingerprint map
  const { map: localMap, mfrSet: localMfrs, pidSet: localPids } = buildLocalFingerprintMap();
  const existingDrivers = getExistingDriverIds();

  log(C.B, `Local fingerprints: ${localMfrs.size} manufacturers, ${localPids.size} product IDs, ${localMap.size} combinations`);

  // Fetch and parse external sources
  let cache = null;
  if (UrlCacheManager) {
    cache = new UrlCacheManager({ verbose: VERBOSE });
  }

  const allExternalEntries = [];
  const sourcesToCheck = SINGLE_SOURCE
    ? { [SINGLE_SOURCE]: EXTERNAL_SOURCES[SINGLE_SOURCE] }
    : EXTERNAL_SOURCES;

  for (const [sourceId, sourceDef] of Object.entries(sourcesToCheck)) {
    log(C.D, `Fetching ${sourceDef.name}...`);

    for (const [subKey, url] of Object.entries(sourceDef.urls)) {
      const fetchId = `${sourceId}-${subKey}`;
      let data;

      try {
        if (cache) {
          const result = await cache.fetchOrGet(fetchId, url);
          data = result.data;
        } else {
          // Inline fetch fallback
          const https = require('https');
          data = await new Promise((resolve, reject) => {
            https.get(url, { timeout: 60000, headers: { 'User-Agent': 'AutoEnrich/1.0' } }, (res) => {
              if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
              let body = '';
              res.on('data', c => body += c);
              res.on('end', () => resolve(body));
            }).on('error', reject);
          });
        }

        // Parse based on source type
        let entries = [];
        if (sourceId === 'z2m') entries = parseZ2M(data);
        else if (sourceId === 'zha') entries = parseZHA(data);
        else if (sourceId === 'deconz') entries = parseDeconz(data);
        else entries = parseHTML(data, sourceId);

        allExternalEntries.push(...entries);
        log(C.G, `  ${sourceDef.name}/${subKey}: ${entries.length} entries`);

      } catch (err) {
        log(C.R, `  ${sourceDef.name}/${subKey}: FAILED - ${err.message}`);
      }
    }
  }

  log(C.B, `\nTotal external entries: ${allExternalEntries.length}`);

  // Cross-reference with local data
  const newManufacturers = [];
  const newCombinations = [];
  const existingManufacturers = [];
  const skippedUnsafe = [];

  // Group entries by manufacturer
  const byMfr = new Map();
  for (const entry of allExternalEntries) {
    if (entry.manufacturer) {
      const key = entry.manufacturer.toLowerCase();
      if (!byMfr.has(key)) byMfr.set(key, []);
      byMfr.get(key).push(entry);
    }
  }

  for (const [mfrLower, entries] of byMfr) {
    const mfrOriginal = entries[0].manufacturer;

    // Safety check
    if (!isSafeManufacturer(mfrOriginal)) {
      skippedUnsafe.push(mfrOriginal);
      continue;
    }

    // Check if already in local DB
    if (localMfrs.has(mfrLower)) {
      existingManufacturers.push(mfrOriginal);
      continue;
    }

    // New manufacturer found!
    const sources = [...new Set(entries.map(e => e.source))];
    const modelIds = [...new Set(entries.map(e => e.modelId).filter(Boolean))];
    const suggestedDriver = inferDriver(mfrOriginal, modelIds[0] || null, existingDrivers);

    newManufacturers.push({
      manufacturer: mfrOriginal,
      manufacturerLower: mfrLower,
      modelIds,
      sources,
      suggestedDriver,
      entryCount: entries.length,
    });
  }

  // Check for new model IDs that might belong to existing manufacturers
  for (const entry of allExternalEntries) {
    if (entry.modelId && entry.manufacturer) {
      const mfrLower = entry.manufacturer.toLowerCase();
      const key = `${mfrLower}|${entry.modelId}`;
      if (!localMap.has(key) && localMfrs.has(mfrLower)) {
        newCombinations.push({
          manufacturer: entry.manufacturer,
          modelId: entry.modelId,
          source: entry.source,
        });
      }
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ENRICHMENT RESULTS`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  New manufacturers:     ${C.G}${newManufacturers.length}${C.X}`);
  console.log(`  New model combos:      ${C.B}${newCombinations.length}${C.X}`);
  console.log(`  Already covered:       ${existingManufacturers.length}`);
  console.log(`  Skipped (unsafe mfr):  ${C.Y}${skippedUnsafe.length}${C.X}`);

  if (newManufacturers.length > 0) {
    console.log(`\n${C.G}New manufacturers to add:${C.X}`);
    for (const m of newManufacturers) {
      const driverStatus = driverExists(m.suggestedDriver) ? C.G + 'EXISTS' : C.Y + 'MISSING';
      console.log(`  ${m.manufacturer} -> ${m.suggestedDriver} [${driverStatus}] (${m.sources.join(', ')})`);
      if (m.modelIds.length > 0) {
        console.log(`    models: ${m.modelIds.join(', ')}`);
      }
    }
  }

  if (newCombinations.length > 0) {
    console.log(`\n${C.B}New model ID combinations for existing manufacturers:${C.X}`);
    for (const c of newCombinations.slice(0, 20)) {
      console.log(`  ${c.manufacturer} + ${c.modelId} (from ${c.source})`);
    }
    if (newCombinations.length > 20) {
      console.log(`  ... and ${newCombinations.length - 20} more`);
    }
  }

  if (skippedUnsafe.length > 0) {
    console.log(`\n${C.Y}Skipped (unsafe manufacturer pattern):${C.X}`);
    for (const m of skippedUnsafe.slice(0, 10)) {
      console.log(`  ${m}`);
    }
    if (skippedUnsafe.length > 10) {
      console.log(`  ... and ${skippedUnsafe.length - 10} more`);
    }
  }

  // ── Save enrichment data ───────────────────────────────────────────────────

  const enrichData = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    summary: {
      newManufacturers: newManufacturers.length,
      newCombinations: newCombinations.length,
      alreadyCovered: existingManufacturers.length,
      skippedUnsafe: skippedUnsafe.length,
    },
    newManufacturers,
    newCombinations: newCombinations.slice(0, 200), // cap for storage
  };

  if (!DRY_RUN && newManufacturers.length > 0) {
    // Save to cache/devices for downstream scripts
    if (!fs.existsSync(ENRICH_CACHE_DIR)) {
      fs.mkdirSync(ENRICH_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(ENRICH_REPORT, JSON.stringify(enrichData, null, 2));

    // Update enrichment log
    const enrichLog = loadEnrichLog();
    enrichLog.entries.push({
      timestamp: enrichData.timestamp,
      newCount: newManufacturers.length,
      sources: [...new Set(allExternalEntries.map(e => e.source))],
    });
    enrichLog.lastRun = enrichData.timestamp;
    saveEnrichLog(enrichLog);

    log(C.G, `Enrichment data saved to ${ENRICH_REPORT}`);
  }

  // GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = '## Auto-Enrichment Results\n\n';
    md += '| Metric | Count |\n|---|---|\n';
    md += `| New manufacturers | ${newManufacturers.length} |\n`;
    md += `| New model combos | ${newCombinations.length} |\n`;
    md += `| Already covered | ${existingManufacturers.length} |\n`;
    md += `| Skipped (unsafe) | ${skippedUnsafe.length} |\n\n`;
    if (newManufacturers.length > 0) {
      md += '### New Manufacturers\n\n';
      md += '| Manufacturer | Driver | Sources |\n|---|---|---|\n';
      for (const m of newManufacturers.slice(0, 50)) {
        md += `| ${m.manufacturer} | ${m.suggestedDriver} | ${m.sources.join(', ')} |\n`;
      }
    }
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  // Return for programmatic use
  return enrichData;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

async function cli() {
  if (REPORT_ONLY) {
    if (fs.existsSync(ENRICH_REPORT)) {
      console.log(fs.readFileSync(ENRICH_REPORT, 'utf8'));
    } else {
      console.log('No enrichment report found. Run enrichment first.');
    }
    return;
  }

  const result = await enrich();
  console.log(`\nEnrichment complete. ${result.summary.newManufacturers} new manufacturer(s) found.`);
}

// ── Export & run ──────────────────────────────────────────────────────────────
module.exports = { enrich, buildLocalFingerprintMap, inferDriver, isSafeManufacturer };

if (require.main === module) {
  cli().catch((err) => {
    console.error(`[ENRICH] Fatal: ${err.message}`);
    process.exit(1);
  });
}
