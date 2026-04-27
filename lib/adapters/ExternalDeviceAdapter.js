'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply } = require('../utils/MathUtils.js');

/**
 * ExternalDeviceAdapter - v7.4.11
 * Unified adapter combining Z2M, ZHA, deCONZ, and other sources
 * into a single enrichment pipeline for the Homey app.
 */

const fs = require('fs');
const path = require('path');
const { classifyDeviceType, resolveFromDeCONZ, HOMEY_CAPABILITY_META } = require('./ZclToHomeyMap');
const { parseZ2MDeviceBlocks, convertToHomeyDriver, loadExistingDrivers, Z2M_TUYA_URL } = require('./Z2MConverterAdapter');
const { parseZHAQuirkFile, convertZHAToHomey, ZHA_TUYA_URL } = require('./ZHAQuirkAdapter');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const CACHE_DIR = path.join(ROOT, '.github', 'cache');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const ENRICHMENT_REPORT = path.join(STATE_DIR, 'enrichment-report.json');
const ADAPTER_STATE = path.join(STATE_DIR, 'adapter-state.json');

// =============================================================================
// DECONZ ADAPTER
// =============================================================================

function parseDeCONZDeviceJSON(jsonStr, filename) {
  try {
    const dev = JSON.parse(jsonStr);
    const mfr = dev.manufacturername || dev.manufacturerName || '';
    const model = dev.modelid || dev.modelId || '';
    if (!mfr.startsWith('_T')) return null;

    const resourceType = dev.type || '';
    const caps = resolveFromDeCONZ(resourceType);
    const clusters = (dev.clusters || []).map(c => typeof c === 'object' ? c.id : c).filter(Boolean);

    return {
      source: 'deconz',
      manufacturerName: mfr,
      productId: model,
      capabilities: caps,
      clusters,
      config: dev.config || {},
      filename,
      resourceType
    };
  } catch { return null; }
}

// =============================================================================
// HUBITAT / SMARTTHINGS ADAPTER
// =============================================================================

