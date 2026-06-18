#!/usr/bin/env node
/**
 * coverage-map.js - Coverage Map Cartography
 *
 * Maps all drivers to device categories, shows fingerprint coverage per
 * category, identifies gaps in coverage, and generates a visual coverage map
 * as an HTML treemap plus a text summary.
 *
 * Usage: node scripts/cartography/coverage-map.js [--output path] [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// ---------------------------------------------------------------------------
// Category Definitions
// ---------------------------------------------------------------------------

const CATEGORY_RULES = [
  { id: 'switches',       label: 'Switches & Relays',     color: '#3fb950', patterns: ['switch', 'relay'] },
  { id: 'dimmers',        label: 'Dimmers',               color: '#d29922', patterns: ['dimmer', 'dimmable', 'dim'] },
  { id: 'lights',         label: 'Lights & Bulbs',        color: '#f0883e', patterns: ['bulb', 'light', 'led', 'lamp', 'rgb'] },
  { id: 'sensors',        label: 'Sensors',               color: '#58a6ff', patterns: ['sensor'] },
  { id: 'plugs',          label: 'Plugs & Outlets',       color: '#3fb950', patterns: ['plug', 'outlet', 'power_point', 'socket'] },
  { id: 'covers',         label: 'Covers & Blinds',       color: '#bc8cff', patterns: ['curtain', 'blind', 'shutter', 'cover'] },
  { id: 'buttons',        label: 'Buttons & Remotes',     color: '#f85149', patterns: ['button', 'remote', 'scene', 'knob', 'handheld'] },
  { id: 'climate',        label: 'Climate & HVAC',        color: '#ff7b72', patterns: ['thermostat', 'climate', 'hvac', 'air_conditioner'] },
  { id: 'locks',          label: 'Locks',                 color: '#d29922', patterns: ['lock', 'fingerprint'] },
  { id: 'fans',           label: 'Fans',                  color: '#79c0ff', patterns: ['fan'] },
  { id: 'ir',             label: 'IR Blasters',           color: '#f0883e', patterns: ['ir_blaster', 'blaster_remote', 'ir_remote'] },
  { id: 'gateways',       label: 'Gateways & Bridges',    color: '#8b949e', patterns: ['gateway', 'bridge', 'repeater'] },
  { id: 'alarms',         label: 'Sirens & Alarms',       color: '#f85149', patterns: ['siren', 'alarm'] },
  { id: 'air_quality',    label: 'Air Quality & Purifier', color: '#3fb950', patterns: ['air_purifier', 'air_quality', 'humidifier', 'dehumidifier'] },
  { id: 'safety',         label: 'Safety (Smoke/CO/Gas)', color: '#f85149', patterns: ['smoke', 'gas_detector', 'gas_sensor', 'co_sensor', 'co_'] },
  { id: 'leak',           label: 'Leak Sensors',          color: '#58a6ff', patterns: ['flood', 'leak', 'water'] },
  { id: 'soil',           label: 'Soil Sensors',          color: '#d29922', patterns: ['soil'] },
  { id: 'presence',       label: 'Presence Sensors',      color: '#bc8cff', patterns: ['presence'] },
  { id: 'motion',         label: 'Motion Sensors',        color: '#f0883e', patterns: ['motion'] },
  { id: 'contact',        label: 'Contact & Door/Window', color: '#3fb950', patterns: ['contact', 'doorwindow', 'door_window'] },
  { id: 'light_sensors',  label: 'Light Sensors',         color: '#d29922', patterns: ['illuminance', 'lux'] },
  { id: 'energy',         label: 'Energy Meters',         color: '#58a6ff', patterns: ['energy', 'meter', 'din_rail', 'power'] },
  { id: 'ceiling_fans',   label: 'Ceiling Fans',          color: '#79c0ff', patterns: ['ceiling_fan'] },
  { id: 'valves',         label: 'Valves',                color: '#79c0ff', patterns: ['valve'] },
  { id: 'doors',          label: 'Door Controllers',      color: '#58a6ff', patterns: ['garage', 'door_controller'] },
  { id: 'christmas',      label: 'Holiday Lights',        color: '#f0883e', patterns: ['christmas'] },
  { id: 'bed',            label: 'Bed Sensors',           color: '#bc8cff', patterns: ['bed_sensor'] },
  { id: 'generic',        label: 'Generic / Universal',   color: '#8b949e', patterns: ['generic', 'universal', 'diy', 'dummy', 'ts0601'] },
  { id: 'other',          label: 'Uncategorized',         color: '#6e7681', patterns: [] }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function categorizeDriver(driverId) {
  const id = driverId.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.id === 'other') continue;
    if (rule.patterns.some(p => id.includes(p))) return rule.id;
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

function collectAllDrivers() {
  if (!fs.existsSync(DRIVERS_DIR)) return [];

  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  return dirs.map(driverId => {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const info = {
      id: driverId,
      category: categorizeDriver(driverId),
      hasDeviceJs: fs.existsSync(path.join(driverPath, 'device.js')),
      hasDriverJs: fs.existsSync(path.join(driverPath, 'driver.js')),
      hasComposeJson: fs.existsSync(path.join(driverPath, 'driver.compose.json')),
      hasFlowCompose: fs.existsSync(path.join(driverPath, 'driver.flow.compose.json')),
      hasAssets: fs.existsSync(path.join(driverPath, 'assets', 'images')),
      fingerprintCount: 0,
      flowCardCount: 0,
      capabilities: [],
      manufacturerNames: [],
      issues: []
    };

    // Parse compose.json for fingerprints and capabilities
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (info.hasComposeJson) {
      const compose = safeJsonParse(fs.readFileSync(composePath, 'utf8'));
      if (compose) {
        const caps = Array.isArray(compose.capabilities) ? compose.capabilities : [];
        info.capabilities = caps;

        // Extract fingerprints from zigbee.manufacturerName (the standard location)
        if (compose.zigbee && Array.isArray(compose.zigbee.manufacturerName)) {
          info.fingerprintCount = compose.zigbee.manufacturerName.length;
          info.manufacturerNames = compose.zigbee.manufacturerName.slice(0, 5);
        }
      }
    }

    // Parse flow cards
    if (info.hasFlowCompose) {
      const flowData = safeJsonParse(fs.readFileSync(path.join(driverPath, 'driver.flow.compose.json'), 'utf8'));
      if (flowData) {
        info.flowCardCount = (flowData.actions || []).length +
                             (flowData.conditions || []).length +
                             (flowData.triggers || []).length;
      }
    }

    // Detect manufacturer names from device.js
    if (info.hasDeviceJs) {
      try {
        const deviceContent = fs.readFileSync(path.join(driverPath, 'device.js'), 'utf8');
        const mfrMatches = deviceContent.match(/manufacturerName[:\s]*['"]([^'"]+)['"]/gi);
        if (mfrMatches) {
          info.manufacturerNames = mfrMatches.map(m => {
            const val = m.match(/['"]([^'"]+)['"]/);
            return val ? val[1] : null;
          }).filter(Boolean);
        }
      } catch { /* skip */ }
    }

    // Detect issues
    if (!info.hasDeviceJs) info.issues.push('NO_DEVICE_JS');
    if (!info.hasComposeJson) info.issues.push('NO_COMPOSE');
    if (!info.hasAssets) info.issues.push('NO_ASSETS');
    if (info.fingerprintCount === 0 && info.hasComposeJson) info.issues.push('NO_FINGERPRINTS');
    if (info.flowCardCount === 0 && info.hasComposeJson) info.issues.push('NO_FLOW_CARDS');

    return info;
  });
}

