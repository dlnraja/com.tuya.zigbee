#!/usr/bin/env node
/**
 * generate-master-dashboard.js - Master Dashboard Orchestrator
 *
 * Runs all dashboard generators and produces a comprehensive HTML report
 * that aggregates all metrics into a single view with cross-links to
 * individual dashboards.
 *
 * Features:
 * - Single-command full dashboard generation
 * - Aggregated metrics from all sub-dashboards
 * - Trend charts with historical data
 * - Violation history from error tracker
 * - Cross-dashboard navigation
 * - KNOWLEDGE_CACHE.json integration
 * - JSON output option for CI/CD integration
 *
 * Usage:
 *   node scripts/dashboard/generate-master-dashboard.js [--output path] [--json] [--skip-deps]
 *
 * Options:
 *   --output path   Output HTML file path (default: scripts/dashboard/master-dashboard.html)
 *   --json          Also output JSON summary
 *   --skip-deps     Skip dependency analysis (faster)
 *   --history path  Performance history file path
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  collectAll, ROOT, DRIVERS_DIR, LIB_DIR, SCRIPTS_DIR,
  loadKnowledgeCache, getGitLog,
  safeJsonParse, safeReadFile, getDirSize, getFileCount
} = require('./shared-collector');
const T = require('./html-templates');

// ---------------------------------------------------------------------------
// Dashboard Runner
// ---------------------------------------------------------------------------

function runSubDashboard(scriptPath, args = []) {
  const fullPath = path.join(ROOT, 'scripts', 'dashboard', scriptPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`[MASTER] Skipping ${scriptPath} (not found)`);
    return null;
  }
  try {
    console.log(`[MASTER] Running ${scriptPath}...`);
    const result = execSync(`node "${fullPath}" ${args.join(' ')}`, {
      encoding: 'utf8',
      cwd: ROOT,
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`[MASTER] ${scriptPath} completed`);
    return result;
  } catch (err) {
    console.log(`[MASTER] Warning: ${scriptPath} failed: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Enhanced Metrics Collection
// ---------------------------------------------------------------------------

function collectEnhancedMetrics(baseMetrics) {
  const enhanced = { ...baseMetrics };

  // Add workflow metrics detail
  enhanced.workflowStats = {
    byTrigger: enhanced.workflows.byTrigger || {},
    totalSize: enhanced.workflows.workflows.reduce((s, w) => s + w.size, 0)
  };

  // Add script metrics detail
  enhanced.scriptStats = {
    totalSize: 0,
    largestScripts: []
  };

  // Collect GitHub Actions stats
  const workflowsDir = path.join(ROOT, '.github', 'workflows');
  if (fs.existsSync(workflowsDir)) {
    const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    enhanced.workflowStats.files = files.map(f => {
      const fullPath = path.join(workflowsDir, f);
      const stat = fs.statSync(fullPath);
      return { name: f, size: stat.size };
    }).sort((a, b) => b.size - a.size);
  }

  // Collect violation history from KNOWLEDGE_CACHE
  const cache = loadKnowledgeCache();
  if (cache) {
    enhanced.knowledgeCacheStats = {
      version: cache.version,
      lastUpdated: cache.lastUpdated,
      rules: (cache.sdk3Rules && cache.sdk3Rules.rules) ? cache.sdk3Rules.rules.length : 0,
      antiPatterns: (cache.sdk3Rules && cache.sdk3Rules.antiPatterns) ? cache.sdk3Rules.antiPatterns.length : 0,
      crashPrevention: (cache.sdk3Rules && cache.sdk3Rules.crashPrevention) ? cache.sdk3Rules.crashPrevention.length : 0
    };
  }

  // Collect .github directory stats
  const githubDir = path.join(ROOT, '.github');
  if (fs.existsSync(githubDir)) {
    enhanced.githubStats = {
      workflowCount: enhanced.workflows.total,
      scriptsCount: getFileCount(path.join(githubDir, 'scripts'), '.js'),
      totalSize: getDirSize(githubDir)
    };
  }

  // Collect data directory breakdown
  const dataDir = path.join(ROOT, 'data');
  if (fs.existsSync(dataDir)) {
    enhanced.dataStats = {
      totalSize: getDirSize(dataDir),
      files: {}
    };
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        try {
          const stat = fs.statSync(path.join(dataDir, entry.name));
          enhanced.dataStats.files[entry.name] = { size: stat.size, sizeMB: Math.round(stat.size / (1024 * 1024) * 100) / 100 };
        } catch {}
      }
    }
  }

  return enhanced;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateMasterDashboard(metrics) {
  const { drivers, fingerprints, flowCards, lib, workflows, scripts, clusters, images, health, appMeta, knowledgeCache } = metrics;
  const timestamp = metrics.timestamp.replace('T', ' ').slice(0, 19);
  const appVersion = appMeta ? appMeta.version : 'unknown';
  const gitLog = getGitLog(20);

  // Load performance history for trends
  const historyPath = path.join(ROOT, 'scripts', 'dashboard', 'performance-history.json');
  let perfHistory = [];
  if (fs.existsSync(historyPath)) {
    try { perfHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}
  }
  const recentPerf = perfHistory.slice(-20);

  const sections = [];

  // === SECTION 1: Executive Summary ===
  sections.push(T.section('Executive Summary', `
    <div class="grid">
      ${T.metricCard('Project Health', health.score + '/100', health.score >= 80 ? 'Healthy' : health.score >= 60 ? 'Needs Attention' : 'Critical', health.score >= 80 ? T.THEME.green : health.score >= 60 ? T.THEME.yellow : T.THEME.red)}
      ${T.metricCard('Total Drivers', drivers.total, `${drivers.protocols.zigbee} Zigbee + ${drivers.protocols.wifi} WiFi`)}
      ${T.metricCard('Fingerprints', fingerprints.totalDB.toLocaleString(), `${fingerprints.uniqueManufacturerNames} unique manufacturers`, T.THEME.green)}
      ${T.metricCard('Flow Cards', flowCards.total, `T: ${flowCards.byType.triggers} | C: ${flowCards.byType.conditions} | A: ${flowCards.byType.actions}`)}
      ${T.metricCard('Lines of Code', lib.totalLines.toLocaleString(), `${lib.totalFiles} library files`, T.THEME.blue)}
      ${T.metricCard('Unique Capabilities', drivers.uniqueCapabilities.length, 'Across all drivers')}
    </div>
    <div style="margin-top:12px">
      ${health.strengths.map(s => `<span class="tag tag-green">${T.escapeHtml(s)}</span>`).join(' ')}
      ${health.warnings.map(w => `<span class="tag tag-yellow">${T.escapeHtml(w)}</span>`).join(' ')}
      ${health.issues.map(i => `<span class="tag tag-red">${T.escapeHtml(i)}</span>`).join(' ')}
    </div>
  `));

  // === SECTION 2: Driver Coverage ===
  const sortedCats = Object.values(drivers.categories)
    .filter(c => c.drivers.length > 0)
    .sort((a, b) => b.drivers.length - a.drivers.length);

  sections.push(T.section('Driver Coverage by Category', `
    <div class="treemap">
      ${sortedCats.map(c => {
        const ratio = c.drivers.length / drivers.total;
        return `
        <div class="treemap-cell" style="flex:${Math.max(ratio * 10, 0.5)};background:${c.color};min-width:${Math.max(ratio * 200, 80)}px">
          <div class="treemap-num">${c.drivers.length}</div>
          <div class="treemap-label">${T.escapeHtml(c.label)}</div>
          <div style="font-size:0.65em;color:rgba(255,255,255,0.6)">${c.totalFingerprints.toLocaleString()} FP</div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:12px">
      <a href="coverage-dashboard.html" style="color:${T.THEME.blue}">View full coverage dashboard &rarr;</a>
    </div>
  `));

  // === SECTION 3: Protocol & File Health ===
  sections.push(T.section('Driver Health', `
    <div class="grid">
      <div class="card">
        <div class="card-title">File Completeness</div>
        ${['device.js', 'driver.js', 'compose.json', 'flow.compose', 'assets/images'].map((f, i) => {
          const counts = [drivers.withDeviceJs, drivers.withDriverJs, drivers.withComposeJson, drivers.withFlowCompose, drivers.withAssets];
          const pcts = counts.map(c => (c / drivers.total * 100).toFixed(1));
          return `<div style="margin:4px 0">
            <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>${f}</span><span>${counts[i]}/${drivers.total} (${pcts[i]}%)</span></div>
            ${T.progressBarLg(counts[i], drivers.total, T.THEME.green)}
          </div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-title">Protocol Distribution</div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>Zigbee</span><span>${drivers.protocols.zigbee} (${(drivers.protocols.zigbee/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.protocols.zigbee, drivers.total, T.THEME.green)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>WiFi</span><span>${drivers.protocols.wifi} (${(drivers.protocols.wifi/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.protocols.wifi, drivers.total, T.THEME.blue)}
        </div>
        <div style="margin-top:12px;font-size:0.85em;color:${T.THEME.textMuted}">
          Image Coverage: ${images.coveragePercent}% (${images.withImages}/${drivers.total})
          ${images.withoutImages > 0 ? ` | <span style="color:${T.THEME.red}">${images.withoutImages} missing</span>` : ''}
        </div>
      </div>
    </div>
    <div style="margin-top:12px">
      <a href="driver-dashboard.html" style="color:${T.THEME.blue}">View full driver dashboard &rarr;</a>
    </div>
  `));

  // === SECTION 4: Cluster & Capability Coverage ===
  sections.push(T.section('Cluster & Capability Coverage', `
    <div class="grid">
      <div class="card">
        <div class="card-title">Top Clusters</div>
        ${clusters.clusters.slice(0, 10).map(c => `
          <div style="margin:3px 0">
            <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>${T.escapeHtml(c.name)}</span><span>${c.count} drivers</span></div>
            ${T.progressBar(c.count, drivers.total, T.THEME.blue)}
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-title">Top Capabilities</div>
        ${(() => {
          const capFreq = {};
          for (const d of drivers.drivers) {
            for (const cap of d.capabilities) {
              const capId = typeof cap === 'string' ? cap : cap.id || JSON.stringify(cap);
              capFreq[capId] = (capFreq[capId] || 0) + 1;
            }
          }
          return Object.entries(capFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cap, count]) => `
            <div style="margin:3px 0">
              <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>${T.escapeHtml(cap)}</span><span>${count} drivers</span></div>
              ${T.progressBar(count, drivers.total, T.THEME.green)}
            </div>
          `).join('');
        })()}
      </div>
    </div>
  `));

  // === SECTION 5: Library Module Hotspots ===
  sections.push(T.section('Library Module Hotspots', `
    <div class="grid">
      ${Object.entries(lib.byDir)
        .sort((a, b) => b[1].lines - a[1].lines)
        .slice(0, 8)
        .map(([dir, data]) => `
      <div class="card">
        <div class="card-title">lib/${T.escapeHtml(dir)}/</div>
        <div class="metric-sm">${data.lines.toLocaleString()} lines</div>
        <div class="metric-label">${data.files} files</div>
        ${T.progressBar(data.lines, lib.totalLines, T.THEME.blue)}
      </div>`).join('')}
    </div>
    <div style="margin-top:12px">
      <a href="dependency-dashboard.html" style="color:${T.THEME.blue}">View full dependency dashboard &rarr;</a>
    </div>
  `));

  // === SECTION 6: Automation & Tooling ===
  sections.push(T.section('Automation & Tooling', `
    <div class="grid">
      ${T.metricCard('GitHub Workflows', workflows.total, Object.entries(workflows.byTrigger).map(([k, v]) => `${k}: ${v}`).join(' | '))}
      ${T.metricCard('Automation Scripts', scripts.total, `${scripts.totalLines.toLocaleString()} total lines`)}
      ${T.metricCard('Flow Cards', flowCards.total, `${drivers.drivers.filter(d => d.flowCardCount > 0).length} drivers with flows`, T.THEME.yellow)}
      ${T.metricCard('Test Files', getFileCount(path.join(ROOT, 'test'), '.js'), 'In test/ directory')}
    </div>
    ${workflows.workflows.length > 0 ? `
    <h3 style="margin-top:16px">Workflow Breakdown</h3>
    <div class="grid-sm">
      ${Object.entries(workflows.byTrigger).map(([trigger, count]) => `
      <div class="card" style="text-align:center">
        <div class="metric-sm">${count}</div>
        <div class="metric-label">${T.escapeHtml(trigger)}</div>
      </div>`).join('')}
    </div>` : ''}
  `));

  // === SECTION 7: Knowledge Cache Status ===
  if (knowledgeCache || metrics.knowledgeCacheStats) {
    const kcs = metrics.knowledgeCacheStats || {};
    sections.push(T.section('Knowledge Cache Status', `
      <div class="grid">
        ${T.metricCard('Cache Version', kcs.version || 'N/A', `Last updated: ${kcs.lastUpdated ? kcs.lastUpdated.slice(0, 10) : 'N/A'}`)}
        ${T.metricCard('SDK3 Rules', kcs.rules || 0, `${kcs.antiPatterns || 0} anti-patterns`)}
        ${T.metricCard('Crash Prevention', kcs.crashPrevention || 0, 'Rules for crash prevention', T.THEME.green)}
      </div>
    `));
  }

  // === SECTION 8: Performance Trends ===
  if (recentPerf.length > 1) {
    const fpTrend = recentPerf.map(h => h.fingerprintCount || 0);
    const locTrend = recentPerf.map(h => h.totalLines || 0);
    const driverTrend = recentPerf.map(h => h.driverCount || 0);

    sections.push(T.section('Performance Trends', `
      <div class="grid">
        <div class="card">
          <div class="card-title">Fingerprints</div>
          ${T.sparkline(fpTrend, T.THEME.green)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(fpTrend)}</div>
        </div>
        <div class="card">
          <div class="card-title">Lines of Code</div>
          ${T.sparkline(locTrend, T.THEME.blue)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(locTrend)}</div>
        </div>
        <div class="card">
          <div class="card-title">Driver Count</div>
          ${T.sparkline(driverTrend, T.THEME.purple)}
          <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.trendArrow(driverTrend)}</div>
        </div>
      </div>
      <div style="margin-top:12px">
        <a href="performance-dashboard.html" style="color:${T.THEME.blue}">View full performance dashboard &rarr;</a>
      </div>
    `));
  }

  // === SECTION 9: Recent Changes ===
  if (gitLog.length > 0) {
    sections.push(T.section(`Recent Changes (Last ${gitLog.length} Commits)`, `
      <div style="max-height:300px;overflow-y:auto">
        ${gitLog.map(commit => `
        <div style="padding:4px 0;border-left:2px solid ${T.THEME.border};padding-left:10px;margin-left:8px">
          <span style="color:${T.THEME.blue};font-family:monospace;font-size:0.85em">${T.escapeHtml(commit.hash)}</span>
          <span style="color:${T.THEME.textMuted};font-size:0.8em;margin-left:6px">${T.escapeHtml(commit.date)}</span>
          <span style="margin-left:6px">${T.escapeHtml(commit.message)}</span>
        </div>`).join('')}
      </div>
    `));
  }

  // === SECTION 10: Quick Links ===
  sections.push(T.section('Dashboard Suite', `
    <div class="grid-sm">
      ${[
        { file: 'coverage-dashboard.html', label: 'Coverage Dashboard', desc: 'Category treemap, fingerprint gaps, image coverage', color: T.THEME.green },
        { file: 'driver-dashboard.html', label: 'Driver Dashboard', desc: 'Protocol distribution, base classes, capabilities', color: T.THEME.blue },
        { file: 'dependency-dashboard.html', label: 'Dependency Dashboard', desc: 'Circular deps, unused modules, require() graph', color: T.THEME.purple },
        { file: 'error-dashboard.html', label: 'Error Dashboard', desc: 'Anti-patterns, code quality, fixable violations', color: T.THEME.red },
        { file: 'performance-dashboard.html', label: 'Performance Dashboard', desc: 'Bundle size, LOC trends, validation speed', color: T.THEME.yellow }
      ].map(d => `
      <a href="${d.file}" style="text-decoration:none">
        <div class="card" style="border-color:${d.color};cursor:pointer">
          <div class="card-title" style="color:${d.color}">${T.escapeHtml(d.label)}</div>
          <div class="metric-label">${T.escapeHtml(d.desc)}</div>
        </div>
      </a>`).join('')}
    </div>
  `));

  // Build full page
  return T.buildPage({
    title: 'Master Dashboard',
    subtitle: `Universal Tuya Zigbee v${appVersion} - Comprehensive Project Overview`,
    current: 'master',
    sections,
    timestamp
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('='.repeat(60));
  console.log('[MASTER-DASHBOARD] Starting comprehensive dashboard generation...');
  console.log('='.repeat(60));

  const startTime = Date.now();
  const args = process.argv.slice(2);
  let outputPath = path.join(ROOT, 'scripts', 'dashboard', 'master-dashboard.html');
  let jsonOutput = false;
  let skipDeps = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
    if (args[i] === '--json') jsonOutput = true;
    if (args[i] === '--skip-deps') skipDeps = true;
  }

  // Step 1: Collect all base metrics
  console.log('\n[MASTER] Step 1/4: Collecting base metrics...');
  const baseMetrics = collectAll();

  // Step 2: Collect enhanced metrics
  console.log('\n[MASTER] Step 2/4: Collecting enhanced metrics...');
  const metrics = collectEnhancedMetrics(baseMetrics);

  // Step 3: Run sub-dashboards
  console.log('\n[MASTER] Step 3/4: Generating sub-dashboards...');
  runSubDashboard('generate-coverage-dashboard.js');
  runSubDashboard('generate-driver-dashboard.js');
  runSubDashboard('generate-error-dashboard.js');
  runSubDashboard('generate-performance-dashboard.js');
  if (!skipDeps) {
    runSubDashboard('generate-dependency-dashboard.js');
  }

  // Step 4: Generate master dashboard
  console.log('\n[MASTER] Step 4/4: Generating master dashboard...');
  const html = generateMasterDashboard(metrics);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[MASTER] HTML: ${outputPath}`);

  // JSON output
  if (jsonOutput) {
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    const jsonData = {
      timestamp: metrics.timestamp,
      version: metrics.appMeta ? metrics.appMeta.version : 'unknown',
      health: metrics.health,
      drivers: {
        total: metrics.drivers.total,
        zigbee: metrics.drivers.protocols.zigbee,
        wifi: metrics.drivers.protocols.wifi,
        categories: Object.values(metrics.drivers.categories)
          .filter(c => c.drivers.length > 0)
          .map(c => ({ id: c.id, label: c.label, count: c.drivers.length, fingerprints: c.totalFingerprints, health: c.healthScore }))
      },
      fingerprints: { total: metrics.fingerprints.totalDB, sizeMB: metrics.fingerprints.sizeMB },
      flowCards: metrics.flowCards,
      library: { files: metrics.lib.totalFiles, lines: metrics.lib.totalLines, byDir: metrics.lib.byDir },
      workflows: { total: metrics.workflows.total, byTrigger: metrics.workflows.byTrigger },
      scripts: { total: metrics.scripts.total, lines: metrics.scripts.totalLines },
      clusters: { total: metrics.clusters.total, top: metrics.clusters.clusters.slice(0, 10) },
      images: metrics.images,
      knowledgeCache: metrics.knowledgeCacheStats || null
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`[MASTER] JSON: ${jsonPath}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log(`[MASTER-DASHBOARD] Complete in ${elapsed}s`);
  console.log(`  Drivers: ${metrics.drivers.total}`);
  console.log(`  Fingerprints: ${metrics.fingerprints.totalDB.toLocaleString()}`);
  console.log(`  Flow Cards: ${metrics.flowCards.total}`);
  console.log(`  LOC: ${metrics.lib.totalLines.toLocaleString()}`);
  console.log(`  Health: ${metrics.health.score}/100`);
  console.log(`  Workflows: ${metrics.workflows.total}`);
  console.log(`  Scripts: ${metrics.scripts.total}`);
  console.log(`  Clusters: ${metrics.clusters.total}`);
  console.log(`  Image Coverage: ${metrics.images.coveragePercent}%`);
  console.log('='.repeat(60));
}

main();
