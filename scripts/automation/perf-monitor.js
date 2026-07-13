#!/usr/bin/env node
/**
 * perf-monitor.js - Performance Monitoring and Optimization Advisor
 * Run: node scripts/automation/perf-monitor.js [--json] [--track <script-name>]
 *
 * Tracks:
 * - Script execution times for all automation scripts
 * - Memory usage (heap, RSS) at start and end
 * - Identifies bottlenecks (slowest scripts, largest memory consumers)
 * - Suggests optimizations based on detected patterns
 * - Historical performance data stored in .github/state/perf-history.json
 *
 * Modes:
 * - Default: Profile key project files for size and complexity
 * - --track <script>: Run and time a specific script
 * - --history: Show historical performance trends
 *
 * Exit codes: 0 = clean, 1 = performance issues detected, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const HISTORY_FILE = path.join(STATE_DIR, 'perf-history.json');
const REPORT_FILE = path.join(STATE_DIR, 'perf-report.json');

const JSON_OUTPUT = process.argv.includes('--json');
const TRACK_SCRIPT = getArg('--track');
const SHOW_HISTORY = process.argv.includes('--history');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function log(msg) {
  if (!JSON_OUTPUT) console.log('[PERF] ' + msg);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatMs(ms) {
  if (ms < 1000) return ms.toFixed(0) + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

// ── Memory snapshot ─────────────────────────────────────────────────────────
function memorySnapshot() {
  if (global.gc) global.gc();
  const mem = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    rss: mem.rss,
    external: mem.external,
    timestamp: Date.now(),
  };
}

// ── Analyze file sizes and complexity ───────────────────────────────────────
function analyzeFiles() {
  const files = [];
  const dirsToScan = [
    path.join(ROOT, 'lib', 'tuya'),
    path.join(ROOT, 'lib', 'devices'),
    path.join(ROOT, 'lib', 'utils'),
    path.join(ROOT, 'lib', 'mixins'),
    path.join(ROOT, 'lib', 'managers'),
    path.join(ROOT, 'lib', 'battery'),
  ];

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    walkForAnalysis(dir, files);
  }

  return files.sort((a, b) => b.size - a.size);
}

function walkForAnalysis(dir, files) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch (_) { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walkForAnalysis(full, files);
      } else if (entry.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n').length;
        const functions = (content.match(/\bfunction\b/g) || []).length;
        const classes = (content.match(/\bclass\b/g) || []).length;
        const requires = (content.match(/require\s*\(/g) || []).length;

        files.push({
          path: path.relative(ROOT, full),
          size: stat.size,
          lines,
          functions,
          classes,
          requires,
          complexity: Math.round((functions + classes * 3 + requires) / Math.max(1, lines) * 1000),
        });
      }
    } catch (_) { /* skip */ }
  }
}

// ── Analyze automation scripts ──────────────────────────────────────────────
function analyzeScripts() {
  const scriptsDir = path.join(ROOT, 'scripts', 'automation');
  if (!fs.existsSync(scriptsDir)) return [];

  const scripts = [];
  for (const entry of fs.readdirSync(scriptsDir)) {
    if (!entry.endsWith('.js')) continue;
    const full = path.join(scriptsDir, entry);
    try {
      const stat = fs.statSync(full);
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n').length;
      const requires = (content.match(/require\s*\(/g) || []).length;
      const asyncFns = (content.match(/\basync\b/g) || []).length;

      scripts.push({
        name: entry,
        path: path.relative(ROOT, full),
        size: stat.size,
        lines,
        requires,
        asyncFunctions: asyncFns,
      });
    } catch (_) { /* skip */ }
  }

  return scripts.sort((a, b) => b.lines - a.lines);
}

// ── Profile driver directory sizes ──────────────────────────────────────────
function profileDrivers() {
  const driversDir = path.join(ROOT, 'drivers');
  if (!fs.existsSync(driversDir)) return { totalSize: 0, count: 0, largest: [] };

  const drivers = [];
  let totalSize = 0;

  for (const entry of fs.readdirSync(driversDir)) {
    const dir = path.join(driversDir, entry);
    try {
      const stat = fs.statSync(dir);
      if (!stat.isDirectory()) continue;

      let dirSize = 0;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const fPath = path.join(dir, f);
        try { dirSize += fs.statSync(fPath).size; } catch (_) { /* skip */ }
      }

      drivers.push({ name: entry, size: dirSize, fileCount: files.length });
      totalSize += dirSize;
    } catch (_) { /* skip */ }
  }

  return {
    totalSize,
    count: drivers.length,
    averageSize: drivers.length > 0 ? Math.round(totalSize / drivers.length) : 0,
    largest: drivers.sort((a, b) => b.size - a.size).slice(0, 10),
  };
}