function analyzeCoverageByCategory(drivers) {
  const categories = {};

  for (const rule of CATEGORY_RULES) {
    categories[rule.id] = {
      id: rule.id,
      label: rule.label,
      color: rule.color,
      drivers: [],
      totalFingerprints: 0,
      totalFlowCards: 0,
      healthScore: 100,
      issues: []
    };
  }

  for (const driver of drivers) {
    const cat = categories[driver.category];
    cat.drivers.push(driver);
    cat.totalFingerprints += driver.fingerprintCount;
    cat.totalFlowCards += driver.flowCardCount;

    if (!driver.hasDeviceJs) cat.issues.push({ driver: driver.id, issue: 'NO_DEVICE_JS' });
    if (!driver.hasComposeJson) cat.issues.push({ driver: driver.id, issue: 'NO_COMPOSE' });
    if (driver.fingerprintCount === 0) cat.issues.push({ driver: driver.id, issue: 'NO_FINGERPRINTS' });
  }

  // Calculate health per category
  for (const cat of Object.values(categories)) {
    if (cat.drivers.length === 0) {
      cat.healthScore = 0;
      continue;
    }
    const withDevice = cat.drivers.filter(d => d.hasDeviceJs).length;
    const withFp = cat.drivers.filter(d => d.fingerprintCount > 0).length;
    const withFlow = cat.drivers.filter(d => d.flowCardCount > 0).length;

    cat.healthScore = Math.round(
      (withDevice / cat.drivers.length * 30) +
      (withFp / cat.drivers.length * 40) +
      (withFlow / cat.drivers.length * 30)
    );
  }

  return categories;
}

