#!/usr/bin/env node
'use strict';

/**
 * auto-sync-references.js - External Reference Synchronizer v1.0.0
 * =================================================================
 * Syncs all external references (Z2M, ZHA, deCONZ, Blakadder) with local
 * fingerprint databases. Checks for new devices in each source and updates
 * the data/fingerprints.json database and driver compose files.
 *
 * Features:
 *   - Fetches from Z2M (zigbee-herdsman-converters)
 *   - Fetches from ZHA (zhaquirks)
 *   - Fetches from deCONZ (deconz-rest-plugin)
 *   - Fetches from Blakadder (blakadder.com Zigbee device repository)
 *   - Cross-references with local data/fingerprints.json
 *   - Updates fingerprints database with new entries
 *   - Generates sync report with statistics
 *   - Dry-run mode for preview
 *
 * Usage:
 *   node scripts/automation/auto-sync-references.js                    # full sync
 *   node scripts/automation/auto-sync-references.js --dry-run          # preview only
 *   node scripts/automation/auto-sync-references.js --verbose          # detailed output
 *   node scripts/automation/auto-sync-references.js --report           # JSON report
 *   node scripts/automation/auto-sync-references.js --source=z2m      # single source
 *   node scripts/automation/auto-sync-references.js --auto-apply       # apply changes
 *
 * Exit codes:
 *   0 = sync complete, no new entries
 *   1 = new entries found (dry-run) or changes applied
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DATA_DIR = path.join(ROOT, 'data');
const FINGERPRINTS_PATH = path.join(DATA_DIR, 'fingerprints.json');
const REPORT_DIR = path.join(ROOT, '.cache', 'sync-references');
const REPORT_PATH = path.join(REPORT_DIR, 'sync-report.json');
const STATE_PATH = path.join(ROOT, '.github', 'state');

// ── External Source URLs ──────────────────────────────────────────────────────
const SOURCES = {
  z2m: {
    name: 'Zigbee2MQTT',
    urls: {
      tuya: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
      sonoff: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts',
      lumi: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/lumi.ts',
      ikea: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/ikea.ts',
      philips: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/philips.ts',
    },
  },
  zha: {
    name: 'ZHA Device Handlers',
    urls: {
      tuya: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
      ts0601: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0601.py',
    },
  },
  deconz: {
    name: 'deCONZ',
    urls: {
      devices: 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices.json',
    },
  },
  blakadder: {
    name: 'Blakadder',
    urls: {
      devices: 'https://raw.githubusercontent.com/blakadder/zigbee/master/z2m-listed.md',
    },
  },
};

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.includes(`--${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

const VERBOSE = FLAG('verbose');
const DRY_RUN = FLAG('dry-run');
const REPORT = FLAG('report');
const AUTO_APPLY = FLAG('auto-apply');
const SINGLE_SOURCE = OPT('source');

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(color, ...args) {
  if (!REPORT) console.log(`${C[color] || ''}[SYNC-REF]${C.reset}`, ...args);
}

function warn(...args) {
  if (!REPORT) console.warn(`${C.yellow}[SYNC-REF WARN]${C.reset}`, ...args);
}

function error(...args) {
  if (!REPORT) console.error(`${C.red}[SYNC-REF ERROR]${C.reset}`, ...args);
}

// ── HTTP GET with retries ─────────────────────────────────────────────────────
function httpGet(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      https.get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return httpGet(res.headers.location, remaining).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          if (remaining > 1) {
            return setTimeout(() => attempt(remaining - 1), 2000);
          }
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', (err) => {
        if (remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 2000);
        } else {
          reject(err);
        }
      });
    };
    attempt(retries);
  });
}

// ── Parse Z2M TypeScript source for fingerprints ──────────────────────────────
function parseZ2M(source, sourceName) {
  const fingerprints = [];

  // Extract manufacturerName entries
  const mfrPattern = /manufacturerName:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = mfrPattern.exec(source)) !== null) {
    fingerprints.push({
      type: 'manufacturerName',
      value: match[1],
      source: sourceName,
      line: source.substring(0, match.index).split('\n').length,
    });
  }

  // Extract zigbeeModel arrays (productId)
  const modelPattern = /zigbeeModel:\s*\[([^\]]+)\]/g;
  while ((match = modelPattern.exec(source)) !== null) {
    const inner = match[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let strMatch;
    while ((strMatch = strRe.exec(inner)) !== null) {
      if (strMatch[1].length > 1) {
        fingerprints.push({
          type: 'productId',
          value: strMatch[1],
          source: sourceName,
          line: source.substring(0, match.index).split('\n').length,
        });
      }
    }
  }

  return fingerprints;
}

// ── Parse ZHA Python source for fingerprints ──────────────────────────────────
function parseZHA(source, sourceName) {
  const fingerprints = [];

  // Extract _MANUFACTURER constants
  const mfrPattern = /_MANUFACTURER\s*=\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = mfrPattern.exec(source)) !== null) {
    fingerprints.push({
      type: 'manufacturerName',
      value: match[1],
      source: sourceName,
      line: source.substring(0, match.index).split('\n').length,
    });
  }

  // Extract MODEL constants
  const modelPattern = /MODEL\s*=\s*['"]([^'"]+)['"]/g;
  while ((match = modelPattern.exec(source)) !== null) {
    fingerprints.push({
      type: 'productId',
      value: match[1],
      source: sourceName,
      line: source.substring(0, match.index).split('\n').length,
    });
  }

  // Extract in_clusters patterns with manufacturer info
  const clusterPattern = /MODELS_INFO\s*=\s*\{([^}]+)\}/g;
  while ((match = clusterPattern.exec(source)) !== null) {
    const inner = match[1];
    const entryPattern = /['"]([^'"]+)['"]\s*:\s*\[([^\]]*)\]/g;
    let entryMatch;
    while ((entryMatch = entryPattern.exec(inner)) !== null) {
      fingerprints.push({
        type: 'manufacturerName',
        value: entryMatch[1],
        source: sourceName + ' MODELS_INFO',
        line: source.substring(0, match.index).split('\n').length,
      });
    }
  }

  return fingerprints;
}

// ── Parse deCONZ JSON for fingerprints ────────────────────────────────────────
function parseDeCONZ(source, sourceName) {
  const fingerprints = [];

  try {
    const data = JSON.parse(source);

    if (Array.isArray(data)) {
      for (const device of data) {
        if (device.manufacturername) {
          fingerprints.push({
            type: 'manufacturerName',
            value: device.manufacturername,
            source: sourceName,
          });
        }
        if (device.modelid) {
          fingerprints.push({
            type: 'productId',
            value: device.modelid,
            source: sourceName,
          });
        }
      }
    }
  } catch (err) {
    warn(`Failed to parse deCONZ JSON: ${err.message}`);
  }

  return fingerprints;
}

// ── Parse Blakadder markdown for fingerprints ─────────────────────────────────
function parseBlakadder(source, sourceName) {
  const fingerprints = [];

  // Extract table rows with manufacturer and model info
  const rowPattern = /\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g;
  let match;
  while ((match = rowPattern.exec(source)) !== null) {
    const manufacturer = match[1].trim();
    const model = match[2].trim();

    if (manufacturer && !manufacturer.startsWith('---') && manufacturer !== 'Manufacturer') {
      fingerprints.push({
        type: 'manufacturerName',
        value: manufacturer,
        source: sourceName,
      });
    }
    if (model && !model.startsWith('---') && model !== 'Model') {
      fingerprints.push({
        type: 'productId',
        value: model,
        source: sourceName,
      });
    }
  }

  // Also extract from inline code blocks
  const codePattern = /`([^`]+)`/g;
  while ((match = codePattern.exec(source)) !== null) {
    const value = match[1];
    if (/^_T[YZE]\d{3}_/.test(value)) {
      fingerprints.push({
        type: 'manufacturerName',
        value,
        source: sourceName + ' code block',
      });
    } else if (/^TS\d{4}[A-Z]?$/.test(value)) {
      fingerprints.push({
        type: 'productId',
        value,
        source: sourceName + ' code block',
      });
    }
  }

  return fingerprints;
}

// ── Load local fingerprints from driver.compose.json files ────────────────────
function loadLocalFingerprints() {
  const local = {
    manufacturerNames: new Set(),
    productIds: new Set(),
    drivers: new Map(), // mfr -> driverId
    pairs: new Set(),   // mfr|pid pairs
  };

  try {
    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    for (const dir of driverDirs) {
      const dcjPath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
      if (!fs.existsSync(dcjPath)) continue;

      try {
        const config = JSON.parse(fs.readFileSync(dcjPath));
        const mfrs = config.zigbee?.manufacturerName || [];
        const pids = config.zigbee?.productId || [];

        for (const mfr of mfrs) {
          if (mfr && typeof mfr === 'string' && mfr.trim()) {
            local.manufacturerNames.add(mfr);
            if (!local.drivers.has(mfr)) local.drivers.set(mfr, []);
            local.drivers.get(mfr).push(dir);
          }
        }

        for (const pid of pids) {
          if (pid && typeof pid === 'string' && pid.trim()) {
            local.productIds.add(pid);
          }
        }

        // Track pairs
        for (const mfr of mfrs) {
          for (const pid of pids) {
            if (mfr && pid) local.pairs.add(`${mfr}|${pid}`);
          }
        }
      } catch (e) { /* skip broken JSON */ }
    }
  } catch (err) {
    error(`Failed to load local fingerprints: ${err.message}`);
  }

  return local;
}

