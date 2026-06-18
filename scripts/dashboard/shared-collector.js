#!/usr/bin/env node
/**
 * shared-collector.js - Shared Metrics Collector
 *
 * Centralized metrics collection used by all dashboard generators.
 * Collects driver, fingerprint, flow card, capability, library, workflow,
 * script, cluster, and image coverage metrics once and shares them.
 *
 * Integrates with KNOWLEDGE_CACHE.json for enriched data.
 *
 * Usage:
 *   const { collectAll } = require('./shared-collector');
 *   const metrics = collectAll();
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const DATA_DIR = path.join(ROOT, 'data');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const CACHE_PATH = path.join(ROOT, '.ai', 'KNOWLEDGE_CACHE.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function safeReadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function countLines(filePath) {
  const content = safeReadFile(filePath);
  return content ? content.split('\n').length : 0;
}

function getDirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(full);
    } else {
      try { total += fs.statSync(full).size; } catch {}
    }
  }
  return total;
}

function getFileCount(dir, ext = '.js', skipDirs = ['node_modules', '.git', '.homeycompose']) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += getFileCount(full, ext, skipDirs);
    } else if (!ext || entry.name.endsWith(ext)) {
      count++;
    }
  }
  return count;
}

function walkJsFiles(dir, callback, skipDirs = ['node_modules', '.git', '.homeycompose']) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(full, callback, skipDirs);
    } else if (entry.name.endsWith('.js')) {
      callback(full, path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
}

// ---------------------------------------------------------------------------
// Category Rules (shared across all dashboards)
// ---------------------------------------------------------------------------

const CATEGORY_RULES = [
  { id: 'switches', label: 'Switches & Relays', color: '#3fb950', patterns: ['switch', 'relay'] },
  { id: 'dimmers', label: 'Dimmers', color: '#d29922', patterns: ['dimmer', 'dimmable', 'dim'] },
  { id: 'lights', label: 'Lights & Bulbs', color: '#f0883e', patterns: ['bulb', 'light', 'led', 'lamp', 'rgb'] },
  { id: 'sensors', label: 'Sensors', color: '#58a6ff', patterns: ['sensor'] },
  { id: 'plugs', label: 'Plugs & Outlets', color: '#3fb950', patterns: ['plug', 'outlet', 'power_point', 'socket'] },
  { id: 'covers', label: 'Covers & Blinds', color: '#bc8cff', patterns: ['curtain', 'blind', 'shutter', 'cover'] },
  { id: 'buttons', label: 'Buttons & Remotes', color: '#f85149', patterns: ['button', 'remote', 'scene', 'knob', 'handheld'] },
  { id: 'climate', label: 'Climate & HVAC', color: '#ff7b72', patterns: ['thermostat', 'climate', 'hvac', 'air_conditioner'] },
  { id: 'locks', label: 'Locks', color: '#d29922', patterns: ['lock', 'fingerprint'] },
  { id: 'fans', label: 'Fans', color: '#79c0ff', patterns: ['fan'] },
  { id: 'ir', label: 'IR Blasters', color: '#f0883e', patterns: ['ir_blaster', 'blaster_remote', 'ir_remote'] },
  { id: 'gateways', label: 'Gateways & Bridges', color: '#8b949e', patterns: ['gateway', 'bridge', 'repeater'] },
  { id: 'alarms', label: 'Sirens & Alarms', color: '#f85149', patterns: ['siren', 'alarm'] },
  { id: 'air_quality', label: 'Air Quality & Purifier', color: '#3fb950', patterns: ['air_purifier', 'air_quality', 'humidifier', 'dehumidifier'] },
  { id: 'safety', label: 'Safety (Smoke/CO/Gas)', color: '#f85149', patterns: ['smoke', 'gas_detector', 'gas_sensor', 'co_sensor', 'co_'] },
  { id: 'leak', label: 'Leak Sensors', color: '#58a6ff', patterns: ['flood', 'leak', 'water'] },
  { id: 'soil', label: 'Soil Sensors', color: '#d29922', patterns: ['soil'] },
  { id: 'presence', label: 'Presence Sensors', color: '#bc8cff', patterns: ['presence'] },
  { id: 'motion', label: 'Motion Sensors', color: '#f0883e', patterns: ['motion'] },
  { id: 'contact', label: 'Contact & Door/Window', color: '#3fb950', patterns: ['contact', 'doorwindow', 'door_window'] },
  { id: 'light_sensors', label: 'Light Sensors', color: '#d29922', patterns: ['illuminance', 'lux'] },
  { id: 'energy', label: 'Energy Meters', color: '#58a6ff', patterns: ['energy', 'meter', 'din_rail', 'power'] },
  { id: 'ceiling_fans', label: 'Ceiling Fans', color: '#79c0ff', patterns: ['ceiling_fan'] },
  { id: 'valves', label: 'Valves', color: '#79c0ff', patterns: ['valve'] },
  { id: 'doors', label: 'Door Controllers', color: '#58a6ff', patterns: ['garage', 'door_controller'] },
  { id: 'bed', label: 'Bed Sensors', color: '#bc8cff', patterns: ['bed_sensor'] },
  { id: 'generic', label: 'Generic / Universal', color: '#8b949e', patterns: ['generic', 'universal', 'diy', 'dummy', 'ts0601'] },
  { id: 'other', label: 'Uncategorized', color: '#6e7681', patterns: [] }
];

function categorizeDriver(driverId) {
  const id = driverId.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.id === 'other') continue;
    if (rule.patterns.some(p => id.includes(p))) return rule.id;
  }
  return 'other';
}

function getCategoryMeta(categoryId) {
  return CATEGORY_RULES.find(r => r.id === categoryId) || CATEGORY_RULES[CATEGORY_RULES.length - 1];
}

// ---------------------------------------------------------------------------
// Collector Functions
// ---------------------------------------------------------------------------

/**
 * Collect comprehensive driver metrics
 */