// ── Bundle size analysis ───────────────────────────────────────────────────
function analyzeBundleSize() {
  const appJsonPath = path.join(ROOT, 'app.json');
  const result = { appJsonSize: 0, totalProjectSize: 0, libSize: 0, driversSize: 0, scriptsSize: 0 };

  if (fs.existsSync(appJsonPath)) {
    result.appJsonSize = fs.statSync(appJsonPath).size;
  }

  // Estimate lib size
  const libDir = path.join(ROOT, 'lib');
  if (fs.existsSync(libDir)) {
    result.libSize = dirSize(libDir);
  }

  const driversDir = path.join(ROOT, 'drivers');
  if (fs.existsSync(driversDir)) {
    result.driversSize = dirSize(driversDir);
  }

  const scriptsDir = path.join(ROOT, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    result.scriptsSize = dirSize(scriptsDir);
  }

  result.totalProjectSize = result.libSize + result.driversSize + result.scriptsSize;

  // Check Homey 7MB limit
  result.appJsonLimitMB = 7;
  result.projectSizeMB = parseFloat((result.totalProjectSize / 1048576).toFixed(2));
  result.nearLimit = result.projectSizeMB > 6;

  return result;
}

function dirSize(dir) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          total += dirSize(full);
        } else {
          total += stat.size;
        }
      } catch (_) { /* skip */ }
    }
  } catch (_) { /* skip */ }
  return total;
}