// ── Load fingerprints.json database ───────────────────────────────────────────
function loadFingerprintsDB() {
  try {
    if (fs.existsSync(FINGERPRINTS_PATH)) {
      return JSON.parse(fs.readFileSync(FINGERPRINTS_PATH));
    }
  } catch (err) {
    warn(`Failed to load fingerprints.json: ${err.message}`);
  }
  return {};
}

// ── Cross-reference external with local ───────────────────────────────────────
function crossReference(externalEntries, local) {
  const missing = {
    manufacturerNames: [],
    productIds: [],
    newPairs: [],
  };

  const seenMfrs = new Set();
  const seenPids = new Set();

  for (const entry of externalEntries) {
    if (entry.type === 'manufacturerName' && !seenMfrs.has(entry.value)) {
      seenMfrs.add(entry.value);
      if (!local.manufacturerNames.has(entry.value)) {
        missing.manufacturerNames.push({
          value: entry.value,
          source: entry.source,
          line: entry.line,
        });
      }
    } else if (entry.type === 'productId' && !seenPids.has(entry.value)) {
      seenPids.add(entry.value);
      if (!local.productIds.has(entry.value)) {
        missing.productIds.push({
          value: entry.value,
          source: entry.source,
          line: entry.line,
        });
      }
    }
  }

  return missing;
}