function collectDriverMetrics() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    return { total: 0, drivers: [], categories: {}, protocols: { zigbee: 0, wifi: 0 }, capabilities: [], errors: [] };
  }

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  const result = {
    total: driverDirs.length,
    withDeviceJs: 0,
    withDriverJs: 0,
    withComposeJson: 0,
    withFlowCompose: 0,
    withAssets: 0,
    withDriverFlowCompose: 0,
    totalFingerprints: 0,
    totalFlowCards: 0,
    categories: {},
    protocols: { zigbee: 0, wifi: 0, unknown: 0 },
    capabilities: new Set(),
    uniqueCapabilities: new Set(),
    linesOfCode: 0,
    emptyManufacturerNames: 0,
    drivers: [],
    errors: []
  };

  // Initialize categories
  for (const rule of CATEGORY_RULES) {
    result.categories[rule.id] = {
      ...rule,
      drivers: [],
      totalFingerprints: 0,
      totalFlowCards: 0,
      healthScore: 100
    };
  }

  for (const driverId of driverDirs) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const info = {
      id: driverId,
      category: categorizeDriver(driverId),
      protocol: 'unknown',
      hasDeviceJs: false,
      hasDriverJs: false,
      hasComposeJson: false,
      hasFlowCompose: false,
      hasAssets: false,
      fingerprintCount: 0,
      flowCardCount: 0,
      capabilities: [],
      manufacturerNames: [],
      lines: 0,
      issues: [],
      clusters: new Set(),
      baseClass: null
    };

    // Check file existence
    const deviceJs = path.join(driverPath, 'device.js');
    const driverJs = path.join(driverPath, 'driver.js');
    const composeJson = path.join(driverPath, 'driver.compose.json');
    const flowCompose = path.join(driverPath, 'driver.flow.compose.json');

    info.hasDeviceJs = fs.existsSync(deviceJs);
    info.hasDriverJs = fs.existsSync(driverJs);
    info.hasComposeJson = fs.existsSync(composeJson);
    info.hasFlowCompose = fs.existsSync(flowCompose);
    info.hasAssets = fs.existsSync(path.join(driverPath, 'assets', 'images'));

    if (info.hasDeviceJs) result.withDeviceJs++;
    if (info.hasDriverJs) result.withDriverJs++;
    if (info.hasComposeJson) result.withComposeJson++;
    if (info.hasFlowCompose) result.withFlowCompose++;
    if (info.hasAssets) result.withAssets++;

    // Count lines in device.js
    if (info.hasDeviceJs) {
      info.lines = countLines(deviceJs);
      result.linesOfCode += info.lines;
    }

    // Parse compose.json
    if (info.hasComposeJson) {
      const compose = safeJsonParse(safeReadFile(composeJson));
      if (compose) {
        info.capabilities = Array.isArray(compose.capabilities) ? compose.capabilities : [];
        for (const cap of info.capabilities) {
          result.capabilities.add(cap);
          result.uniqueCapabilities.add(typeof cap === 'string' ? cap : cap.id || JSON.stringify(cap));
        }

        // Extract fingerprints from zigbee section
        if (compose.zigbee && Array.isArray(compose.zigbee.manufacturerName)) {
          info.fingerprintCount = compose.zigbee.manufacturerName.length;
          info.manufacturerNames = compose.zigbee.manufacturerName.slice(0, 10);
          if (compose.zigbee.manufacturerName.length === 0) {
            result.emptyManufacturerNames++;
            info.issues.push('EMPTY_MANUFACTURER_NAME');
          }
        }
        result.totalFingerprints += info.fingerprintCount;
      }
    }

    // Parse flow cards
    if (info.hasFlowCompose) {
      const flowData = safeJsonParse(safeReadFile(flowCompose));
      if (flowData) {
        info.flowCardCount =
          (flowData.actions || []).length +
          (flowData.conditions || []).length +
          (flowData.triggers || []).length;
        result.totalFlowCards += info.flowCardCount;
      }
    }

    // Detect protocol and clusters from device.js
    if (info.hasDeviceJs) {
      const deviceContent = safeReadFile(deviceJs);
      if (deviceContent) {
        // Protocol detection
        if (deviceContent.includes('TuyaLocalClient') || deviceContent.includes('wifi') || deviceContent.includes('WiFi')) {
          info.protocol = 'wifi';
          result.protocols.wifi++;
        } else if (deviceContent.includes('TuyaZigbeeDevice') || deviceContent.includes('ZigBeeDevice') || deviceContent.includes('homey-zigbeedriver')) {
          info.protocol = 'zigbee';
          result.protocols.zigbee++;
        } else {
          result.protocols.unknown++;
        }

        // Cluster detection
        const clusterPatterns = [
          'OnOff', 'LevelControl', 'ColorControl', 'WindowCovering',
          'IASZone', 'Metering', 'Thermostat', 'DoorLock',
          'Temperature', 'Humidity', 'Pressure', 'Occupancy',
          'Illuminance', 'Battery', 'Time', '0xEF00'
        ];
        for (const cluster of clusterPatterns) {
          if (deviceContent.includes(cluster)) {
            info.clusters.add(cluster);
          }
        }

        // Base class detection
        const baseMatch = deviceContent.match(/extends\s+(\w+)/);
        if (baseMatch) info.baseClass = baseMatch[1];
      }
    }

    // Detect issues
    if (!info.hasDeviceJs) info.issues.push('NO_DEVICE_JS');
    if (!info.hasDriverJs) info.issues.push('NO_DRIVER_JS');
    if (!info.hasComposeJson) info.issues.push('NO_COMPOSE');
    if (!info.hasAssets) info.issues.push('NO_ASSETS');
    if (info.fingerprintCount === 0 && info.hasComposeJson) info.issues.push('NO_FINGERPRINTS');

    // Add to category
    const cat = result.categories[info.category];
    if (cat) {
      cat.drivers.push(info);
      cat.totalFingerprints += info.fingerprintCount;
      cat.totalFlowCards += info.flowCardCount;
    }

    result.drivers.push(info);
  }

  // Calculate category health scores
  for (const cat of Object.values(result.categories)) {
    if (cat.drivers.length === 0) { cat.healthScore = 0; continue; }
    const withDevice = cat.drivers.filter(d => d.hasDeviceJs).length;
    const withFp = cat.drivers.filter(d => d.fingerprintCount > 0).length;
    const withFlow = cat.drivers.filter(d => d.flowCardCount > 0).length;
    cat.healthScore = Math.round(
      (withDevice / cat.drivers.length * 30) +
      (withFp / cat.drivers.length * 40) +
      (withFlow / cat.drivers.length * 30)
    );
  }

  result.capabilities = [...result.capabilities];
  result.uniqueCapabilities = [...result.uniqueCapabilities];
  return result;
}

