#!/usr/bin/env node
/**
 * dev-dashboard.js - Development Dashboard Cartography
 *
 * Collects all project metrics and generates an interactive HTML dashboard.
 * Shows driver health, fingerprint coverage, flow card status, MCU format
 * coverage, and recent changes timeline.
 *
 * Usage: node scripts/cartography/dev-dashboard.js [--output path]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const DATA_DIR = path.join(ROOT, 'data');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function safeRequire(modPath) {
  try { return require(modPath); } catch { return null; }
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch { return 0; }
}

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

function getBundleSize() {
  try {
    const distDir = path.join(ROOT, '.homeycompose');
    if (!fs.existsSync(distDir)) return { exists: false, sizeKB: 0 };
    const appJsonPath = path.join(ROOT, 'app.json');
    const stat = fs.statSync(appJsonPath);
    return { exists: true, sizeKB: Math.round(stat.size / 1024) };
  } catch { return { exists: false, sizeKB: 0 }; }
}

// ---------------------------------------------------------------------------
// Metrics Collectors
// ---------------------------------------------------------------------------

function collectDriverMetrics() {
  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  const metrics = {
    total: driverDirs.length,
    withDeviceJs: 0,
    withDriverJs: 0,
    withComposeJson: 0,
    withFlowCompose: 0,
    withAssets: 0,
    totalFingerprints: 0,
    totalFlowCards: 0,
    categories: {},
    protocols: { zigbee: 0, wifi: 0, hybrid: 0 },
    capabilities: new Set(),
    linesOfCode: 0,
    drivers: []
  };

  for (const driverId of driverDirs) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const info = {
      id: driverId,
      hasDeviceJs: false,
      hasDriverJs: false,
      hasComposeJson: false,
      hasFlowCompose: false,
      hasAssets: false,
      fingerprintCount: 0,
      flowCardCount: 0,
      capabilities: [],
      lines: 0,
      issues: []
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

    if (info.hasDeviceJs) metrics.withDeviceJs++;
    if (info.hasDriverJs) metrics.withDriverJs++;
    if (info.hasComposeJson) metrics.withComposeJson++;
    if (info.hasFlowCompose) metrics.withFlowCompose++;
    if (info.hasAssets) metrics.withAssets++;

    // Count lines
    if (info.hasDeviceJs) {
      const loc = countLines(deviceJs);
      info.lines = loc;
      metrics.linesOfCode += loc;
    }

    // Parse compose for capabilities and fingerprints
    if (info.hasComposeJson) {
      const compose = safeJsonParse(fs.readFileSync(composeJson, 'utf8'));
      if (compose) {
        info.capabilities = compose.capabilities || [];
        for (const cap of (compose.capabilities || [])) {
          metrics.capabilities.add(cap);
        }
        // Count fingerprints from capabilities.zigbee
        const zigbeeCap = (compose.capabilities || []).find(c => c === 'zigbee');
        if (zigbeeCap) {
          // Fingerprints are in a separate section
        }
      }
    }

    // Parse driver.compose.json for fingerprints
    const composeData = safeJsonParse(fs.readFileSync(composeJson, 'utf8'));
    if (composeData && composeData.capabilities) {
      for (const cap of composeData.capabilities) {
        if (typeof cap === 'object' && cap.fingerprints) {
          info.fingerprintCount += cap.fingerprints.length;
          metrics.totalFingerprints += cap.fingerprints.length;
        }
      }
    }

    // Count flow cards
    if (info.hasFlowCompose) {
      const flowData = safeJsonParse(fs.readFileSync(flowCompose, 'utf8'));
      if (flowData) {
        const count = (flowData.actions || []).length +
                     (flowData.conditions || []).length +
                     (flowData.triggers || []).length;
        info.flowCardCount = count;
        metrics.totalFlowCards += count;
      }
    }

    // Detect issues
    if (!info.hasDeviceJs) info.issues.push('Missing device.js');
    if (!info.hasDriverJs) info.issues.push('Missing driver.js');
    if (!info.hasComposeJson) info.issues.push('Missing driver.compose.json');
    if (!info.hasAssets) info.issues.push('Missing assets/images');

    // Detect protocol
    if (info.hasDeviceJs) {
      try {
        const deviceContent = fs.readFileSync(deviceJs, 'utf8');
        if (deviceContent.includes('TuyaLocalClient') || deviceContent.includes('wifi')) {
          info.protocol = 'wifi';
          metrics.protocols.wifi++;
        } else if (deviceContent.includes('TuyaZigbeeDevice') || deviceContent.includes('ZigBeeDevice')) {
          info.protocol = 'zigbee';
          metrics.protocols.zigbee++;
        } else {
          info.protocol = 'unknown';
        }
      } catch { info.protocol = 'unknown'; }
    }

    // Categorize driver
    const category = categorizeDriver(driverId);
    info.category = category;
    metrics.categories[category] = (metrics.categories[category] || 0) + 1;

    metrics.drivers.push(info);
  }

  metrics.capabilities = [...metrics.capabilities];
  return metrics;
}

function categorizeDriver(driverId) {
  const id = driverId.toLowerCase();
  if (id.includes('switch') || id.includes('relay')) return 'switches';
  if (id.includes('dimmer') || id.includes('dimmable')) return 'dimmers';
  if (id.includes('bulb') || id.includes('light') || id.includes('led')) return 'lights';
  if (id.includes('sensor') || id.includes('detector')) return 'sensors';
  if (id.includes('plug') || id.includes('outlet') || id.includes('power_point')) return 'plugs';
  if (id.includes('curtain') || id.includes('blind') || id.includes('shutter')) return 'covers';
  if (id.includes('button') || id.includes('remote') || id.includes('scene')) return 'buttons';
  if (id.includes('thermostat') || id.includes('climate') || id.includes('hvac')) return 'climate';
  if (id.includes('lock') || id.includes('fingerprint')) return 'locks';
  if (id.includes('fan')) return 'fans';
  if (id.includes('ir') || id.includes('blaster')) return 'ir';
  if (id.includes('gate') || id.includes('bridge')) return 'gateways';
  if (id.includes('siren') || id.includes('alarm')) return 'alarms';
  if (id.includes('air_purifier') || id.includes('humidifier') || id.includes('dehumidifier')) return 'air_quality';
  if (id.includes('garage') || id.includes('door')) return 'doors';
  if (id.includes('valve') || id.includes('water')) return 'valves';
  if (id.includes('smoke') || id.includes('gas') || id.includes('co_')) return 'safety';
  if (id.includes('flood') || id.includes('leak')) return 'leak';
  if (id.includes('soil')) return 'soil';
  if (id.includes('presence')) return 'presence';
  if (id.includes('motion')) return 'motion';
  if (id.includes('contact') || id.includes('window') || id.includes('doorwindow')) return 'contact';
  if (id.includes('illuminance') || id.includes('lux')) return 'light_sensors';
  if (id.includes('energy') || id.includes('meter') || id.includes('din')) return 'energy';
  if (id.includes('ceiling_fan')) return 'ceiling_fans';
  return 'other';
}

function collectFingerprintMetrics() {
  const metrics = {
    totalDB: 0,
    source: 'unknown',
    loaded: false,
    paths: []
  };

  const fpPaths = [
    path.join(DATA_DIR, 'fingerprints.json'),
    path.join(LIB_DIR, 'data', 'fingerprints.json'),
    path.join(LIB_DIR, 'tuya', 'fingerprints.json')
  ];

  for (const fpPath of fpPaths) {
    if (fs.existsSync(fpPath)) {
      metrics.paths.push(fpPath);
      const stat = fs.statSync(fpPath);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);

      try {
        const data = JSON.parse(fs.readFileSync(fpPath));
        metrics.totalDB = Object.keys(data).length;
        metrics.loaded = true;
        metrics.source = fpPath;
        metrics.sizeMB = sizeMB;
      } catch {
        metrics.sizeMB = sizeMB;
      }
      break;
    }
  }

  return metrics;
}

function collectFlowCardMetrics() {
  const appJsonPath = path.join(ROOT, 'app.json');
  if (!fs.existsSync(appJsonPath)) return { total: 0, byType: {} };

  const appJson = safeJsonParse(fs.readFileSync(appJsonPath, 'utf8'));
  if (!appJson || !appJson.flow) return { total: 0, byType: {} };

  const flow = appJson.flow;
  const metrics = {
    total: 0,
    byType: {
      triggers: 0,
      conditions: 0,
      actions: 0
    },
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

function collectMCUCoverage() {
  const mcuFormats = {
    tuyaDP00EF00: { name: 'Tuya DP 0xEF00', count: 0, drivers: [] },
    zclOnOff: { name: 'ZCL On/Off', count: 0, drivers: [] },
    zclLevelControl: { name: 'ZCL Level Control', count: 0, drivers: [] },
    zclColorControl: { name: 'ZCL Color Control', count: 0, drivers: [] },
    zclWindowCovering: { name: 'ZCL Window Covering', count: 0, drivers: [] },
    zclIASZone: { name: 'ZCL IAS Zone', count: 0, drivers: [] },
    zclMetering: { name: 'ZCL Metering', count: 0, drivers: [] },
    zclThermostat: { name: 'ZCL Thermostat', count: 0, drivers: [] },
    custom: { name: 'Custom Tuya', count: 0, drivers: [] }
  };

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  for (const driverId of driverDirs) {
    const deviceJsPath = path.join(DRIVERS_DIR, driverId, 'device.js');
    if (!fs.existsSync(deviceJsPath)) continue;

    try {
      const content = fs.readFileSync(deviceJsPath, 'utf8');
      let categorized = false;

      if (content.includes('TuyaEF00Manager') || content.includes('0xEF00') || content.includes('dpMapping')) {
        mcuFormats.tuyaDP00EF00.count++;
        mcuFormats.tuyaDP00EF00.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('OnOff') || content.includes('onoff') || content.includes('genOnOff')) {
        mcuFormats.zclOnOff.count++;
        mcuFormats.zclOnOff.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('LevelControl') || content.includes('level') || content.includes('genLevelCtrl')) {
        mcuFormats.zclLevelControl.count++;
        mcuFormats.zclLevelControl.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('ColorControl') || content.includes('color') || content.includes('genColorCtrl')) {
        mcuFormats.zclColorControl.count++;
        mcuFormats.zclColorControl.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('WindowCovering') || content.includes('windowCovering')) {
        mcuFormats.zclWindowCovering.count++;
        mcuFormats.zclWindowCovering.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('IASZone') || content.includes('iasZone') || content.includes('iasCie')) {
        mcuFormats.zclIASZone.count++;
        mcuFormats.zclIASZone.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('Metering') || content.includes('metering') || content.includes('seMetering')) {
        mcuFormats.zclMetering.count++;
        mcuFormats.zclMetering.drivers.push(driverId);
        categorized = true;
      }
      if (content.includes('Thermostat') || content.includes('thermostat') || content.includes('hvacThermostat')) {
        mcuFormats.zclThermostat.count++;
        mcuFormats.zclThermostat.drivers.push(driverId);
        categorized = true;
      }
      if (!categorized && content.includes('Tuya')) {
        mcuFormats.custom.count++;
        mcuFormats.custom.drivers.push(driverId);
      }
    } catch { /* skip */ }
  }

  return mcuFormats;
}