// ── Update fingerprints.json database ─────────────────────────────────────────
function updateFingerprintsDB(db, newEntries) {
  let added = 0;

  for (const entry of newEntries) {
    if (!db[entry.manufacturerName]) {
      db[entry.manufacturerName] = {
        driverId: entry.suggestedDriver || 'generic_diy',
        modelIds: entry.productIds || [],
        type: entry.type || 'unknown',
        powerSource: 'mains',
        source: entry.source,
        addedAt: new Date().toISOString(),
      };
      added++;
    }
  }

  return { db, added };
}

// ── Generate sync report ──────────────────────────────────────────────────────
function generateReport(sourceResults, local, totalMissing) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      localManufacturerNames: local.manufacturerNames.size,
      localProductIds: local.productIds.size,
      localPairs: local.pairs.size,
      totalExternalManufacturerNames: totalMissing.externalMfrs,
      totalExternalProductIds: totalMissing.externalPids,
      newManufacturerNames: totalMissing.newMfrs,
      newProductIds: totalMissing.newPids,
    },
    sources: sourceResults,
    newManufacturerNames: totalMissing.mfrDetails.slice(0, 100),
    newProductIds: totalMissing.pidDetails.slice(0, 100),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('cyan', 'External Reference Synchronizer v1.0.0');
  log('dim', `Mode: ${DRY_RUN ? 'DRY RUN' : AUTO_APPLY ? 'AUTO-APPLY' : 'Interactive'}`);
  if (SINGLE_SOURCE) log('dim', `Source filter: ${SINGLE_SOURCE}`);
  log('');

  // 1. Load local fingerprints
  log('cyan', 'Loading local fingerprints...');
  const local = loadLocalFingerprints();
  log('green', `Local: ${local.manufacturerNames.size} manufacturerNames, ${local.productIds.size} productIds, ${local.pairs.size} pairs`);

  // 2. Load fingerprints.json
  const fpDB = loadFingerprintsDB();
  log('dim', `Fingerprints DB: ${Object.keys(fpDB).length} entries`);

  // 3. Fetch and parse each source
  const allMissing = {
    mfrDetails: [],
    pidDetails: [],
    externalMfrs: 0,
    externalPids: 0,
    newMfrs: 0,
    newPids: 0,
  };

  const sourceResults = {};

  for (const [sourceKey, sourceConfig] of Object.entries(SOURCES)) {
    if (SINGLE_SOURCE && sourceKey !== SINGLE_SOURCE) continue;

    log('cyan', `\nFetching ${sourceConfig.name}...`);
    const sourceData = [];

    for (const [urlKey, url] of Object.entries(sourceConfig.urls)) {
      try {
        log('dim', `  Fetching ${urlKey}...`);
        const content = await httpGet(url);

        let parsed = [];
        if (sourceKey === 'z2m') {
          parsed = parseZ2M(content, `${sourceConfig.name}/${urlKey}`);
        } else if (sourceKey === 'zha') {
          parsed = parseZHA(content, `${sourceConfig.name}/${urlKey}`);
        } else if (sourceKey === 'deconz') {
          parsed = parseDeCONZ(content, `${sourceConfig.name}/${urlKey}`);
        } else if (sourceKey === 'blakadder') {
          parsed = parseBlakadder(content, `${sourceConfig.name}/${urlKey}`);
        }

        sourceData.push(...parsed);
        log('green', `  ${urlKey}: ${parsed.length} items extracted`);
      } catch (err) {
        warn(`  ${urlKey}: FAILED - ${err.message}`);
      }
    }

    // Cross-reference with local
    const missing = crossReference(sourceData, local);
    allMissing.externalMfrs += new Set(sourceData.filter(e => e.type === 'manufacturerName').map(e => e.value)).size;
    allMissing.externalPids += new Set(sourceData.filter(e => e.type === 'productId').map(e => e.value)).size;
    allMissing.newMfrs += missing.manufacturerNames.length;
    allMissing.newPids += missing.productIds.length;
    allMissing.mfrDetails.push(...missing.manufacturerNames);
    allMissing.pidDetails.push(...missing.productIds);

    sourceResults[sourceKey] = {
      name: sourceConfig.name,
      totalItems: sourceData.length,
      missingManufacturerNames: missing.manufacturerNames.length,
      missingProductIds: missing.productIds.length,
    };

    log('green', `  ${sourceConfig.name}: ${missing.manufacturerNames.length} new mfrs, ${missing.productIds.length} new pids`);
  }

  // 4. Generate report
  const report = generateReport(sourceResults, local, allMissing);

  // 5. Save report
  if (REPORT || VERBOSE) {
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    log('dim', `Report saved to: ${REPORT_PATH}`);
  }

  // Save to state directory for CI
  if (!fs.existsSync(STATE_PATH)) fs.mkdirSync(STATE_PATH, { recursive: true });
  fs.writeFileSync(
    path.join(STATE_PATH, 'sync-references-report.json'),
    JSON.stringify(report, null, 2)
  );

  // 6. Summary
  log('');
  log('cyan', '=== Sync Summary ===');
  log('dim', `Local manufacturerNames: ${local.manufacturerNames.size}`);
  log('dim', `Local productIds: ${local.productIds.size}`);
  log('dim', `Local pairs: ${local.pairs.size}`);
  log('');
  log('cyan', 'External Sources:');
  for (const [key, result] of Object.entries(sourceResults)) {
    log('dim', `  ${result.name}: ${result.totalItems} items, ${result.missingManufacturerNames} new mfrs, ${result.missingProductIds} new pids`);
  }
  log('');
  log('green', `Total new manufacturerNames: ${allMissing.newMfrs}`);
  log('green', `Total new productIds: ${allMissing.newPids}`);

  if (VERBOSE && allMissing.mfrDetails.length > 0) {
    log('');
    log('cyan', 'New manufacturerNames (first 20):');
    for (const m of allMissing.mfrDetails.slice(0, 20)) {
      log('dim', `  ${m.value} [${m.source}]`);
    }
  }

  if (VERBOSE && allMissing.pidDetails.length > 0) {
    log('');
    log('cyan', 'New productIds (first 20):');
    for (const p of allMissing.pidDetails.slice(0, 20)) {
      log('dim', `  ${p.value} [${p.source}]`);
    }
  }

  // 7. Apply changes if requested
  if (AUTO_APPLY && (allMissing.newMfrs > 0 || allMissing.newPids > 0) && !DRY_RUN) {
    log('');
    log('cyan', 'Applying changes to fingerprints.json...');

    const newEntries = allMissing.mfrDetails.map(m => ({
      manufacturerName: m.value,
      source: m.source,
      productIds: allMissing.pidDetails
        .filter(p => p.source === m.source)
        .map(p => p.value),
      suggestedDriver: 'generic_diy',
      type: 'unknown',
    }));

    const { db, added } = updateFingerprintsDB(fpDB, newEntries);
    if (added > 0) {
      fs.writeFileSync(FINGERPRINTS_PATH, JSON.stringify(db, null, 2));
      log('green', `Added ${added} new entries to fingerprints.json`);
    }
  } else if (DRY_RUN) {
    log('');
    log('yellow', 'DRY RUN - No changes applied');
  }

  // 8. Exit code
  log('');
  if (allMissing.newMfrs === 0 && allMissing.newPids === 0) {
    log('green', 'No new references to sync - databases are up to date');
    process.exit(0);
  } else if (DRY_RUN) {
    log('yellow', `Dry run complete - ${allMissing.newMfrs} new mfrs, ${allMissing.newPids} new pids found`);
    process.exit(1);
  } else {
    log('green', `Sync complete - ${allMissing.newMfrs} new mfrs, ${allMissing.newPids} new pids available`);
    process.exit(0);
  }
}

// ── Error handling ────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  process.exit(2);
});

process.on('unhandledRejection', (err) => {
  error(`Unhandled rejection: ${err.message || err}`);
  process.exit(2);
});

main();