/**
 * Collect fingerprint database metrics
 */
function collectFingerprintMetrics() {
  const metrics = { totalDB: 0, source: 'unknown', loaded: false, sizeMB: 0, uniqueManufacturerNames: 0, uniqueProductIds: 0 };

  const fpPaths = [
    path.join(DATA_DIR, 'fingerprints.json'),
    path.join(LIB_DIR, 'data', 'fingerprints.json'),
    path.join(LIB_DIR, 'tuya', 'fingerprints.json')
  ];

  for (const fpPath of fpPaths) {
    if (fs.existsSync(fpPath)) {
      const stat = fs.statSync(fpPath);
      metrics.sizeMB = Math.round(stat.size / (1024 * 1024) * 100) / 100;
      try {
        const data = JSON.parse(fs.readFileSync(fpPath));
        metrics.totalDB = Object.keys(data).length;
        metrics.loaded = true;
        metrics.source = fpPath;

        // Count unique manufacturer names and product IDs
        const mfrSet = new Set();
        const pidSet = new Set();
        for (const entries of Object.values(data)) {
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              if (entry.manufacturerName) mfrSet.add(entry.manufacturerName.toLowerCase());
              if (entry.productId) pidSet.add(entry.productId);
            }
          }
        }
        metrics.uniqueManufacturerNames = mfrSet.size;
        metrics.uniqueProductIds = pidSet.size;
      } catch {
        // OOM or parse error - try Buffer-based
        try {
          const buf = fs.readFileSync(fpPath);
          const data = JSON.parse(buf);
          metrics.totalDB = Object.keys(data).length;
          metrics.loaded = true;
          metrics.source = fpPath;
        } catch {}
      }
      break;
    }
  }

  return metrics;
}

