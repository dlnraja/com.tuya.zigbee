#!/usr/bin/env node
/**
 * performance-monitor.js - Performance Monitor Cartography
 *
 * Tracks validation times, bundle size, fingerprint count, code metrics,
 * and generates a performance report over time (appends to a JSON history
 * file each run).
 *
 * Usage: node scripts/cartography/performance-monitor.js [--output path] [--history path]
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

function measureTime(fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
  return { result, elapsedMs: Math.round(elapsed * 100) / 100 };
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

function getFileCount(dir, ext = '.js') {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      count += getFileCount(full, ext);
    } else if (entry.name.endsWith(ext)) {
      count++;
    }
  }
  return count;
}

function getLineCount(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
  } catch { return 0; }
}

function getGitCommitCount() {
  try {
    return parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim(), 10);
  } catch { return 0; }
}

function getGitLastCommitDate() {
  try {
    return execSync('git log -1 --format=%ai', { encoding: 'utf8' }).trim();
  } catch { return ''; }
}

// ---------------------------------------------------------------------------
// Metric Collectors
// ---------------------------------------------------------------------------

function collectBundleMetrics() {
  const metrics = {};

  // app.json size
  const appJsonPath = path.join(ROOT, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const stat = fs.statSync(appJsonPath);
    metrics.appJsonSizeKB = Math.round(stat.size / 1024 * 100) / 100;

    const data = safeJsonParse(fs.readFileSync(appJsonPath, 'utf8'));
    if (data) {
      metrics.appVersion = data.version;
      metrics.appSdk = data.sdk;
      metrics.appCompatibility = data.compatibility;
    }
  }

  // .homeycompose directory size
  const composeDir = path.join(ROOT, '.homeycompose');
  if (fs.existsSync(composeDir)) {
    metrics.composeSizeMB = Math.round(getDirSize(composeDir) / (1024 * 1024) * 100) / 100;
  }

  // node_modules size
  const nmDir = path.join(ROOT, 'node_modules');
  if (fs.existsSync(nmDir)) {
    metrics.nodeModulesSizeMB = Math.round(getDirSize(nmDir) / (1024 * 1024) * 100) / 100;
  }

  // Data directory
  const dataDir = path.join(DATA_DIR);
  if (fs.existsSync(dataDir)) {
    metrics.dataDirSizeMB = Math.round(getDirSize(dataDir) / (1024 * 1024) * 100) / 100;
  }

  // Total project size (excluding node_modules and .git)
  const { elapsedMs: sizeTime, result: totalSize } = measureTime(() => {
    let total = 0;
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.homeycompose') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else { try { total += fs.statSync(full).size; } catch {} }
      }
    }
    walk(ROOT);
    return total;
  });

  metrics.totalProjectSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
  metrics.sizeScanTimeMs = sizeTime;

  return metrics;
}

function collectCodeMetrics() {
  const metrics = {};

  // JS file count and line counts
  const { elapsedMs: scanTime, result: scanResult } = measureTime(() => {
    let jsFiles = 0;
    let totalLines = 0;
    let libLines = 0;
    let libFiles = 0;
    let driverLines = 0;
    let driverFiles = 0;
    let largestFile = { path: '', lines: 0 };

    function walk(dir, category) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.homeycompose') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, category);
        } else if (entry.name.endsWith('.js')) {
          const lines = getLineCount(full);
          jsFiles++;
          totalLines += lines;
          if (category === 'lib') { libFiles++; libLines += lines; }
          if (category === 'drivers') { driverFiles++; driverLines += lines; }
          if (lines > largestFile.lines) {
            largestFile = { path: path.relative(ROOT, full).replace(/\\/g, '/'), lines };
          }
        }
      }
    }

    walk(LIB_DIR, 'lib');
    walk(DRIVERS_DIR, 'drivers');
    walk(path.join(ROOT, 'scripts'), 'scripts');

    return { jsFiles, totalLines, libLines, libFiles, driverLines, driverFiles, largestFile };
  });

  metrics.jsFiles = scanResult.jsFiles;
  metrics.totalLines = scanResult.totalLines;
  metrics.libLines = scanResult.libLines;
  metrics.libFiles = scanResult.libFiles;
  metrics.driverLines = scanResult.driverLines;
  metrics.driverFiles = scanResult.driverFiles;
  metrics.largestFile = scanResult.largestFile;
  metrics.scanTimeMs = scanTime;

  return metrics;
}

function collectFingerprintMetrics() {
  const metrics = { count: 0, loaded: false, sizeMB: 0 };

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
        metrics.count = Object.keys(data).length;
        metrics.loaded = true;
      } catch { /* OOM or parse error */ }
      break;
    }
  }

  return metrics;
}