function findGaps(categories) {
  const gaps = [];

  // Empty categories (no drivers)
  for (const cat of Object.values(categories)) {
    if (cat.drivers.length === 0 && cat.id !== 'other') {
      gaps.push({
        type: 'EMPTY_CATEGORY',
        category: cat.id,
        label: cat.label,
        severity: 'info',
        message: `Category "${cat.label}" has no drivers`
      });
    }
  }

  // Categories with 0 fingerprints
  for (const cat of Object.values(categories)) {
    if (cat.drivers.length > 0 && cat.totalFingerprints === 0) {
      gaps.push({
        type: 'NO_FINGERPRINTS',
        category: cat.id,
        label: cat.label,
        severity: 'warning',
        message: `${cat.drivers.length} drivers in "${cat.label}" have zero fingerprints`
      });
    }
  }

  // Drivers with issues
  for (const cat of Object.values(categories)) {
    for (const issue of cat.issues) {
      gaps.push({
        type: issue.issue,
        category: cat.id,
        label: cat.label,
        driver: issue.driver,
        severity: issue.issue === 'NO_DEVICE_JS' ? 'error' : 'warning',
        message: `Driver "${issue.driver}" in "${cat.label}": ${issue.issue}`
      });
    }
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateHTML(categories, drivers, gaps) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const totalDrivers = drivers.length;
  const totalFingerprints = drivers.reduce((s, d) => s + d.fingerprintCount, 0);
  const totalFlowCards = drivers.reduce((s, d) => s + d.flowCardCount, 0);

  // Sort categories by driver count descending
  const sortedCats = Object.values(categories)
    .filter(c => c.drivers.length > 0)
    .sort((a, b) => b.drivers.length - a.drivers.length);

  const maxDrivers = Math.max(...sortedCats.map(c => c.drivers.length), 1);

  // Treemap data: proportional rectangles
  const treemapItems = sortedCats.map(c => ({
    ...c,
    ratio: c.drivers.length / totalDrivers
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Universal Tuya Zigbee - Coverage Map</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: #0a0e17; color: #c9d1d9; padding: 20px;
  }
  h1 { color: #58a6ff; margin-bottom: 5px; }
  h2 { color: #79c0ff; margin: 24px 0 12px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }
  .subtitle { color: #8b949e; margin-bottom: 20px; }
  .summary-bar { display: flex; gap: 24px; margin: 16px 0; flex-wrap: wrap; }
  .summary-item { font-size: 0.95em; }
  .summary-item strong { color: #f0f6fc; }
  .treemap { display: flex; flex-wrap: wrap; gap: 2px; margin: 16px 0; }
  .treemap-cell {
    border-radius: 6px; padding: 10px; text-align: center;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    min-height: 60px; transition: transform 0.15s;
    cursor: default; overflow: hidden;
  }
  .treemap-cell:hover { transform: scale(1.03); z-index: 2; }
  .treemap-num { font-size: 1.6em; font-weight: 700; color: #fff; }
  .treemap-label { font-size: 0.75em; color: rgba(255,255,255,0.8); margin-top: 2px; }
  .treemap-fp { font-size: 0.65em; color: rgba(255,255,255,0.6); }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #21262d; font-size: 0.9em; }
  th { color: #79c0ff; }
  .bar { height: 14px; background: #21262d; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .health-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 0.8em; font-weight: 600; color: #fff;
  }
  .health-good { background: #238636; }
  .health-mid { background: #9e6a03; }
  .health-bad { background: #da3633; }
  .tag { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 0.75em; margin: 1px; }
  .tag-err { background: #da3633; color: #fff; }
  .tag-warn { background: #9e6a03; color: #fff; }
  .tag-info { background: #1f6feb; color: #fff; }
  .gap-list { max-height: 300px; overflow-y: auto; }
  .gap-item { padding: 4px 0; border-left: 3px solid #30363d; padding-left: 8px; margin: 4px 0 4px 6px; }
  .gap-err { border-color: #da3633; }
  .gap-warn { border-color: #9e6a03; }
  .gap-info { border-color: #1f6feb; }
  .category-detail { margin: 12px 0; padding: 12px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; }
  .category-detail h3 { color: #79c0ff; margin-bottom: 6px; }
  .driver-chip {
    display: inline-block; padding: 3px 8px; margin: 2px;
    background: #21262d; border-radius: 4px; font-size: 0.8em;
    border: 1px solid #30363d;
  }
  .driver-chip.issue { border-color: #da3633; }
  pre { background: #161b22; padding: 12px; border-radius: 6px; border: 1px solid #30363d; font-size: 0.85em; overflow-x: auto; }
</style>
</head>
<body>

<h1>Coverage Map</h1>
<p class="subtitle">Universal Tuya Zigbee - Driver Category & Fingerprint Coverage | ${timestamp}</p>

<div class="summary-bar">
  <div class="summary-item"><strong>${totalDrivers}</strong> drivers</div>
  <div class="summary-item"><strong>${totalFingerprints.toLocaleString()}</strong> fingerprints</div>
  <div class="summary-item"><strong>${totalFlowCards}</strong> flow cards</div>
  <div class="summary-item"><strong>${sortedCats.length}</strong> active categories</div>
  <div class="summary-item"><strong>${gaps.filter(g => g.severity === 'error').length}</strong> errors</div>
  <div class="summary-item"><strong>${gaps.filter(g => g.severity === 'warning').length}</strong> warnings</div>
</div>

<!-- Treemap -->
<h2>Visual Coverage Treemap</h2>
<div class="treemap">
  ${treemapItems.map(c => `
  <div class="treemap-cell" style="flex:${Math.max(c.ratio * 10, 0.5)};background:${c.color};min-width:${Math.max(c.ratio * 200, 80)}px">
    <div class="treemap-num">${c.drivers.length}</div>
    <div class="treemap-label">${c.label}</div>
    <div class="treemap-fp">${c.totalFingerprints.toLocaleString()} FP</div>
  </div>`).join('')}
</div>

<!-- Category Details Table -->
<h2>Category Breakdown</h2>
<table>
  <thead>
    <tr><th>Category</th><th>Drivers</th><th>Fingerprints</th><th>Flow Cards</th><th>Health</th><th>Coverage</th></tr>
  </thead>
  <tbody>
  ${sortedCats.map(c => `
    <tr>
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:6px;vertical-align:middle"></span>${c.label}</td>
      <td>${c.drivers.length}</td>
      <td>${c.totalFingerprints.toLocaleString()}</td>
      <td>${c.totalFlowCards}</td>
      <td>
        <span class="health-badge ${c.healthScore >= 80 ? 'health-good' : c.healthScore >= 50 ? 'health-mid' : 'health-bad'}">${c.healthScore}%</span>
      </td>
      <td>
        <div class="bar" style="width:150px;display:inline-block;vertical-align:middle">
          <div class="bar-fill" style="width:${(c.drivers.length / maxDrivers * 100)}%;background:${c.color}"></div>
        </div>
      </td>
    </tr>`).join('')}
  </tbody>
</table>

<!-- Coverage Gaps -->
<h2>Coverage Gaps (${gaps.length} found)</h2>
<div class="gap-list">
  ${gaps.length === 0 ? '<p style="color:#3fb950">No gaps found.</p>' :
    gaps.map(g => `
    <div class="gap-item gap-${g.severity === 'error' ? 'err' : g.severity === 'warning' ? 'warn' : 'info'}">
      <span class="tag tag-${g.severity === 'error' ? 'err' : g.severity === 'warning' ? 'warn' : 'info'}">${g.type}</span>
      <span>${g.message}</span>
    </div>`).join('')}
</div>

<!-- Per-Category Driver Lists -->
<h2>Driver Details by Category</h2>
${sortedCats.map(c => `
<div class="category-detail">
  <h3><span style="color:${c.color}">&#9632;</span> ${c.label} (${c.drivers.length} drivers, ${c.totalFingerprints.toLocaleString()} FP)</h3>
  <div>
    ${c.drivers.map(d => `
    <span class="driver-chip ${d.issues.length > 0 ? 'issue' : ''}" title="${d.id}: ${d.fingerprintCount} FP, ${d.flowCardCount} flow cards${d.issues.length > 0 ? ' | ISSUES: ' + d.issues.join(', ') : ''}">
      ${d.id}${d.fingerprintCount > 0 ? ' <span style="color:#3fb950">[' + d.fingerprintCount + ']</span>' : ' <span style="color:#f85149">[0]</span>'}
    </span>`).join('')}
  </div>
</div>`).join('')}

<pre>
=== Coverage Map Summary ===
Total Drivers: ${totalDrivers}
Total Fingerprints: ${totalFingerprints.toLocaleString()}
Active Categories: ${sortedCats.length}/${CATEGORY_RULES.length}
Gaps: ${gaps.filter(g => g.severity === 'error').length} errors, ${gaps.filter(g => g.severity === 'warning').length} warnings
Generated: ${timestamp}
</pre>

</body>
</html>`;
}

function generateTextReport(categories, drivers, gaps) {
  const sortedCats = Object.values(categories)
    .filter(c => c.drivers.length > 0)
    .sort((a, b) => b.drivers.length - a.drivers.length);

  const lines = [];
  lines.push('=== Coverage Map Report ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Drivers: ${drivers.length}`);
  lines.push(`Total Fingerprints: ${drivers.reduce((s, d) => s + d.fingerprintCount, 0).toLocaleString()}`);
  lines.push('');

  for (const cat of sortedCats) {
    lines.push(`[${cat.label}] ${cat.drivers.length} drivers | ${cat.totalFingerprints.toLocaleString()} FP | Health: ${cat.healthScore}%`);
    for (const d of cat.drivers) {
      const issues = d.issues.length > 0 ? ` ISSUES: ${d.issues.join(', ')}` : '';
      lines.push(`  - ${d.id}: ${d.fingerprintCount} FP, ${d.flowCardCount} FC${issues}`);
    }
    lines.push('');
  }

  if (gaps.length > 0) {
    lines.push(`--- Gaps (${gaps.length}) ---`);
    for (const g of gaps) {
      lines.push(`  [${g.severity.toUpperCase()}] ${g.message}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[COVERAGE-MAP] Collecting driver data...');

  const args = process.argv.slice(2);
  let htmlOutput = path.join(ROOT, 'scripts', 'cartography', 'coverage-output.html');
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) htmlOutput = args[++i];
    if (args[i] === '--json') jsonOutput = true;
  }

  const drivers = collectAllDrivers();
  console.log(`[COVERAGE-MAP] Found ${drivers.length} drivers`);

  const categories = analyzeCoverageByCategory(drivers);
  const gaps = findGaps(categories);

  console.log(`[COVERAGE-MAP] Found ${gaps.length} coverage gaps`);

  if (jsonOutput) {
    const jsonPath = htmlOutput.replace(/\.html$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ categories, gaps, drivers }, null, 2), 'utf8');
    console.log(`[COVERAGE-MAP] JSON output: ${jsonPath}`);
  } else {
    const html = generateHTML(categories, drivers, gaps);
    fs.writeFileSync(htmlOutput, html, 'utf8');
    console.log(`[COVERAGE-MAP] HTML output: ${htmlOutput}`);
  }

  // Always output text summary
  const textReport = generateTextReport(categories, drivers, gaps);
  const textPath = htmlOutput.replace(/\.html$/, '.txt');
  fs.writeFileSync(textPath, textReport, 'utf8');
  console.log(`[COVERAGE-MAP] Text output: ${textPath}`);

  // Summary
  const sortedCats = Object.values(categories).filter(c => c.drivers.length > 0);
  console.log(`[COVERAGE-MAP] Summary:`);
  console.log(`  Active categories: ${sortedCats.length}`);
  console.log(`  Errors: ${gaps.filter(g => g.severity === 'error').length}`);
  console.log(`  Warnings: ${gaps.filter(g => g.severity === 'warning').length}`);
}

main();