/**
 * Collect flow card metrics from app.json
 */
function collectFlowCardMetrics() {
  const appJsonPath = path.join(ROOT, 'app.json');
  if (!fs.existsSync(appJsonPath)) return { total: 0, byType: { triggers: 0, conditions: 0, actions: 0 }, cards: [] };

  const appJson = safeJsonParse(safeReadFile(appJsonPath));
  if (!appJson || !appJson.flow) return { total: 0, byType: { triggers: 0, conditions: 0, actions: 0 }, cards: [] };

  const flow = appJson.flow;
  const metrics = {
    total: 0,
    byType: { triggers: 0, conditions: 0, actions: 0 },
    cards: []
  };

  if (flow.triggers) {
    metrics.byType.triggers = flow.triggers.length;
    for (const t of flow.triggers) {
      metrics.cards.push({ type: 'trigger', id: t.id, title: t.title });
    }
  }
  if (flow.conditions) {
    metrics.byType.conditions = flow.conditions.length;
    for (const c of flow.conditions) {
      metrics.cards.push({ type: 'condition', id: c.id, title: c.title });
    }
  }
  if (flow.actions) {
    metrics.byType.actions = flow.actions.length;
    for (const a of flow.actions) {
      metrics.cards.push({ type: 'action', id: a.id, title: a.title });
    }
  }

  metrics.total = metrics.byType.triggers + metrics.byType.conditions + metrics.byType.actions;
  return metrics;
}

/**
 * Collect library metrics (files, lines, by directory)
 */
function collectLibMetrics() {
  const metrics = {
    totalFiles: 0,
    totalLines: 0,
    modules: [],
    byDir: {}
  };

  walkJsFiles(LIB_DIR, (fullPath, relPath) => {
    const lines = countLines(fullPath);
    const size = fs.statSync(fullPath).size;
    metrics.totalFiles++;
    metrics.totalLines += lines;

    const dirName = relPath.split('/')[1] || 'root';
    if (!metrics.byDir[dirName]) metrics.byDir[dirName] = { files: 0, lines: 0 };
    metrics.byDir[dirName].files++;
    metrics.byDir[dirName].lines += lines;

    metrics.modules.push({ path: relPath, lines, size });
  });

  metrics.modules.sort((a, b) => b.lines - a.lines);
  return metrics;
}

/**
 * Collect workflow (GitHub Actions) metrics
 */