// ── Track a specific script's execution ─────────────────────────────────────
function trackScript(scriptPath) {
  log(`Tracking execution of: ${scriptPath}`);

  const memBefore = memorySnapshot();
  const start = Date.now();

  try {
    const output = execSync(`node "${scriptPath}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const elapsed = Date.now() - start;
    const memAfter = memorySnapshot();

    return {
      script: scriptPath,
      success: true,
      elapsed,
      memoryDelta: {
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        rss: memAfter.rss - memBefore.rss,
      },
      outputLines: output.split('\n').length,
    };
  } catch (e) {
    const elapsed = Date.now() - start;
    return {
      script: scriptPath,
      success: false,
      elapsed,
      error: e.message.split('\n')[0],
    };
  }
}

// ── Generate optimization suggestions ───────────────────────────────────────
function generateSuggestions(largeFiles, bundleInfo, driverProfile) {
  const suggestions = [];

  // Large file suggestions
  const OVERSIZE_THRESHOLD = 100 * 1024; // 100KB
  const oversize = largeFiles.filter(f => f.size > OVERSIZE_THRESHOLD);
  if (oversize.length > 0) {
    suggestions.push({
      priority: 'high',
      category: 'file-size',
      message: `${oversize.length} file(s) exceed 100KB - consider splitting`,
      files: oversize.map(f => `${f.path} (${formatBytes(f.size)})`),
    });
  }

  // High complexity files
  const COMPLEX_THRESHOLD = 50;
  const complexFiles = largeFiles.filter(f => f.complexity > COMPLEX_THRESHOLD);
  if (complexFiles.length > 0) {
    suggestions.push({
      priority: 'medium',
      category: 'complexity',
      message: `${complexFiles.length} file(s) have high complexity ratio`,
      files: complexFiles.slice(0, 5).map(f => `${f.path} (score: ${f.complexity})`),
    });
  }

  // Bundle size check
  if (bundleInfo.nearLimit) {
    suggestions.push({
      priority: 'critical',
      category: 'bundle-size',
      message: `Project size (${bundleInfo.projectSizeMB}MB) is approaching 7MB Homey limit`,
    });
  }

  // Large drivers
  const LARGE_DRIVER_THRESHOLD = 50 * 1024;
  const largeDrivers = driverProfile.largest.filter(d => d.size > LARGE_DRIVER_THRESHOLD);
  if (largeDrivers.length > 0) {
    suggestions.push({
      priority: 'medium',
      category: 'driver-size',
      message: `${largeDrivers.length} driver(s) exceed 50KB`,
      files: largeDrivers.map(d => `${d.name} (${formatBytes(d.size)})`),
    });
  }

  return suggestions;
}

// ── Show historical performance ─────────────────────────────────────────────
function showHistory() {
  let history = [];
  try { history = JSON.parse(fs.readFileSync(HISTORY_FILE)); } catch (_) { /* empty */ }

  if (history.length === 0) {
    log('No historical performance data found.');
    return;
  }

  log('=== Performance History ===');
  const recent = history.slice(-20);
  for (const entry of recent) {
    const date = new Date(entry.timestamp).toLocaleString();
    const mem = formatBytes(entry.memory.heapUsed);
    log(`  ${date} | heap: ${mem} | files: ${entry.stats.filesAnalyzed}`);
  }

  // Trend analysis
  if (history.length >= 3) {
    const recentHeap = history.slice(-5).map(h => h.memory.heapUsed);
    const avgHeap = recentHeap.reduce((a, b) => a + b, 0) / recentHeap.length;
    const trend = recentHeap[recentHeap.length - 1] - recentHeap[0];
    log('');
    log(`Average heap (last 5): ${formatBytes(avgHeap)}`);
    log(`Heap trend: ${trend > 0 ? '+' : ''}${formatBytes(trend)}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const memStart = memorySnapshot();
  log('Starting performance analysis...');

  ensureDir(STATE_DIR);

  // Track specific script if requested
  if (TRACK_SCRIPT) {
    const scriptPath = path.resolve(ROOT, TRACK_SCRIPT);
    if (!fs.existsSync(scriptPath)) {
      log(`ERROR: Script not found: ${TRACK_SCRIPT}`);
      process.exit(2);
    }
    const result = trackScript(scriptPath);
    if (JSON_OUTPUT) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      log(`Script: ${result.script}`);
      log(`Success: ${result.success}`);
      log(`Elapsed: ${formatMs(result.elapsed)}`);
      log(`Memory delta heap: ${formatBytes(result.memoryDelta.heapUsed)}`);
      log(`Memory delta RSS: ${formatBytes(result.memoryDelta.rss)}`);
      if (!result.success) log(`Error: ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
  }

  // Show history mode
  if (SHOW_HISTORY) {
    showHistory();
    process.exit(0);
  }

  // Full performance profile
  const largeFiles = analyzeFiles();
  const scripts = analyzeScripts();
  const driverProfile = profileDrivers();
  const bundleInfo = analyzeBundleSize();
  const suggestions = generateSuggestions(largeFiles, bundleInfo, driverProfile);

  const memEnd = memorySnapshot();
  const memDelta = memEnd.heapUsed - memStart.heapUsed;

  const report = {
    timestamp: new Date().toISOString(),
    memory: {
      start: memStart.heapUsed,
      end: memEnd.heapUsed,
      delta: memDelta,
      rss: memEnd.rss,
    },
    stats: {
      filesAnalyzed: largeFiles.length,
      scriptsAnalyzed: scripts.length,
      driversProfiled: driverProfile.count,
    },
    bundle: bundleInfo,
    largeFiles: largeFiles.slice(0, 15).map(f => ({
      path: f.path,
      size: formatBytes(f.size),
      lines: f.lines,
      complexity: f.complexity,
    })),
    topScripts: scripts.slice(0, 15).map(s => ({
      name: s.name,
      lines: s.lines,
      size: formatBytes(s.size),
      requires: s.requires,
    })),
    driverProfile: {
      totalSize: formatBytes(driverProfile.totalSize),
      count: driverProfile.count,
      averageSize: formatBytes(driverProfile.averageSize),
      largest: driverProfile.largest.map(d => ({ name: d.name, size: formatBytes(d.size) })),
    },
    suggestions,
  };

  // Save to history
  let history = [];
  try { history = JSON.parse(fs.readFileSync(HISTORY_FILE)); } catch (_) { /* empty */ }
  history.push({
    timestamp: report.timestamp,
    memory: report.memory,
    stats: report.stats,
    bundle: report.bundle,
  });
  // Keep last 100 entries
  if (history.length > 100) history = history.slice(-100);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log('');
    log('=== Performance Report ===');
    log('');
    log('--- Memory ---');
    log(`  Start heap: ${formatBytes(memStart.heapUsed)}`);
    log(`  End heap: ${formatBytes(memEnd.heapUsed)}`);
    log(`  RSS: ${formatBytes(memEnd.rss)}`);
    log('');
    log('--- Bundle ---');
    log(`  Total project: ${bundleInfo.projectSizeMB} MB`);
    log(`  Lib: ${formatBytes(bundleInfo.libSize)}`);
    log(`  Drivers: ${formatBytes(bundleInfo.driversSize)}`);
    log(`  Scripts: ${formatBytes(bundleInfo.scriptsSize)}`);
    if (bundleInfo.nearLimit) log(`  WARNING: Approaching 7MB Homey limit!`);
    log('');
    log('--- Largest Files ---');
    for (const f of report.largeFiles.slice(0, 10)) {
      log(`  ${f.size} (${f.lines} lines) ${f.path}`);
    }
    log('');
    log('--- Driver Fleet ---');
    log(`  ${driverProfile.count} drivers, ${formatBytes(driverProfile.totalSize)} total`);
    log(`  Average: ${formatBytes(driverProfile.averageSize)}`);
    if (report.driverProfile.largest.length > 0) {
      log('  Largest:');
      for (const d of report.driverProfile.largest.slice(0, 5)) {
        log(`    ${d.name}: ${d.size}`);
      }
    }
    log('');
    log('--- Optimization Suggestions ---');
    if (suggestions.length === 0) {
      log('  No issues detected.');
    } else {
      for (const s of suggestions) {
        log(`  [${s.priority.toUpperCase()}] ${s.category}: ${s.message}`);
        if (s.files) {
          for (const f of s.files.slice(0, 5)) log(`    - ${f}`);
        }
      }
    }
  }

  // Save report
  ensureDir(path.dirname(REPORT_FILE));
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  process.exit(suggestions.some(s => s.priority === 'critical') ? 1 : 0);
}

main();