function collectDriverMetrics() {
  if (!fs.existsSync(DRIVERS_DIR)) return { total: 0 };

  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  const metrics = {
    total: dirs.length,
    withDeviceJs: 0,
    withFlowCompose: 0,
    avgDeviceLines: 0,
    totalDeviceLines: 0
  };

  for (const d of dirs) {
    const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
    if (fs.existsSync(devicePath)) {
      metrics.withDeviceJs++;
      const lines = getLineCount(devicePath);
      metrics.totalDeviceLines += lines;
    }
    if (fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.flow.compose.json'))) {
      metrics.withFlowCompose++;
    }
  }

  metrics.avgDeviceLines = metrics.withDeviceJs > 0
    ? Math.round(metrics.totalDeviceLines / metrics.withDeviceJs)
    : 0;

  return metrics;
}

function collectValidationMetrics() {
  const metrics = {};

  // Attempt a quick syntax check on a few files to measure validation speed
  const testFiles = [
    path.join(ROOT, 'app.js'),
    path.join(LIB_DIR, 'tuya', 'TuyaZigbeeDevice.js'),
    path.join(LIB_DIR, 'devices', 'BaseHybridDevice.js')
  ].filter(f => fs.existsSync(f));

  let syntaxErrors = 0;
  const { elapsedMs: syntaxTime } = measureTime(() => {
    for (const f of testFiles) {
      try {
        execSync(`node --check "${f}"`, { encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
      } catch {
        syntaxErrors++;
      }
    }
  });

  metrics.syntaxCheckTimeMs = syntaxTime;
  metrics.syntaxErrors = syntaxErrors;
  metrics.filesChecked = testFiles.length;

  // Check if test suite exists and count test files
  const testDir = path.join(ROOT, 'test');
  if (fs.existsSync(testDir)) {
    metrics.testFileCount = getFileCount(testDir, '.js');
  }

  // Check package.json scripts count
  const pkgPath = path.join(ROOT, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = safeJsonParse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg && pkg.scripts) {
      metrics.npmScriptCount = Object.keys(pkg.scripts).length;
    }
  }

  return metrics;
}

function collectHistory(historyPath) {
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch { return []; }
  }
  return [];
}

