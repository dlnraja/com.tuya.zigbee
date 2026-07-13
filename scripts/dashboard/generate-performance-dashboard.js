#!/usr/bin/env node
/**
 * generate-performance-dashboard.js - Performance Dashboard Generator
 *
 * Improved version of scripts/cartography/performance-monitor.js.
 * Tracks validation times, bundle size, fingerprint count, code metrics,
 * and generates a performance report with trend history.
 *
 * Usage:
 *   node scripts/dashboard/generate-performance-dashboard.js [--output path] [--json] [--history path]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { collectAll, ROOT, DRIVERS_DIR, LIB_DIR, DATA_DIR, getDirSize, getFileCount, safeReadFile, safeJsonParse } = require('./shared-collector');
const T = require('./html-templates');

// ---------------------------------------------------------------------------
// Metric Collectors
// ---------------------------------------------------------------------------

function collectBundleMetrics() {
  const metrics = {};

  const appJsonPath = path.join(ROOT, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const stat = fs.statSync(appJsonPath);
    metrics.appJsonSizeKB = Math.round(stat.size / 1024 * 100) / 100;
    const data = safeJsonParse(safeReadFile(appJsonPath));
    if (data) {
      metrics.appVersion = data.version;
      metrics.appSdk = data.sdk;
      metrics.appCompatibility = data.compatibility;
    }
  }

  const composeDir = path.join(ROOT, '.homeycompose');
  if (fs.existsSync(composeDir)) {
    metrics.composeSizeMB = Math.round(getDirSize(composeDir) / (1024 * 1024) * 100) / 100;
  }

  const nmDir = path.join(ROOT, 'node_modules');
  if (fs.existsSync(nmDir)) {
    metrics.nodeModulesSizeMB = Math.round(getDirSize(nmDir) / (1024 * 1024) * 100) / 100;
  }

  if (fs.existsSync(DATA_DIR)) {
    metrics.dataDirSizeMB = Math.round(getDirSize(DATA_DIR) / (1024 * 1024) * 100) / 100;
  }

  // Total project size (excluding node_modules, .git, .homeycompose)
  let totalSize = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', '.homeycompose'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else { try { totalSize += fs.statSync(full).size; } catch {} }
    }
  }
  walk(ROOT);
  metrics.totalProjectSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;

  return metrics;
}

function collectCodeMetrics() {
  let jsFiles = 0, totalLines = 0, libLines = 0, libFiles = 0, driverLines = 0, driverFiles = 0;
  let largestFile = { path: '', lines: 0 };

  function walk(dir, category) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', '.homeycompose'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, category);
      } else if (entry.name.endsWith('.js')) {
        let lines = 0;
        try { lines = fs.readFileSync(full, 'utf8').split('\n').length; } catch {}
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
}

function collectValidationMetrics() {
  const metrics = {};

  const testFiles = [
    path.join(ROOT, 'app.js'),
    path.join(LIB_DIR, 'tuya', 'TuyaZigbeeDevice.js'),
    path.join(LIB_DIR, 'devices', 'BaseUnifiedDevice.js')
  ].filter(f => fs.existsSync(f));

  let syntaxErrors = 0;
  const start = Date.now();
  for (const f of testFiles) {
    try {
      execSync(`node --check "${f}"`, { encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
    } catch {
      syntaxErrors++;
    }
  }
  metrics.syntaxCheckTimeMs = Date.now() - start;
  metrics.syntaxErrors = syntaxErrors;
  metrics.filesChecked = testFiles.length;

  const testDir = path.join(ROOT, 'test');
  if (fs.existsSync(testDir)) {
    metrics.testFileCount = getFileCount(testDir, '.js');
  }

  const pkgPath = path.join(ROOT, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = safeJsonParse(safeReadFile(pkgPath));
    if (pkg && pkg.scripts) {
      metrics.npmScriptCount = Object.keys(pkg.scripts).length;
    }
  }

  return metrics;
}

function collectHistory(historyPath) {
  if (fs.existsSync(historyPath)) {
    try { return JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch { return []; }
  }
  return [];
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateDashboard(current, history) {
  const timestamp = current.timestamp.replace('T', ' ').slice(0, 19);
  const recentHistory = history.slice(-30);

  function sparklineData(key) {
    return recentHistory.map(h => h[key] || 0);
  }

  const fpTrend = sparklineData('fingerprintCount');
  const locTrend = sparklineData('totalLines');
  const driverTrend = sparklineData('driverCount');
  const sizeTrend = sparklineData('appJsonSizeKB');

  const sections = [];

  // Key metrics
  sections.push(T.section('Key Metrics', `
    <div class="grid">
      ${T.metricCard('App Version', current.bundle.appVersion || 'N/A', `SDK ${current.bundle.appSdk || '?'} | Compat ${current.bundle.appCompatibility || '?'}`)}
      ${T.metricCard('app.json Size', (current.bundle.appJsonSizeKB || 0) + ' KB', '', T.THEME.blue)}
      ${T.metricCard('Total Project Size', (current.bundle.totalProjectSizeMB || 0) + ' MB', 'excluding node_modules and .git')}
      ${T.metricCard('Fingerprints', (current.fingerprints.count || 0).toLocaleString(), `${current.fingerprints.sizeMB || 0} MB database`, T.THEME.green)}
    </div>
  `));

  // Code metrics
  sections.push(T.section('Code Metrics', `
    <div class="grid">
      ${T.metricCard('Lines of Code', (current.code.totalLines || 0).toLocaleString(), '', T.THEME.blue)}
      ${T.metricCard('JavaScript Files', current.code.jsFiles || 0, `lib: ${current.code.libFiles || 0} | drivers: ${current.code.driverFiles || 0}`)}
      ${T.metricCard('Drivers', current.drivers.total || 0, `device.js: ${current.drivers.withDeviceJs || 0} | flows: ${current.drivers.withFlowCompose || 0}`)}
      ${T.metricCardSm('Largest File', current.code.largestFile ? current.code.largestFile.path : 'N/A', current.code.largestFile ? current.code.largestFile.lines.toLocaleString() + ' lines' : '')}
    </div>
  `));

  // Code distribution
  sections.push(T.section('Code Distribution', `
    <div class="grid">
      <div class="card">
        <div class="card-title">By Module</div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>lib/</span><span>${(current.code.libLines || 0).toLocaleString()} lines (${current.code.libFiles || 0} files)</span></div>
          ${T.progressBarLg(current.code.libLines, current.code.totalLines, T.THEME.blue)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>drivers/</span><span>${(current.code.driverLines || 0).toLocaleString()} lines (${current.code.driverFiles || 0} files)</span></div>
          ${T.progressBarLg(current.code.driverLines, current.code.totalLines, T.THEME.green)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>scripts/</span><span>${((current.code.totalLines || 0) - (current.code.libLines || 0) - (current.code.driverLines || 0)).toLocaleString()} lines</span></div>
          ${T.progressBarLg((current.code.totalLines || 0) - (current.code.libLines || 0) - (current.code.driverLines || 0), current.code.totalLines, T.THEME.yellow)}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Size Breakdown</div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>app.json</span><span>${current.bundle.appJsonSizeKB || 0} KB</span></div>
          ${T.progressBarLg((current.bundle.appJsonSizeKB || 0) / 1024, current.bundle.totalProjectSizeMB || 1, T.THEME.blue)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>.homeycompose/</span><span>${current.bundle.composeSizeMB || 0} MB</span></div>
          ${T.progressBarLg(current.bundle.composeSizeMB || 0, current.bundle.totalProjectSizeMB || 1, T.THEME.green)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>data/</span><span>${current.bundle.dataDirSizeMB || 0} MB</span></div>
          ${T.progressBarLg(current.bundle.dataDirSizeMB || 0, current.bundle.totalProjectSizeMB || 1, T.THEME.yellow)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>node_modules/</span><span>${current.bundle.nodeModulesSizeMB || 0} MB</span></div>
        </div>
      </div>
    </div>
  `));

  // Validation
  sections.push(T.section('Validation Performance', `
    <div class="grid">
      <div class="card" style="text-align:center">
        <div class="card-title">Syntax Check</div>
        <div style="display:inline-block;width:100px;height:100px;border-radius:50%;border:8px solid ${current.validation.syntaxErrors === 0 ? T.THEME.greenDark : T.THEME.redDark};line-height:100px;position:relative">
          <span style="font-size:1.6em;font-weight:700;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">${current.validation.syntaxErrors === 0 ? 'PASS' : current.validation.syntaxErrors}</span>
        </div>
        <div class="metric-label" style="margin-top:8px">${current.validation.filesChecked || 0} files checked in ${(current.validation.syntaxCheckTimeMs || 0).toFixed(0)}ms</div>
      </div>
      <div class="card">
        <div class="card-title">Tooling</div>
        <table>
          <tr><td>NPM Scripts</td><td style="text-align:right">${current.validation.npmScriptCount || 0}</td></tr>
          <tr><td>Test Files</td><td style="text-align:right">${current.validation.testFileCount || 0}</td></tr>
          <tr><td>Syntax Scan Time</td><td style="text-align:right">${(current.validation.syntaxCheckTimeMs || 0).toFixed(0)}ms</td></tr>
          <tr><td>Code Scan Time</td><td style="text-align:right">${(current.code.scanTimeMs || 0).toFixed(0)}ms</td></tr>
        </table>
      </div>
    </div>
  `));

  // Trend history
  if (recentHistory.length > 1) {
    sections.push(T.section(`Trend History (Last ${recentHistory.length} Runs)`, `
      <div class="grid">
        <div class="card">
          <div class="card-title">Fingerprints Trend</div>
          ${T.sparkline(fpTrend, T.THEME.green)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(fpTrend)}</div>
        </div>
        <div class="card">
          <div class="card-title">LOC Trend</div>
          ${T.sparkline(locTrend, T.THEME.blue)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(locTrend)}</div>
        </div>
        <div class="card">
          <div class="card-title">Driver Count Trend</div>
          ${T.sparkline(driverTrend, T.THEME.purple)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(driverTrend)}</div>
        </div>
        <div class="card">
          <div class="card-title">app.json Size Trend</div>
          ${T.sparkline(sizeTrend, T.THEME.yellow)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(sizeTrend)}</div>
        </div>
      </div>
      ${T.dataTable(
        ['Date', 'Version', 'Drivers', 'Fingerprints', 'LOC', 'app.json (KB)', 'Syntax'],
        recentHistory.slice().reverse().map(h => [
          `<span style="font-family:monospace;color:${T.THEME.textMuted}">${h.timestamp ? h.timestamp.slice(0, 16) : 'N/A'}</span>`,
          h.appVersion || '?',
          h.driverCount || 0,
          (h.fingerprintCount || 0).toLocaleString(),
          (h.totalLines || 0).toLocaleString(),
          h.appJsonSizeKB || 0,
          h.syntaxErrors === 0 ? '<span class="tag tag-green">PASS</span>' : '<span class="tag tag-red">FAIL</span>'
        ]),
        { maxHeight: 400 }
      )}
    `));
  }

  return T.buildPage({
    title: 'Performance Dashboard',
    subtitle: 'Universal Tuya Zigbee - Performance Metrics & Trends',
    current: 'performance',
    sections,
    timestamp
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[PERF-DASHBOARD] Starting...');

  const args = process.argv.slice(2);
  let outputPath = path.join(ROOT, 'scripts', 'dashboard', 'performance-dashboard.html');
  let historyPath = path.join(ROOT, 'scripts', 'dashboard', 'performance-history.json');
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
    if (args[i] === '--history' && args[i + 1]) historyPath = args[++i];
    if (args[i] === '--json') jsonOutput = true;
  }

  console.log('[PERF-DASHBOARD] Measuring bundle...');
  const bundleMetrics = collectBundleMetrics();

  console.log('[PERF-DASHBOARD] Scanning code...');
  const codeMetrics = collectCodeMetrics();

  console.log('[PERF-DASHBOARD] Collecting shared metrics...');
  const sharedMetrics = collectAll();

  console.log('[PERF-DASHBOARD] Running validation...');
  const validationMetrics = collectValidationMetrics();

  const current = {
    timestamp: new Date().toISOString(),
    bundle: bundleMetrics,
    code: codeMetrics,
    fingerprints: { count: sharedMetrics.fingerprints.totalDB, sizeMB: sharedMetrics.fingerprints.sizeMB, loaded: sharedMetrics.fingerprints.loaded },
    drivers: { total: sharedMetrics.drivers.total, withDeviceJs: sharedMetrics.drivers.withDeviceJs, withFlowCompose: sharedMetrics.drivers.withFlowCompose },
    validation: validationMetrics
  };

  // Update history
  const history = collectHistory(historyPath);
  history.push({
    timestamp: current.timestamp,
    appVersion: current.bundle.appVersion,
    driverCount: current.drivers.total,
    fingerprintCount: current.fingerprints.count,
    totalLines: current.code.totalLines,
    appJsonSizeKB: current.bundle.appJsonSizeKB,
    totalSizeMB: current.bundle.totalProjectSizeMB,
    syntaxErrors: current.validation.syntaxErrors
  });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  console.log(`[PERF-DASHBOARD] History saved (${history.length} entries)`);

  if (jsonOutput) {
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(current, null, 2), 'utf8');
    console.log(`[PERF-DASHBOARD] JSON: ${jsonPath}`);
  }

  console.log('[PERF-DASHBOARD] Generating HTML...');
  const html = generateDashboard(current, history);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[PERF-DASHBOARD] HTML: ${outputPath}`);
  console.log(`[PERF-DASHBOARD] Done.`);
}

main();