function parseGroovyDevice(groovySource, filename) {
  const devices = [];
  const fpRegex = /_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g;
  const fps = [...new Set(groovySource.match(fpRegex) || [])];
  if (!fps.length) return devices;

  const pidRegex = /\bTS[0-9A-Fa-f]{3,5}\b/gi;
  const pids = [...new Set((groovySource.match(pidRegex) || []).map(p => p.toUpperCase()))];
  const dpRegex = /(?:dp|DP|datapoint)[:\s=]\s*(\d{1,3})/gi;
  const dps = [...new Set((groovySource.match(dpRegex) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];

  const caps = new Set();
  if (/switch|onOff|on_off/i.test(groovySource)) caps.add('onoff');
  if (/temperatur/i.test(groovySource)) caps.add('measure_temperature');
  if (/humidity/i.test(groovySource)) caps.add('measure_humidity');
  if (/motion|occupan/i.test(groovySource)) caps.add('alarm_motion');
  if (/contact|open.?close/i.test(groovySource)) caps.add('alarm_contact');
  if (/(?:water.)?leak|moisture/i.test(groovySource)) caps.add('alarm_water');
  if (/dim|level|bright/i.test(groovySource)) caps.add('dim');
  if (/(?:color|hue|saturat)/i.test(groovySource)) caps.add('light_hue');
  if (/power|watt/i.test(groovySource)) caps.add('measure_power');
  if (/energy|kwh/i.test(groovySource)) caps.add('meter_power');
  if (/curtain|cover|blind|shade/i.test(groovySource)) caps.add('windowcoverings_set');
  if (/thermostat|setpoint/i.test(groovySource)) caps.add('target_temperature');
  if (/battery/i.test(groovySource)) caps.add('measure_battery');
  if (/co2|carbon.?dioxide/i.test(groovySource)) caps.add('measure_co2');
  if (/pm2|particl/i.test(groovySource)) caps.add('measure_pm25');
  if (/voc/i.test(groovySource)) caps.add('measure_voc');
  if (/lock/i.test(groovySource)) caps.add('locked');

  for (const fp of fps) {
    devices.push({
      source: filename.includes('smartthings') ? 'smartthings' : 'hubitat',
      manufacturerName: fp,
      productId: pids[0] || null,
      capabilities: [...caps],
      dps,
      filename
    });
  }
  return devices;
}

// =============================================================================
// CROSS-REFERENCE ENGINE
// =============================================================================

function crossReference(allDevices, existingDrivers) {
  const byFP = new Map();

  for (const dev of allDevices) {
    const fp = dev.manufacturerName;
    if (!fp) continue;
    if (!byFP.has(fp)) {
      byFP.set(fp, {
        manufacturerName: fp,
        productIds: new Set(),
        capabilities: new Set(),
        dps: new Set(),
        clusters: new Set(),
        sources: new Set(),
        configs: [],
        existingDriver: null,
        isSupported: false
      });
    }
    const entry = byFP.get(fp);
    entry.sources.add(dev.source);
    if (dev.productId) entry.productIds.add(dev.productId);
    if (dev.capabilities) dev.capabilities.forEach(c => entry.capabilities.add(c));
    if (dev.dps) dev.dps.forEach(d => entry.dps.add(d));
    if (dev.clusters) dev.clusters.forEach(c => entry.clusters.add(c));
    entry.configs.push(dev);
  }

  // Check against existing drivers
  for (const [fp, entry] of byFP) {
    for (const driver of existingDrivers) {
      const mfrs = driver.zigbee?.manufacturerName || [];
      if (CI.includesCI(mfrs, fp)) {
        entry.existingDriver = driver.id;
        entry.isSupported = true;
        break;
      }
    }
  }

  const results = [];
  for (const [fp, entry] of byFP) {
    results.push({
      ...entry,
      productIds: [...entry.productIds],
      capabilities: [...entry.capabilities],
      dps: [...entry.dps],
      clusters: [...entry.clusters],
      sources: [...entry.sources],
      deviceType: classifyDeviceType([...entry.capabilities]),
      sourceCount: entry.sources.size,
      confidence: calculateConfidence(entry)
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

function calculateConfidence(entry) {
  let score = 0;
  score += (entry.sources.size * 15);
  score += (entry.capabilities.size * 5);
  score += (entry.dps.size * 8);
  score += (entry.clusters.size * 3);
  score += entry.productIds.size > 0 ? 10 : 0;
  return Math.min(100, score);
}

// =============================================================================
// ENRICHMENT ENGINE: Add new FPs to existing drivers
// =============================================================================

function generateEnrichments(crossRefResults, existingDrivers) {
  const enrichments = [];

  for (const entry of crossRefResults) {
    if (entry.isSupported) continue;
    if (entry.confidence < 30) continue;

    const bestMatch = findBestDriverMatch(entry, existingDrivers);
    if (!bestMatch) continue;

    enrichments.push({
      action: 'add_fingerprint',
      driver: bestMatch.driverId,
      manufacturerName: entry.manufacturerName,
      productIds: entry.productIds,
      capabilities: entry.capabilities,
      dps: entry.dps,
      deviceType: entry.deviceType,
      confidence: entry.confidence,
      sources: entry.sources,
      reason: `Matched by ${entry.deviceType} type with ${entry.sourceCount} sources (confidence: ${entry.confidence}%)`
    });
  }

  return enrichments;
}

function findBestDriverMatch(entry, existingDrivers) {
  const targetType = entry.deviceType;
  const targetCaps = new Set(entry.capabilities);

  let bestDriver = null;
  let bestScore = 0;

  for (const driver of existingDrivers) {
    const driverCaps = new Set(driver.capabilities || []);
    const driverType = classifyDeviceType([...driverCaps]);

    if (driverType !== targetType) continue;

    let overlap = 0;
    for (const cap of targetCaps) {
      if (driverCaps.has(cap)) overlap++;
    }
    const score = safeDivide(overlap, Math.max(targetCaps.size, 1));

    if (score > bestScore) {
      bestScore = score;
      bestDriver = { driverId: driver.id, score, overlap };
    }
  }

  return bestScore >= 0.5 ? bestDriver : null;
}

// =============================================================================
// APPLY ENRICHMENTS (modify driver.compose.json files)
// =============================================================================

function applyEnrichments(enrichments, driversDir, dryRun = true) {
  const applied = [];
  const skipped = [];

  for (const enrichment of enrichments) {
    const composeFile = path.join(driversDir, enrichment.driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) {
      skipped.push({ ...enrichment, reason: 'driver.compose.json not found' });
      continue;
    }

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];
      const pids = compose.zigbee?.productId || [];
      let changed = false;

      if (!CI.includesCI(mfrs, enrichment.manufacturerName)) {
        if (!dryRun) {
          mfrs.push(enrichment.manufacturerName);
          compose.zigbee.manufacturerName = mfrs;
        }
        changed = true;
      }

      for (const pid of (enrichment.productIds || [])) {
        if (pid && !CI.includesCI(pids, pid)) {
          if (!dryRun) {
            pids.push(pid);
            compose.zigbee.productId = pids;
          }
          changed = true;
        }
      }

      if (changed) {
        if (!dryRun) {
          fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
        }
        applied.push({ ...enrichment, dryRun });
      } else {
        skipped.push({ ...enrichment, reason: 'already present' });
      }
    } catch (err) {
      skipped.push({ ...enrichment, reason: err.message });
    }
  }

  return { applied, skipped };
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

function loadState() {
  try { return JSON.parse(fs.readFileSync(ADAPTER_STATE, 'utf8')); }
  catch { return { lastRun: null, runs: 0, totalEnriched: 0, history: [] }; }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(ADAPTER_STATE), { recursive: true });
  fs.writeFileSync(ADAPTER_STATE, JSON.stringify(state, null, 2) + '\n');
}

function saveReport(report) {
  fs.mkdirSync(path.dirname(ENRICHMENT_REPORT), { recursive: true });
  fs.writeFileSync(ENRICHMENT_REPORT, JSON.stringify(report, null, 2) + '\n');
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

async function runFullPipeline(options = {}) {
  const { dryRun = true } = options;
  const existingDrivers = loadExistingDrivers(DRIVERS_DIR);
  const allDevices = [];
  const stats = { z2m: 0, zha: 0, deconz: 0, hubitat: 0, total: 0 };

  console.log('=== External Device Adapter Pipeline ===');
  console.log('Existing drivers:', existingDrivers.length, '| Dry run:', dryRun);

  const z2mCache = path.join(CACHE_DIR, 'z2m', 'tuya.ts');
  if (fs.existsSync(z2mCache)) {
    const src = fs.readFileSync(z2mCache, 'utf8');
    const z2mDevs = parseZ2MDeviceBlocks(src);
    for (const dev of z2mDevs) {
      const config = convertToHomeyDriver(dev, existingDrivers);
      for (const mfr of config.zigbee.manufacturerName) {
        allDevices.push({
          source: 'z2m', manufacturerName: mfr,
          productId: config.zigbee.productId[0] || null,
          capabilities: config.capabilities, dps: dev.dps
        });
      }
    }
    stats.z2m = z2mDevs.length;
    console.log('Z2M:', z2mDevs.length, 'devices parsed');
  }

  const zhaDir = path.join(CACHE_DIR, 'zha');
  if (fs.existsSync(zhaDir)) {
    for (const f of fs.readdirSync(zhaDir).filter(f => f.endsWith('.py'))) {
      const src = fs.readFileSync(path.join(zhaDir, f), 'utf8');
      const zhaDev = parseZHAQuirkFile(src, f);
      for (const dev of zhaDev) {
        const config = convertZHAToHomey(dev, existingDrivers);
        for (const mfr of config.zigbee.manufacturerName) {
          allDevices.push({
            source: 'zha', manufacturerName: mfr,
            productId: config.zigbee.productId[0] || null,
            capabilities: config.capabilities, dps: Object.keys(config.dpMappings).map(Number),
            clusters: config.clusters
          });
        }
      }
      stats.zha += zhaDev.length;
    }
    console.log('ZHA:', stats.zha, 'quirks parsed');
  }

  const deconzDir = path.join(CACHE_DIR, 'deconz');
  if (fs.existsSync(deconzDir)) {
    for (const f of fs.readdirSync(deconzDir).filter(f => f.endsWith('.json'))) {
      const src = fs.readFileSync(path.join(deconzDir, f), 'utf8');
      const dev = parseDeCONZDeviceJSON(src, f);
      if (dev) { allDevices.push(dev); stats.deconz++; }
    }
    console.log('deCONZ:', stats.deconz, 'devices parsed');
  }

  stats.total = allDevices.length;
  console.log('Total external devices:', stats.total);

  const crossRef = crossReference(allDevices, existingDrivers);
  const supported = crossRef.filter(e => e.isSupported);
  const unsupported = crossRef.filter(e => !e.isSupported);
  console.log('Cross-ref:', crossRef.length, 'unique FPs |', supported.length, 'supported |', unsupported.length, 'new');

  const enrichments = generateEnrichments(crossRef, existingDrivers);
  console.log('Enrichments:', enrichments.length, 'proposed');

  const { applied, skipped } = applyEnrichments(enrichments, DRIVERS_DIR, dryRun);
  console.log('Applied:', applied.length, '| Skipped:', skipped.length);

  const report = {
    timestamp: new Date().toISOString(),
    dryRun,
    stats,
    crossRef: { total: crossRef.length, supported: supported.length, unsupported: unsupported.length },
    enrichments: { proposed: enrichments.length, applied: applied.length, skipped: skipped.length },
    topUnsupported: unsupported.slice(0, 50).map(e => ({
      fp: e.manufacturerName, pids: e.productIds, type: e.deviceType,
      caps: e.capabilities, dps: e.dps, sources: e.sources, confidence: e.confidence
    })),
    appliedDetails: applied.slice(0, 50),
    skippedDetails: skipped.slice(0, 20)
  };
  saveReport(report);

  const state = loadState();
  state.lastRun = new Date().toISOString();
  state.runs++;
  state.totalEnriched += applied.length;
  state.history.push({ ts: state.lastRun, proposed: enrichments.length, applied: applied.length });
  if (state.history.length > 50) state.history = state.history.slice(-50);
  saveState(state);

  console.log('=== Pipeline complete ===');
  return report;
}

module.exports = {
  parseDeCONZDeviceJSON,
  parseGroovyDevice,
  crossReference,
  generateEnrichments,
  applyEnrichments,
  runFullPipeline,
  loadState,
  saveState,
  saveReport,
  CACHE_DIR,
  STATE_DIR
};