function collectWorkflowMetrics() {
  const metrics = { total: 0, workflows: [], byTrigger: {} };

  if (!fs.existsSync(WORKFLOWS_DIR)) return metrics;

  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  metrics.total = files.length;

  for (const file of files) {
    const fullPath = path.join(WORKFLOWS_DIR, file);
    const content = safeReadFile(fullPath);
    if (!content) continue;

    const triggers = [];
    if (content.includes('push:')) triggers.push('push');
    if (content.includes('pull_request')) triggers.push('pull_request');
    if (content.includes('schedule:')) triggers.push('schedule');
    if (content.includes('workflow_dispatch')) triggers.push('manual');
    if (content.includes('issue')) triggers.push('issue');

    for (const t of triggers) {
      metrics.byTrigger[t] = (metrics.byTrigger[t] || 0) + 1;
    }

    metrics.workflows.push({
      name: file.replace(/\.ya?ml$/, ''),
      file,
      triggers,
      size: fs.statSync(fullPath).size
    });
  }

  return metrics;
}

/**
 * Collect script metrics
 */
function collectScriptMetrics() {
  const metrics = { total: 0, byDir: {}, totalLines: 0 };

  walkJsFiles(SCRIPTS_DIR, (fullPath, relPath) => {
    const lines = countLines(fullPath);
    metrics.total++;
    metrics.totalLines += lines;

    const dirName = relPath.split('/')[1] || 'root';
    if (!metrics.byDir[dirName]) metrics.byDir[dirName] = { files: 0, lines: 0 };
    metrics.byDir[dirName].files++;
    metrics.byDir[dirName].lines += lines;
  });

  return metrics;
}

/**
 * Collect cluster coverage metrics
 */
function collectClusterMetrics(driverMetrics) {
  const clusters = {};

  for (const driver of driverMetrics.drivers) {
    for (const cluster of driver.clusters) {
      if (!clusters[cluster]) clusters[cluster] = { name: cluster, count: 0, drivers: [] };
      clusters[cluster].count++;
      clusters[cluster].drivers.push(driver.id);
    }
  }

  return {
    total: Object.keys(clusters).length,
    clusters: Object.values(clusters).sort((a, b) => b.count - a.count)
  };
}

/**
 * Collect image/asset coverage metrics
 */
function collectImageMetrics(driverMetrics) {
  const withImages = driverMetrics.drivers.filter(d => d.hasAssets).length;
  const withoutImages = driverMetrics.drivers.filter(d => !d.hasAssets).length;

  return {
    total: driverMetrics.total,
    withImages,
    withoutImages,
    coveragePercent: driverMetrics.total > 0 ? Math.round(withImages / driverMetrics.total * 100) : 0,
    missingDrivers: driverMetrics.drivers.filter(d => !d.hasAssets).map(d => d.id)
  };
}

/**
 * Load KNOWLEDGE_CACHE.json
 */
function loadKnowledgeCache() {
  if (!fs.existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH));
  } catch {
    return null;
  }
}

/**
 * Get app.json metadata
 */
function getAppMetadata() {
  const appJsonPath = path.join(ROOT, 'app.json');
  if (!fs.existsSync(appJsonPath)) return null;
  return safeJsonParse(safeReadFile(appJsonPath));
}

/**
 * Get git log
 */
function getGitLog(count = 30) {
  try {
    const raw = execSync(`git log --oneline -${count} --format="%h|%ai|%s"`, { encoding: 'utf8', cwd: ROOT });
    return raw.trim().split('\n').filter(Boolean).map(line => {
      const [hash, ...rest] = line.split('|');
      const dateStr = rest.slice(0, 2).join('|');
      const msg = rest.slice(2).join('|');
      return { hash, date: dateStr, message: msg };
    });
  } catch { return []; }
}

/**
 * Compute project health score
 */