function saveHistory(historyPath, entry) {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateHTML(current, history) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const recentHistory = history.slice(-30); // last 30 runs

  // Generate sparkline data for key metrics
  function sparklineData(key) {
    return recentHistory.map(h => h[key] || 0);
  }

  function trendArrow(values) {
    if (values.length < 2) return '';
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (last > prev) return `<span style="color:#f85149">&#9650; +${(last - prev).toLocaleString()}</span>`;
    if (last < prev) return `<span style="color:#3fb950">&#9660; ${(last - prev).toLocaleString()}</span>`;
    return '<span style="color:#8b949e">&#9644; stable</span>';
  }

  const fpTrend = sparklineData('fingerprintCount');
  const locTrend = sparklineData('totalLines');
  const driverTrend = sparklineData('driverCount');
  const sizeTrend = sparklineData('appJsonSizeKB');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Universal Tuya Zigbee - Performance Monitor</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: #0a0e17; color: #c9d1d9; padding: 20px; line-height: 1.6;
  }
  h1 { color: #d29922; margin-bottom: 5px; }
  h2 { color: #79c0ff; margin: 24px 0 12px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }
  .subtitle { color: #8b949e; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 16px 0; }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 16px;
  }
  .card-title { color: #58a6ff; font-weight: 600; margin-bottom: 8px; font-size: 0.95em; }
  .metric { font-size: 2em; font-weight: 700; color: #f0f6fc; }
  .metric-sm { font-size: 1.2em; font-weight: 600; color: #f0f6fc; }
  .metric-label { font-size: 0.85em; color: #8b949e; }
  .trend { font-size: 0.85em; margin-top: 4px; }
  .bar { height: 14px; background: #21262d; border-radius: 3px; overflow: hidden; margin: 4px 0; }
  .bar-fill { height: 100%; border-radius: 3px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #21262d; font-size: 0.88em; }
  th { color: #79c0ff; }
  .gauge { text-align: center; padding: 16px; }
  .gauge-ring {
    width: 100px; height: 100px; border-radius: 50%;
    border: 8px solid #21262d; display: inline-block;
    position: relative; line-height: 100px; text-align: center;
  }
  .gauge-ring.good { border-color: #238636; }
  .gauge-ring.warn { border-color: #9e6a03; }
  .gauge-ring.bad { border-color: #da3633; }
  .gauge-value { font-size: 1.6em; font-weight: 700; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; }
  .tag-pass { background: #238636; color: #fff; }
  .tag-fail { background: #da3633; color: #fff; }
  .sparkline { display: flex; align-items: flex-end; gap: 1px; height: 40px; margin: 8px 0; }
  .spark-bar { flex: 1; background: #58a6ff; border-radius: 1px; min-width: 3px; }
  .section { margin-bottom: 30px; }
  pre { background: #161b22; padding: 12px; border-radius: 6px; border: 1px solid #30363d; font-size: 0.85em; overflow-x: auto; }
</style>
</head>
<body>

<h1>Performance Monitor</h1>
<p class="subtitle">Universal Tuya Zigbee - Performance Metrics & Trends | ${timestamp}</p>

<!-- Key Metrics -->
<div class="section">
  <h2>Key Metrics</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">App Version</div>
      <div class="metric-sm">${current.bundle.appVersion || 'N/A'}</div>
      <div class="metric-label">SDK ${current.bundle.appSdk || '?'} | Compat ${current.bundle.appCompatibility || '?'}</div>
    </div>
    <div class="card">
      <div class="card-title">app.json Size</div>
      <div class="metric">${current.bundle.appJsonSizeKB || 0} KB</div>
      <div class="trend">${trendArrow(sizeTrend)}</div>
    </div>
    <div class="card">
      <div class="card-title">Total Project Size</div>
      <div class="metric">${current.bundle.totalProjectSizeMB || 0} MB</div>
      <div class="metric-label">excluding node_modules and .git</div>
    </div>
    <div class="card">
      <div class="card-title">Fingerprints</div>
      <div class="metric">${(current.fingerprints.count || 0).toLocaleString()}</div>
      <div class="metric-label">${current.fingerprints.sizeMB || 0} MB database</div>
      <div class="trend">${trendArrow(fpTrend)}</div>
    </div>
  </div>
</div>

<!-- Code Metrics -->
<div class="section">
  <h2>Code Metrics</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Lines of Code</div>
      <div class="metric">${(current.code.totalLines || 0).toLocaleString()}</div>
      <div class="trend">${trendArrow(locTrend)}</div>
    </div>
    <div class="card">
      <div class="card-title">JavaScript Files</div>
      <div class="metric">${current.code.jsFiles || 0}</div>
      <div class="metric-label">lib: ${current.code.libFiles || 0} | drivers: ${current.code.driverFiles || 0}</div>
    </div>
    <div class="card">
      <div class="card-title">Drivers</div>
      <div class="metric">${current.drivers.total || 0}</div>
      <div class="metric-label">with device.js: ${current.drivers.withDeviceJs || 0} | with flows: ${current.drivers.withFlowCompose || 0}</div>
      <div class="trend">${trendArrow(driverTrend)}</div>
    </div>
    <div class="card">
      <div class="card-title">Largest File</div>
      <div class="metric-sm" style="font-family:monospace;font-size:1em;word-break:break-all">${current.code.largestFile ? current.code.largestFile.path : 'N/A'}</div>
      <div class="metric-label">${current.code.largestFile ? current.code.largestFile.lines.toLocaleString() + ' lines' : ''}</div>
    </div>
  </div>
</div>

<!-- Code Distribution -->
<div class="section">
  <h2>Code Distribution</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">By Module</div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>lib/</span><span>${(current.code.libLines || 0).toLocaleString()} lines (${current.code.libFiles || 0} files)</span></div>
        <div class="bar"><div class="bar-fill" style="width:${current.code.totalLines > 0 ? (current.code.libLines / current.code.totalLines * 100) : 0}%;background:#58a6ff"></div></div>
      </div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>drivers/</span><span>${(current.code.driverLines || 0).toLocaleString()} lines (${current.code.driverFiles || 0} files)</span></div>
        <div class="bar"><div class="bar-fill" style="width:${current.code.totalLines > 0 ? (current.code.driverLines / current.code.totalLines * 100) : 0}%;background:#3fb950"></div></div>
      </div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>scripts/</span><span>${((current.code.totalLines || 0) - (current.code.libLines || 0) - (current.code.driverLines || 0)).toLocaleString()} lines</span></div>
        <div class="bar"><div class="bar-fill" style="width:${current.code.totalLines > 0 ? ((current.code.totalLines - current.code.libLines - current.code.driverLines) / current.code.totalLines * 100) : 0}%;background:#d29922"></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Size Breakdown</div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>app.json</span><span>${current.bundle.appJsonSizeKB || 0} KB</span></div>
        <div class="bar"><div class="bar-fill" style="width:${current.bundle.totalProjectSizeMB > 0 ? ((current.bundle.appJsonSizeKB || 0) / 1024 / current.bundle.totalProjectSizeMB * 100) : 0}%;background:#58a6ff"></div></div>
      </div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>.homeycompose/</span><span>${current.bundle.composeSizeMB || 0} MB</span></div>
        <div class="bar"><div class="bar-fill" style="width:${current.bundle.totalProjectSizeMB > 0 ? ((current.bundle.composeSizeMB || 0) / current.bundle.totalProjectSizeMB * 100) : 0}%;background:#3fb950"></div></div>
      </div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>data/</span><span>${current.bundle.dataDirSizeMB || 0} MB</span></div>
        <div class="bar"><div class="bar-fill" style="width:${current.bundle.totalProjectSizeMB > 0 ? ((current.bundle.dataDirSizeMB || 0) / current.bundle.totalProjectSizeMB * 100) : 0}%;background:#d29922"></div></div>
      </div>
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>node_modules/</span><span>${current.bundle.nodeModulesSizeMB || 0} MB</span></div>
      </div>
    </div>
  </div>
</div>

<!-- Validation -->
<div class="section">
  <h2>Validation Performance</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Syntax Check</div>
      <div class="gauge">
        <div class="gauge-ring ${current.validation.syntaxErrors === 0 ? 'good' : 'bad'}">
          <div class="gauge-value">${current.validation.syntaxErrors === 0 ? 'PASS' : current.validation.syntaxErrors}</div>
        </div>
      </div>
      <div class="metric-label" style="text-align:center">${current.validation.filesChecked || 0} files checked in ${(current.validation.syntaxCheckTimeMs || 0).toFixed(0)}ms</div>
    </div>
    <div class="card">
      <div class="card-title">Tooling</div>
      <div style="padding:10px 0">
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d">
          <span>NPM Scripts</span><span>${current.validation.npmScriptCount || 0}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d">
          <span>Test Files</span><span>${current.validation.testFileCount || 0}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d">
          <span>Syntax Scan Time</span><span>${(current.validation.syntaxCheckTimeMs || 0).toFixed(0)}ms</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0">
          <span>Code Scan Time</span><span>${(current.code.scanTimeMs || 0).toFixed(0)}ms</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- History -->
${recentHistory.length > 1 ? `
<div class="section">
  <h2>Trend History (Last ${recentHistory.length} Runs)</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Version</th><th>Drivers</th><th>Fingerprints</th><th>LOC</th><th>app.json (KB)</th><th>Syntax</th></tr>
    </thead>
    <tbody>
    ${recentHistory.slice().reverse().map(h => `
      <tr>
        <td style="font-family:monospace;color:#8b949e">${h.timestamp ? h.timestamp.slice(0, 16) : 'N/A'}</td>
        <td>${h.appVersion || '?'}</td>
        <td>${(h.driverCount || 0)}</td>
        <td>${(h.fingerprintCount || 0).toLocaleString()}</td>
        <td>${(h.totalLines || 0).toLocaleString()}</td>
        <td>${(h.appJsonSizeKB || 0)}</td>
        <td>${h.syntaxErrors === 0 ? '<span class="tag tag-pass">PASS</span>' : '<span class="tag tag-fail">FAIL</span>'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<pre>
=== Performance Monitor Summary ===
App Version: ${current.bundle.appVersion || 'N/A'}
Drivers: ${current.drivers.total || 0}
Fingerprints: ${(current.fingerprints.count || 0).toLocaleString()}
Lines of Code: ${(current.code.totalLines || 0).toLocaleString()}
app.json: ${current.bundle.appJsonSizeKB || 0} KB
Total Size: ${current.bundle.totalProjectSizeMB || 0} MB
Syntax: ${current.validation.syntaxErrors === 0 ? 'PASS' : 'FAIL (' + current.validation.syntaxErrors + ' errors)'}
Scan Time: ${(current.code.scanTimeMs || 0).toFixed(0)}ms
Generated: ${timestamp}
</pre>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[PERF-MONITOR] Collecting performance metrics...');

  const args = process.argv.slice(2);
  let htmlOutput = path.join(ROOT, 'scripts', 'cartography', 'performance-output.html');
  let historyPath = path.join(ROOT, 'scripts', 'cartography', 'performance-history.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) htmlOutput = args[++i];
    if (args[i] === '--history' && args[i + 1]) historyPath = args[++i];
  }

  // Collect all metrics
  console.log('[PERF-MONITOR] Measuring bundle...');
  const bundleMetrics = collectBundleMetrics();

  console.log('[PERF-MONITOR] Scanning code...');
  const codeMetrics = collectCodeMetrics();

  console.log('[PERF-MONITOR] Loading fingerprints...');
  const fingerprintMetrics = collectFingerprintMetrics();

  console.log('[PERF-MONITOR] Scanning drivers...');
  const driverMetrics = collectDriverMetrics();

  console.log('[PERF-MONITOR] Running validation...');
  const validationMetrics = collectValidationMetrics();

  // Build current snapshot
  const current = {
    timestamp: new Date().toISOString(),
    bundle: bundleMetrics,
    code: codeMetrics,
    fingerprints: fingerprintMetrics,
    drivers: driverMetrics,
    validation: validationMetrics
  };

  // Append to history
  console.log('[PERF-MONITOR] Updating history...');
  const history = collectHistory(historyPath);

  // Create history entry (compact)
  const historyEntry = {
    timestamp: current.timestamp,
    appVersion: current.bundle.appVersion,
    driverCount: current.drivers.total,
    fingerprintCount: current.fingerprints.count,
    totalLines: current.code.totalLines,
    appJsonSizeKB: current.bundle.appJsonSizeKB,
    totalSizeMB: current.bundle.totalProjectSizeMB,
    syntaxErrors: current.validation.syntaxErrors,
    scanTimeMs: current.code.scanTimeMs
  };

  history.push(historyEntry);
  saveHistory(historyPath, history);
  console.log(`[PERF-MONITOR] History saved (${history.length} entries)`);

  // Generate HTML
  console.log('[PERF-MONITOR] Generating HTML...');
  const html = generateHTML(current, history);
  fs.writeFileSync(htmlOutput, html, 'utf8');

  console.log(`[PERF-MONITOR] HTML: ${htmlOutput}`);
  console.log(`[PERF-MONITOR] Summary:`);
  console.log(`  Version: ${current.bundle.appVersion || 'N/A'}`);
  console.log(`  Drivers: ${current.drivers.total}`);
  console.log(`  Fingerprints: ${current.fingerprints.count.toLocaleString()}`);
  console.log(`  LOC: ${current.code.totalLines.toLocaleString()}`);
  console.log(`  app.json: ${current.bundle.appJsonSizeKB} KB`);
  console.log(`  Syntax: ${current.validation.syntaxErrors === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  Scan time: ${current.code.scanTimeMs.toFixed(0)}ms`);
}

main();