function collectLibMetrics() {
  const metrics = {
    totalFiles: 0,
    totalLines: 0,
    modules: [],
    byDir: {}
  };

  function walkLib(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkLib(full);
      } else if (entry.name.endsWith('.js')) {
        const lines = countLines(full);
        metrics.totalFiles++;
        metrics.totalLines += lines;

        const rel = path.relative(LIB_DIR, full);
        const dirName = path.dirname(rel).split(path.sep)[0] || 'root';
        metrics.byDir[dirName] = (metrics.byDir[dirName] || 0) + lines;

        metrics.modules.push({
          path: rel,
          lines,
          size: fs.statSync(full).size
        });
      }
    }
  }

  walkLib(LIB_DIR);
  metrics.modules.sort((a, b) => b.lines - a.lines);
  return metrics;
}

function collectHealthIndicators(driverMetrics) {
  const health = {
    score: 0,
    issues: [],
    warnings: [],
    strengths: []
  };

  // Score: 100 base
  let score = 100;

  // Missing files penalty
  const missingDevice = driverMetrics.drivers.filter(d => !d.hasDeviceJs).length;
  const missingDriver = driverMetrics.drivers.filter(d => !d.hasDriverJs).length;
  const missingCompose = driverMetrics.drivers.filter(d => !d.hasComposeJson).length;
  const missingAssets = driverMetrics.drivers.filter(d => !d.hasAssets).length;

  if (missingDevice > 0) {
    score -= missingDevice * 2;
    health.issues.push(`${missingDevice} drivers missing device.js`);
  }
  if (missingDriver > 0) {
    score -= missingDriver * 1;
    health.warnings.push(`${missingDriver} drivers missing driver.js`);
  }
  if (missingCompose > 0) {
    score -= missingCompose * 3;
    health.issues.push(`${missingCompose} drivers missing driver.compose.json`);
  }
  if (missingAssets > 0) {
    score -= missingAssets * 0.5;
    health.warnings.push(`${missingAssets} drivers missing assets/images`);
  }

  // No flow cards penalty
  const noFlow = driverMetrics.drivers.filter(d => d.flowCardCount === 0 && d.hasComposeJson).length;
  if (noFlow > 0) {
    score -= noFlow * 0.3;
    health.warnings.push(`${noFlow} drivers have compose but no flow cards`);
  }

  // Strengths
  if (driverMetrics.totalFingerprints > 20000) {
    health.strengths.push(`Rich fingerprint database: ${driverMetrics.totalFingerprints.toLocaleString()} entries`);
  }
  if (driverMetrics.withAssets / driverMetrics.total > 0.9) {
    health.strengths.push(`${Math.round(driverMetrics.withAssets / driverMetrics.total * 100)}% of drivers have images`);
  }
  if (driverMetrics.protocols.zigbee > driverMetrics.total * 0.7) {
    health.strengths.push(`Strong Zigbee coverage: ${driverMetrics.protocols.zigbee} drivers`);
  }

  health.score = Math.max(0, Math.min(100, Math.round(score)));
  return health;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateHTML(metrics) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Universal Tuya Zigbee - Dev Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: #0a0e17; color: #c9d1d9;
    padding: 20px; line-height: 1.6;
  }
  h1 { color: #58a6ff; margin-bottom: 10px; font-size: 1.8em; }
  h2 { color: #79c0ff; margin: 20px 0 10px; font-size: 1.3em; border-bottom: 1px solid #21262d; padding-bottom: 5px; }
  h3 { color: #8b949e; margin: 15px 0 8px; font-size: 1.1em; }
  .subtitle { color: #8b949e; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin: 16px 0; }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 16px; transition: border-color 0.2s;
  }
  .card:hover { border-color: #58a6ff; }
  .card-title { color: #58a6ff; font-weight: 600; margin-bottom: 8px; }
  .metric { font-size: 2em; font-weight: 700; color: #f0f6fc; }
  .metric-label { font-size: 0.85em; color: #8b949e; }
  .metric-change { font-size: 0.85em; }
  .metric-change.positive { color: #3fb950; }
  .metric-change.negative { color: #f85149; }
  .bar { height: 20px; background: #21262d; border-radius: 4px; overflow: hidden; margin: 4px 0; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .bar-fill.green { background: linear-gradient(90deg, #238636, #3fb950); }
  .bar-fill.blue { background: linear-gradient(90deg, #1f6feb, #58a6ff); }
  .bar-fill.yellow { background: linear-gradient(90deg, #9e6a03, #d29922); }
  .bar-fill.red { background: linear-gradient(90deg, #da3633, #f85149); }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #21262d; font-size: 0.9em; }
  th { color: #79c0ff; font-weight: 600; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin: 2px; }
  .tag-green { background: #238636; color: #fff; }
  .tag-blue { background: #1f6feb; color: #fff; }
  .tag-yellow { background: #9e6a03; color: #fff; }
  .tag-red { background: #da3633; color: #fff; }
  .tag-gray { background: #30363d; color: #c9d1d9; }
  .health-score {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 10px 20px; border-radius: 8px; font-size: 1.5em; font-weight: 700;
  }
  .health-good { background: #238636; color: #fff; }
  .health-warn { background: #9e6a03; color: #fff; }
  .health-bad { background: #da3633; color: #fff; }
  .timeline { max-height: 400px; overflow-y: auto; }
  .timeline-item { padding: 6px 0; border-left: 2px solid #30363d; padding-left: 12px; margin-left: 8px; }
  .timeline-hash { color: #58a6ff; font-family: monospace; }
  .timeline-date { color: #8b949e; font-size: 0.85em; }
  .timeline-msg { color: #c9d1d9; }
  .section { margin-bottom: 30px; }
  .pie-chart { display: inline-block; width: 20px; height: 20px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .coverage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .coverage-item { text-align: center; padding: 12px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; }
  .coverage-num { font-size: 1.8em; font-weight: 700; }
  pre { background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em; border: 1px solid #30363d; }
</style>
</head>
<body>

<h1>Universe Tuya Zigbee - Dev Dashboard</h1>
<p class="subtitle">Generated: ${timestamp} | Version: ${metrics.appJson ? metrics.appJson.version : 'unknown'}</p>

<!-- Health Score -->
<div class="section">
  <div class="health-score ${metrics.health.score >= 80 ? 'health-good' : metrics.health.score >= 60 ? 'health-warn' : 'health-bad'}">
    <span>${metrics.health.score}/100</span>
    <span style="font-size:0.5em;font-weight:400">Project Health Score</span>
  </div>
  ${metrics.health.strengths.map(s => `<span class="tag tag-green">${s}</span>`).join(' ')}
  ${metrics.health.warnings.map(w => `<span class="tag tag-yellow">${w}</span>`).join(' ')}
  ${metrics.health.issues.map(i => `<span class="tag tag-red">${i}</span>`).join(' ')}
</div>

<!-- Overview Metrics -->
<div class="section">
  <h2>Overview</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Drivers</div>
      <div class="metric">${metrics.drivers.total}</div>
      <div class="metric-label">Total driver modules</div>
    </div>
    <div class="card">
      <div class="card-title">Fingerprints</div>
      <div class="metric">${metrics.fingerprints.totalDB.toLocaleString()}</div>
      <div class="metric-label">In database</div>
    </div>
    <div class="card">
      <div class="card-title">Flow Cards</div>
      <div class="metric">${metrics.flowCards.total}</div>
      <div class="metric-label">Triggers: ${metrics.flowCards.byType.triggers} | Conditions: ${metrics.flowCards.byType.conditions} | Actions: ${metrics.flowCards.byType.actions}</div>
    </div>
    <div class="card">
      <div class="card-title">Lines of Code</div>
      <div class="metric">${metrics.libMetrics.totalLines.toLocaleString()}</div>
      <div class="metric-label">${metrics.libMetrics.totalFiles} files in lib/</div>
    </div>
    <div class="card">
      <div class="card-title">Bundle Size</div>
      <div class="metric">${metrics.bundleSize.sizeKB} KB</div>
      <div class="metric-label">app.json</div>
    </div>
    <div class="card">
      <div class="card-title">Capabilities</div>
      <div class="metric">${metrics.drivers.capabilities.length}</div>
      <div class="metric-label">Unique capability types</div>
    </div>
  </div>
</div>

<!-- Driver Health -->
<div class="section">
  <h2>Driver Health</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">File Completeness</div>
      <div class="bar"><div class="bar-fill green" style="width:${(metrics.drivers.withDeviceJs / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85em">
        <span>device.js: ${metrics.drivers.withDeviceJs}/${metrics.drivers.total}</span>
        <span>${(metrics.drivers.withDeviceJs / metrics.drivers.total * 100).toFixed(1)}%</span>
      </div>
      <div class="bar"><div class="bar-fill green" style="width:${(metrics.drivers.withDriverJs / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85em">
        <span>driver.js: ${metrics.drivers.withDriverJs}/${metrics.drivers.total}</span>
        <span>${(metrics.drivers.withDriverJs / metrics.drivers.total * 100).toFixed(1)}%</span>
      </div>
      <div class="bar"><div class="bar-fill blue" style="width:${(metrics.drivers.withComposeJson / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85em">
        <span>compose.json: ${metrics.drivers.withComposeJson}/${metrics.drivers.total}</span>
        <span>${(metrics.drivers.withComposeJson / metrics.drivers.total * 100).toFixed(1)}%</span>
      </div>
      <div class="bar"><div class="bar-fill yellow" style="width:${(metrics.drivers.withFlowCompose / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85em">
        <span>flow.compose: ${metrics.drivers.withFlowCompose}/${metrics.drivers.total}</span>
        <span>${(metrics.drivers.withFlowCompose / metrics.drivers.total * 100).toFixed(1)}%</span>
      </div>
      <div class="bar"><div class="bar-fill blue" style="width:${(metrics.drivers.withAssets / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85em">
        <span>assets/images: ${metrics.drivers.withAssets}/${metrics.drivers.total}</span>
        <span>${(metrics.drivers.withAssets / metrics.drivers.total * 100).toFixed(1)}%</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Protocol Distribution</div>
      <div class="bar"><div class="bar-fill green" style="width:${(metrics.drivers.protocols.zigbee / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="font-size:0.85em">Zigbee: ${metrics.drivers.protocols.zigbee} (${(metrics.drivers.protocols.zigbee / metrics.drivers.total * 100).toFixed(1)}%)</div>
      <div class="bar"><div class="bar-fill blue" style="width:${(metrics.drivers.protocols.wifi / metrics.drivers.total * 100).toFixed(1)}%"></div></div>
      <div style="font-size:0.85em">WiFi: ${metrics.drivers.protocols.wifi} (${(metrics.drivers.protocols.wifi / metrics.drivers.total * 100).toFixed(1)}%)</div>
    </div>
  </div>
</div>

<!-- Driver Categories -->
<div class="section">
  <h2>Driver Categories (${Object.keys(metrics.drivers.categories).length} categories)</h2>
  <div class="coverage-grid">
    ${Object.entries(metrics.drivers.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `
    <div class="coverage-item">
      <div class="coverage-num" style="color:${getCategoryColor(cat)}">${count}</div>
      <div style="font-size:0.85em;color:#8b949e">${cat}</div>
    </div>`).join('')}
  </div>
</div>

<!-- MCU Format Coverage -->
<div class="section">
  <h2>MCU / Protocol Format Coverage</h2>
  <table>
    <thead><tr><th>Format</th><th>Drivers</th><th>Coverage</th></tr></thead>
    <tbody>
    ${Object.values(metrics.mcuFormats)
      .sort((a, b) => b.count - a.count)
      .map(m => `
      <tr>
        <td>${m.name}</td>
        <td>${m.count}</td>
        <td>
          <div class="bar" style="width:200px;display:inline-block;vertical-align:middle">
            <div class="bar-fill blue" style="width:${(m.count / metrics.drivers.total * 100).toFixed(1)}%"></div>
          </div>
          <span style="font-size:0.85em;margin-left:8px">${(m.count / metrics.drivers.total * 100).toFixed(1)}%</span>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- Flow Cards -->
<div class="section">
  <h2>Flow Card Status</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">By Type</div>
      <div class="bar"><div class="bar-fill green" style="width:${metrics.flowCards.total > 0 ? (metrics.flowCards.byType.triggers / metrics.flowCards.total * 100) : 0}%"></div></div>
      <div style="font-size:0.85em">Triggers: ${metrics.flowCards.byType.triggers}</div>
      <div class="bar"><div class="bar-fill blue" style="width:${metrics.flowCards.total > 0 ? (metrics.flowCards.byType.conditions / metrics.flowCards.total * 100) : 0}%"></div></div>
      <div style="font-size:0.85em">Conditions: ${metrics.flowCards.byType.conditions}</div>
      <div class="bar"><div class="bar-fill yellow" style="width:${metrics.flowCards.total > 0 ? (metrics.flowCards.byType.actions / metrics.flowCards.total * 100) : 0}%"></div></div>
      <div style="font-size:0.85em">Actions: ${metrics.flowCards.byType.actions}</div>
    </div>
    <div class="card">
      <div class="card-title">Coverage</div>
      <div class="metric">${metrics.drivers.withFlowCompose}/${metrics.drivers.withComposeJson}</div>
      <div class="metric-label">Drivers with flow cards</div>
      <div class="bar" style="margin-top:8px"><div class="bar-fill green" style="width:${metrics.drivers.withComposeJson > 0 ? (metrics.drivers.withFlowCompose / metrics.drivers.withComposeJson * 100) : 0}%"></div></div>
    </div>
  </div>
</div>

<!-- Lib Module Hotspots -->
<div class="section">
  <h2>Library Module Hotspots (Top 20 by LOC)</h2>
  <table>
    <thead><tr><th>Module</th><th>Lines</th><th>Size</th></tr></thead>
    <tbody>
    ${metrics.libMetrics.modules.slice(0, 20).map(m => `
      <tr>
        <td style="font-family:monospace;color:#58a6ff">${m.path}</td>
        <td>${m.lines.toLocaleString()}</td>
        <td>${(m.size / 1024).toFixed(1)} KB</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- Recent Changes Timeline -->
<div class="section">
  <h2>Recent Changes (Last 30 Commits)</h2>
  <div class="timeline">
    ${metrics.gitLog.map(commit => `
    <div class="timeline-item">
      <span class="timeline-hash">${commit.hash}</span>
      <span class="timeline-date">${commit.date}</span>
      <div class="timeline-msg">${escapeHtml(commit.message)}</div>
    </div>`).join('')}
  </div>
</div>

<!-- Top Issues -->
${metrics.topIssues.length > 0 ? `
<div class="section">
  <h2>Driver Issues</h2>
  <table>
    <thead><tr><th>Driver</th><th>Issues</th></tr></thead>
    <tbody>
    ${metrics.topIssues.map(d => `
      <tr>
        <td>${d.id}</td>
        <td>${d.issues.map(i => `<span class="tag tag-red">${i}</span>`).join(' ')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<pre>
=== Dashboard Summary ===
Drivers: ${metrics.drivers.total}
Fingerprints: ${metrics.fingerprints.totalDB.toLocaleString()}
Flow Cards: ${metrics.flowCards.total}
LOC (lib): ${metrics.libMetrics.totalLines.toLocaleString()}
Health Score: ${metrics.health.score}/100
Generated: ${timestamp}
</pre>

</body>
</html>`;
}

function getCategoryColor(cat) {
  const colors = {
    switches: '#3fb950', dimmers: '#d29922', lights: '#f0883e',
    sensors: '#58a6ff', plugs: '#3fb950', covers: '#bc8cff',
    buttons: '#f85149', climate: '#ff7b72', locks: '#d29922',
    fans: '#79c0ff', ir: '#f0883e', gateways: '#8b949e',
    alarms: '#f85149', air_quality: '#3fb950', doors: '#58a6ff',
    valves: '#79c0ff', safety: '#f85149', leak: '#58a6ff',
    soil: '#d29922', presence: '#bc8cff', motion: '#f0883e',
    contact: '#3fb950', light_sensors: '#d29922', energy: '#58a6ff',
    ceiling_fans: '#79c0ff', other: '#8b949e'
  };
  return colors[cat] || '#8b949e';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[DEV-DASHBOARD] Collecting project metrics...');

  // Parse args
  const args = process.argv.slice(2);
  let outputPath = path.join(ROOT, 'scripts', 'cartography', 'dashboard-output.html');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
  }

  // Collect all metrics
  console.log('[DEV-DASHBOARD] Scanning drivers...');
  const driverMetrics = collectDriverMetrics();

  console.log('[DEV-DASHBOARD] Loading fingerprints...');
  const fingerprintMetrics = collectFingerprintMetrics();

  console.log('[DEV-DASHBOARD] Analyzing flow cards...');
  const flowCardMetrics = collectFlowCardMetrics();

  console.log('[DEV-DASHBOARD] Mapping MCU coverage...');
  const mcuFormats = collectMCUCoverage();

  console.log('[DEV-DASHBOARD] Scanning library...');
  const libMetrics = collectLibMetrics();

  console.log('[DEV-DASHBOARD] Computing health...');
  const health = collectHealthIndicators(driverMetrics);

  console.log('[DEV-DASHBOARD] Getting git log...');
  const gitLog = getGitLog(30);

  console.log('[DEV-DASHBOARD] Checking bundle...');
  const bundleSize = getBundleSize();

  // Load app.json
  let appJson = null;
  try { appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')); } catch {}

  const topIssues = driverMetrics.drivers.filter(d => d.issues.length > 0);

  const metrics = {
    drivers: driverMetrics,
    fingerprints: fingerprintMetrics,
    flowCards: flowCardMetrics,
    mcuFormats,
    libMetrics,
    health,
    gitLog,
    bundleSize,
    appJson,
    topIssues
  };

  // Generate HTML
  console.log('[DEV-DASHBOARD] Generating HTML...');
  const html = generateHTML(metrics);
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`[DEV-DASHBOARD] Dashboard generated: ${outputPath}`);
  console.log(`[DEV-DASHBOARD] Summary:`);
  console.log(`  Drivers: ${driverMetrics.total}`);
  console.log(`  Fingerprints: ${fingerprintMetrics.totalDB.toLocaleString()}`);
  console.log(`  Flow Cards: ${flowCardMetrics.total}`);
  console.log(`  LOC (lib): ${libMetrics.totalLines.toLocaleString()}`);
  console.log(`  Health Score: ${health.score}/100`);
  console.log(`  Issues: ${topIssues.length}`);
}

main();
