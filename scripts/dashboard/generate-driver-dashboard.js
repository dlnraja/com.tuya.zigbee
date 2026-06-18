#!/usr/bin/env node
/**
 * generate-driver-dashboard.js - Driver Dashboard Generator
 *
 * Improved version of scripts/cartography/dev-dashboard.js.
 * Generates an interactive HTML dashboard showing:
 * - Overview metrics (drivers, fingerprints, flow cards, LOC)
 * - Protocol distribution (Zigbee vs WiFi)
 * - File completeness per driver
 * - Base class usage distribution
 * - Capability distribution
 * - Driver category grid
 * - Top library modules by LOC
 * - Recent git timeline
 * - Driver issue list
 *
 * Usage:
 *   node scripts/dashboard/generate-driver-dashboard.js [--output path] [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { collectAll, ROOT } = require('./shared-collector');
const { getGitLog } = require('./shared-collector');
const T = require('./html-templates');

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateDashboard(metrics) {
  const { drivers, fingerprints, flowCards, lib, clusters, images, health, appMeta } = metrics;
  const timestamp = metrics.timestamp.replace('T', ' ').slice(0, 19);
  const appVersion = appMeta ? appMeta.version : 'unknown';
  const gitLog = getGitLog(30);

  // Base class distribution
  const baseClassCount = {};
  for (const d of drivers.drivers) {
    if (d.baseClass) {
      baseClassCount[d.baseClass] = (baseClassCount[d.baseClass] || 0) + 1;
    }
  }
  const topBaseClasses = Object.entries(baseClassCount).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // Capability frequency
  const capFreq = {};
  for (const d of drivers.drivers) {
    for (const cap of d.capabilities) {
      const capId = typeof cap === 'string' ? cap : cap.id || JSON.stringify(cap);
      capFreq[capId] = (capFreq[capId] || 0) + 1;
    }
  }
  const topCaps = Object.entries(capFreq).sort((a, b) => b[1] - a[1]).slice(0, 25);

  // Drivers with issues
  const topIssues = drivers.drivers.filter(d => d.issues.length > 0).sort((a, b) => b.issues.length - a.issues.length);

  // Protocol stats
  const zigbeePct = drivers.total > 0 ? (drivers.protocols.zigbee / drivers.total * 100).toFixed(1) : 0;
  const wifiPct = drivers.total > 0 ? (drivers.protocols.wifi / drivers.total * 100).toFixed(1) : 0;

  const sections = [];

  // Health badge
  sections.push(`
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      ${T.healthBadge(health.score)}
      <span style="color:${T.THEME.textMuted}">Project Health Score</span>
      ${health.strengths.map(s => `<span class="tag tag-green">${T.escapeHtml(s)}</span>`).join(' ')}
      ${health.warnings.map(w => `<span class="tag tag-yellow">${T.escapeHtml(w)}</span>`).join(' ')}
    </div>
  `);

  // Overview metrics
  sections.push(T.section('Overview', `
    <div class="grid">
      ${T.metricCard('Drivers', drivers.total, `${drivers.protocols.zigbee} Zigbee + ${drivers.protocols.wifi} WiFi`)}
      ${T.metricCard('Fingerprints', fingerprints.totalDB.toLocaleString(), `${fingerprints.uniqueManufacturerNames} unique manufacturers`)}
      ${T.metricCard('Flow Cards', flowCards.total, `T: ${flowCards.byType.triggers} | C: ${flowCards.byType.conditions} | A: ${flowCards.byType.actions}`)}
      ${T.metricCard('Lines of Code', lib.totalLines.toLocaleString(), `${lib.totalFiles} files in lib/`)}
      ${T.metricCard('Capabilities', drivers.uniqueCapabilities.length, 'Unique capability types')}
      ${T.metricCard('Clusters', clusters.total, 'Distinct ZCL clusters used')}
    </div>
  `));

  // Driver health
  sections.push(T.section('Driver Health', `
    <div class="grid">
      <div class="card">
        <div class="card-title">File Completeness</div>
        <div style="margin:6px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>device.js</span><span>${drivers.withDeviceJs}/${drivers.total} (${(drivers.withDeviceJs/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.withDeviceJs, drivers.total, T.THEME.green)}
        </div>
        <div style="margin:6px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>driver.js</span><span>${drivers.withDriverJs}/${drivers.total} (${(drivers.withDriverJs/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.withDriverJs, drivers.total, T.THEME.green)}
        </div>
        <div style="margin:6px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>compose.json</span><span>${drivers.withComposeJson}/${drivers.total} (${(drivers.withComposeJson/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.withComposeJson, drivers.total, T.THEME.blue)}
        </div>
        <div style="margin:6px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>flow.compose</span><span>${drivers.withFlowCompose}/${drivers.total} (${(drivers.withFlowCompose/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.withFlowCompose, drivers.total, T.THEME.yellow)}
        </div>
        <div style="margin:6px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>assets/images</span><span>${drivers.withAssets}/${drivers.total} (${(drivers.withAssets/drivers.total*100).toFixed(1)}%)</span></div>
          ${T.progressBarLg(drivers.withAssets, drivers.total, T.THEME.blue)}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Protocol Distribution</div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>Zigbee</span><span>${drivers.protocols.zigbee} (${zigbeePct}%)</span></div>
          ${T.progressBarLg(drivers.protocols.zigbee, drivers.total, T.THEME.green)}
        </div>
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>WiFi</span><span>${drivers.protocols.wifi} (${wifiPct}%)</span></div>
          ${T.progressBarLg(drivers.protocols.wifi, drivers.total, T.THEME.blue)}
        </div>
        ${drivers.protocols.unknown > 0 ? `
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:0.85em"><span>Unknown</span><span>${drivers.protocols.unknown}</span></div>
          ${T.progressBarLg(drivers.protocols.unknown, drivers.total, T.THEME.yellow)}
        </div>` : ''}
      </div>
    </div>
  `));

  // Driver categories grid
  const sortedCats = Object.values(drivers.categories)
    .filter(c => c.drivers.length > 0)
    .sort((a, b) => b.drivers.length - a.drivers.length);

  sections.push(T.section(`Driver Categories (${sortedCats.length} categories)`, `
    <div class="grid-sm">
      ${sortedCats.map(c => `
      <div class="card" style="text-align:center">
        <div style="font-size:1.8em;font-weight:700;color:${c.color}">${c.drivers.length}</div>
        <div style="font-size:0.85em;color:${T.THEME.textMuted}">${T.escapeHtml(c.label)}</div>
        <div style="font-size:0.75em;color:${T.THEME.textMuted}">${c.totalFingerprints.toLocaleString()} FP</div>
      </div>`).join('')}
    </div>
  `));

  // Base class distribution
  if (topBaseClasses.length > 0) {
    sections.push(T.section('Base Class Distribution', T.dataTable(
      ['Base Class', 'Drivers', 'Coverage'],
      topBaseClasses.map(([cls, count]) => [
        `<span class="module-path">${T.escapeHtml(cls)}</span>`,
        count,
        T.progressBar(count, drivers.total, T.THEME.purple, '200px')
      ])
    )));
  }

  // Top capabilities
  if (topCaps.length > 0) {
    sections.push(T.section('Top Capabilities (by driver usage)', T.dataTable(
      ['Capability', 'Drivers Using'],
      topCaps.map(([cap, count]) => [
        `<span class="module-path">${T.escapeHtml(cap)}</span>`,
        count
      ]),
      { maxHeight: 400 }
    )));
  }

  // Library module hotspots
  sections.push(T.section('Library Module Hotspots (Top 20 by LOC)', T.dataTable(
    ['Module', 'Lines', 'Size'],
    lib.modules.slice(0, 20).map(m => [
      `<span class="module-path">${T.escapeHtml(m.path)}</span>`,
      m.lines.toLocaleString(),
      (m.size / 1024).toFixed(1) + ' KB'
    ])
  )));

  // Library by directory
  sections.push(T.section('Library by Directory', `
    <div class="grid-sm">
      ${Object.entries(lib.byDir)
        .sort((a, b) => b[1].lines - a[1].lines)
        .map(([dir, data]) => `
      <div class="card">
        <div class="card-title">lib/${T.escapeHtml(dir)}/</div>
        <div class="metric-sm">${data.lines.toLocaleString()} lines</div>
        <div class="metric-label">${data.files} files</div>
        ${T.progressBar(data.lines, lib.totalLines, T.THEME.blue)}
      </div>`).join('')}
    </div>
  `));

  // Recent changes timeline
  if (gitLog.length > 0) {
    sections.push(T.section(`Recent Changes (Last ${gitLog.length} Commits)`, `
      <div style="max-height:400px;overflow-y:auto">
        ${gitLog.map(commit => `
        <div style="padding:6px 0;border-left:2px solid ${T.THEME.border};padding-left:12px;margin-left:8px">
          <span style="color:${T.THEME.blue};font-family:monospace">${T.escapeHtml(commit.hash)}</span>
          <span style="color:${T.THEME.textMuted};font-size:0.85em;margin-left:8px">${T.escapeHtml(commit.date)}</span>
          <div style="color:${T.THEME.text}">${T.escapeHtml(commit.message)}</div>
        </div>`).join('')}
      </div>
    `));
  }

  // Driver issues
  if (topIssues.length > 0) {
    sections.push(T.section(`Driver Issues (${topIssues.length} drivers)`, T.dataTable(
      ['Driver', 'Issues', 'Category'],
      topIssues.slice(0, 50).map(d => [
        T.escapeHtml(d.id),
        d.issues.map(i => `<span class="tag tag-red">${T.escapeHtml(i)}</span>`).join(' '),
        `<span class="tag tag-gray">${T.escapeHtml(d.category)}</span>`
      ]),
      { maxHeight: 500 }
    )));
  }

  return T.buildPage({
    title: 'Driver Dashboard',
    subtitle: `Universal Tuya Zigbee v${appVersion} - Driver Metrics & Health`,
    current: 'drivers',
    sections,
    timestamp
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[DRIVER-DASHBOARD] Starting...');

  const args = process.argv.slice(2);
  let outputPath = path.join(ROOT, 'scripts', 'dashboard', 'driver-dashboard.html');
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
    if (args[i] === '--json') jsonOutput = true;
  }

  const metrics = collectAll();

  if (jsonOutput) {
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      timestamp: metrics.timestamp,
      drivers: {
        total: metrics.drivers.total,
        zigbee: metrics.drivers.protocols.zigbee,
        wifi: metrics.drivers.protocols.wifi,
        totalFingerprints: metrics.drivers.totalFingerprints,
        totalFlowCards: metrics.drivers.totalFlowCards,
        withDeviceJs: metrics.drivers.withDeviceJs,
        withComposeJson: metrics.drivers.withComposeJson,
        withAssets: metrics.drivers.withAssets
      },
      fingerprints: { total: metrics.fingerprints.totalDB, uniqueMfrs: metrics.fingerprints.uniqueManufacturerNames },
      flowCards: metrics.flowCards,
      lib: { totalFiles: metrics.lib.totalFiles, totalLines: metrics.lib.totalLines },
      health: metrics.health
    }, null, 2), 'utf8');
    console.log(`[DRIVER-DASHBOARD] JSON: ${jsonPath}`);
  }

  const html = generateDashboard(metrics);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[DRIVER-DASHBOARD] HTML: ${outputPath}`);
  console.log(`[DRIVER-DASHBOARD] Done.`);
}

main();