function computeHealthScore(driverMetrics, fingerprintMetrics, flowCardMetrics) {
  let score = 100;
  const issues = [];
  const warnings = [];
  const strengths = [];

  // Driver completeness penalties
  const missingDevice = driverMetrics.drivers.filter(d => !d.hasDeviceJs).length;
  const missingCompose = driverMetrics.drivers.filter(d => !d.hasComposeJson).length;
  const emptyMfr = driverMetrics.emptyManufacturerNames;

  if (missingDevice > 0) { score -= missingDevice * 2; issues.push(`${missingDevice} drivers missing device.js`); }
  if (missingCompose > 0) { score -= missingCompose * 3; issues.push(`${missingCompose} drivers missing driver.compose.json`); }
  if (emptyMfr > 0) { score -= emptyMfr * 1; warnings.push(`${emptyMfr} drivers with empty manufacturerName arrays`); }

  // No flow cards penalty
  const noFlow = driverMetrics.drivers.filter(d => d.flowCardCount === 0 && d.hasComposeJson).length;
  if (noFlow > 0) { score -= noFlow * 0.3; warnings.push(`${noFlow} drivers have compose but no flow cards`); }

  // Strengths
  if (driverMetrics.total > 400) strengths.push(`${driverMetrics.total} drivers - comprehensive coverage`);
  if (fingerprintMetrics.totalDB > 3000) strengths.push(`${fingerprintMetrics.totalDB.toLocaleString()} fingerprints in database`);
  if (flowCardMetrics.total > 3000) strengths.push(`${flowCardMetrics.total.toLocaleString()} flow cards`);
  if (driverMetrics.withAssets / Math.max(driverMetrics.total, 1) > 0.9) strengths.push(`${Math.round(driverMetrics.withAssets / driverMetrics.total * 100)}% image coverage`);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    warnings,
    strengths
  };
}

/**
 * Master collector - runs all collectors
 */
function collectAll() {
  console.log('[COLLECTOR] Starting comprehensive metrics collection...');
  const start = Date.now();

  console.log('[COLLECTOR] Collecting driver metrics...');
  const drivers = collectDriverMetrics();
  console.log(`[COLLECTOR] Found ${drivers.total} drivers`);

  console.log('[COLLECTOR] Collecting fingerprint metrics...');
  const fingerprints = collectFingerprintMetrics();
  console.log(`[COLLECTOR] Fingerprints: ${fingerprints.totalDB.toLocaleString()}`);

  console.log('[COLLECTOR] Collecting flow card metrics...');
  const flowCards = collectFlowCardMetrics();
  console.log(`[COLLECTOR] Flow cards: ${flowCards.total}`);

  console.log('[COLLECTOR] Collecting library metrics...');
  const lib = collectLibMetrics();
  console.log(`[COLLECTOR] Library: ${lib.totalFiles} files, ${lib.totalLines.toLocaleString()} lines`);

  console.log('[COLLECTOR] Collecting workflow metrics...');
  const workflows = collectWorkflowMetrics();
  console.log(`[COLLECTOR] Workflows: ${workflows.total}`);

  console.log('[COLLECTOR] Collecting script metrics...');
  const scripts = collectScriptMetrics();
  console.log(`[COLLECTOR] Scripts: ${scripts.total}`);

  console.log('[COLLECTOR] Collecting cluster metrics...');
  const clusters = collectClusterMetrics(drivers);
  console.log(`[COLLECTOR] Clusters: ${clusters.total}`);

  console.log('[COLLECTOR] Collecting image metrics...');
  const images = collectImageMetrics(drivers);
  console.log(`[COLLECTOR] Image coverage: ${images.coveragePercent}%`);

  console.log('[COLLECTOR] Loading knowledge cache...');
  const knowledgeCache = loadKnowledgeCache();

  console.log('[COLLECTOR] Getting app metadata...');
  const appMeta = getAppMetadata();

  console.log('[COLLECTOR] Computing health score...');
  const health = computeHealthScore(drivers, fingerprints, flowCards);

  const elapsed = Date.now() - start;
  console.log(`[COLLECTOR] Collection complete in ${elapsed}ms`);

  return {
    timestamp: new Date().toISOString(),
    elapsed,
    drivers,
    fingerprints,
    flowCards,
    lib,
    workflows,
    scripts,
    clusters,
    images,
    health,
    knowledgeCache,
    appMeta
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  ROOT,
  DRIVERS_DIR,
  LIB_DIR,
  SCRIPTS_DIR,
  DATA_DIR,
  WORKFLOWS_DIR,
  CACHE_PATH,
  CATEGORY_RULES,
  categorizeDriver,
  getCategoryMeta,
  safeJsonParse,
  safeReadFile,
  countLines,
  getDirSize,
  getFileCount,
  walkJsFiles,
  collectDriverMetrics,
  collectFingerprintMetrics,
  collectFlowCardMetrics,
  collectLibMetrics,
  collectWorkflowMetrics,
  collectScriptMetrics,
  collectClusterMetrics,
  collectImageMetrics,
  loadKnowledgeCache,
  getAppMetadata,
  getGitLog,
  computeHealthScore,
  collectAll
};
