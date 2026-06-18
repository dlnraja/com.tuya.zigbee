#!/usr/bin/env node
/**
 * generate-coverage-dashboard.js - Coverage Dashboard Generator
 *
 * Improved version of scripts/cartography/coverage-map.js.
 * Generates an interactive HTML dashboard showing:
 * - Category treemap with driver counts
 * - Fingerprint coverage per category
 * - Flow card distribution
 * - Image/asset coverage gaps
 * - Cluster coverage analysis
 * - Manufacturer distribution
 *
 * Usage:
 *   node scripts/dashboard/generate-coverage-dashboard.js [--output path] [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { collectAll, CATEGORY_RULES, ROOT } = require('./shared-collector');
const T = require('./html-templates');

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateDashboard(metrics) {
  const { drivers, fingerprints, images, clusters, health } = metrics;
  const timestamp = metrics.timestamp.replace('T', ' ').slice(0, 19);
  const appVersion = metrics.appMeta ? metrics.appMeta.version : 'unknown';

  // Sort categories by driver count
  const sortedCats = Object.values(drivers.categories)
    .filter(c => c.drivers.length > 0)
    .sort((a, b) => b.drivers.length - a.drivers.length);

  const maxDrivers = Math.max(...sortedCats.map(c => c.drivers.length), 1);

  // Treemap data
  const treemapItems = sortedCats.map(c => ({
    ...c,
    ratio: c.drivers.length / drivers.total
  }));

  // Coverage gaps
  const gaps = [];
  for (const cat of Object.values(drivers.categories)) {
    if (cat.drivers.length === 0 && cat.id !== 'other') {
      gaps.push({ type: 'EMPTY_CATEGORY', category: cat.id, label: cat.label, severity: 'info', message: `Category "${cat.label}" has no drivers` });
    }
    if (cat.drivers.length > 0 && cat.totalFingerprints === 0) {
      gaps.push({ type: 'NO_FINGERPRINTS', category: cat.id, label: cat.label, severity: 'warning', message: `${cat.drivers.length} drivers in "${cat.label}" have zero fingerprints` });
    }
    for (const d of cat.drivers) {
      if (d.issues.length > 0) {
        for (const issue of d.issues) {
          gaps.push({ type: issue, category: cat.id, label: cat.label, driver: d.id, severity: issue === 'NO_DEVICE_JS' ? 'error' : 'warning', message: `Driver "${d.id}" in "${cat.label}": ${issue}` });
        }
      }
    }
  }

  // Top manufacturers
  const mfrCount = {};
  for (const d of drivers.drivers) {
    for (const m of d.manufacturerNames) {
      const key = m.toLowerCase();
      mfrCount[key] = (mfrCount[key] || 0) + 1;
    }
  }
  const topMfrs = Object.entries(mfrCount).sort((a, b) => b[1] - a[1]).slice(0, 20);

  // Build sections
  const sections = [];

  // Summary bar
  sections.push(T.summaryBar([
    { value: drivers.total, label: 'Total Drivers', color: T.THEME.blue },
    { value: fingerprints.totalDB.toLocaleString(), label: 'Fingerprints', color: T.THEME.green },
    { value: metrics.flowCards.total, label: 'Flow Cards', color: T.THEME.yellow },
    { value: sortedCats.length, label: 'Active Categories', color: T.THEME.purple },
    { value: images.coveragePercent + '%', label: 'Image Coverage', color: T.THEME.orange },
    { value: gaps.filter(g => g.severity === 'error').length, label: 'Errors', color: T.THEME.red },
    { value: gaps.filter(g => g.severity === 'warning').length, label: 'Warnings', color: T.THEME.yellow }
  ]));

  // Health score
  sections.push(T.section('Project Health', `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
      ${T.healthBadge(health.score)}
      <span style="color:${T.THEME.textMuted}">Project Health Score</span>
    </div>
    ${health.strengths.map(s => `<span class="tag tag-green">${T.escapeHtml(s)}</span>`).join(' ')}
    ${health.warnings.map(w => `<span class="tag tag-yellow">${T.escapeHtml(w)}</span>`).join(' ')}
    ${health.issues.map(i => `<span class="tag tag-red">${T.escapeHtml(i)}</span>`).join(' ')}
  `));

  // Treemap
  sections.push(T.section('Visual Coverage Treemap', `
    <div class="treemap">
      ${treemapItems.map(c => `
      <div class="treemap-cell" style="flex:${Math.max(c.ratio * 10, 0.5)};background:${c.color};min-width:${Math.max(c.ratio * 200, 80)}px">
        <div class="treemap-num">${c.drivers.length}</div>
        <div class="treemap-label">${T.escapeHtml(c.label)}</div>
        <div style="font-size:0.65em;color:rgba(255,255,255,0.6)">${c.totalFingerprints.toLocaleString()} FP</div>
      </div>`).join('')}
    </div>
  `));

  // Category breakdown table
  sections.push(T.section('Category Breakdown', T.dataTable(
    ['Category', 'Drivers', 'Fingerprints', 'Flow Cards', 'Health', 'Coverage'],
    sortedCats.map(c => [
      `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:6px;vertical-align:middle"></span>${T.escapeHtml(c.label)}`,
      c.drivers.length,
      c.totalFingerprints.toLocaleString(),
      c.totalFlowCards,
      T.healthBadge(c.healthScore),
      T.progressBar(c.drivers.length, maxDrivers, c.color, '150px')
    ]),
    { maxHeight: 600 }
  )));

  // Image coverage
  sections.push(T.section('Image/Asset Coverage', `
    <div class="grid">
      ${T.metricCard('With Images', images.withImages, `${images.coveragePercent}% of drivers`, T.THEME.green)}
      ${T.metricCard('Missing Images', images.withoutImages, images.withoutImages > 0 ? 'Drivers without assets/images/' : 'All drivers have images', images.withoutImages > 0 ? T.THEME.red : T.THEME.green)}
    </div>
    ${images.missingDrivers.length > 0 ? `
    <h3>Drivers Missing Images (${images.missingDrivers.length})</h3>
    <div style="max-height:200px;overflow-y:auto">
      ${images.missingDrivers.map(d => `<span class="tag tag-red">${T.escapeHtml(d)}</span>`).join(' ')}
    </div>` : ''}
  `));

  // Cluster coverage
  sections.push(T.section('Cluster Coverage', T.dataTable(
    ['Cluster', 'Drivers Using', 'Coverage'],
    clusters.clusters.slice(0, 20).map(c => [
      `<span class="module-path">${T.escapeHtml(c.name)}</span>`,
      c.count,
      T.progressBar(c.count, drivers.total, T.THEME.blue, '200px')
    ]),
    { maxHeight: 400 }
  )));

  // Top manufacturers
  if (topMfrs.length > 0) {
    sections.push(T.section('Top Manufacturers (by driver count)', T.dataTable(
      ['Manufacturer', 'Drivers'],
      topMfrs.map(([mfr, count]) => [
        `<span class="module-path">${T.escapeHtml(mfr)}</span>`,
        count
      ]),
      { maxHeight: 300 }
    )));
  }

  // Coverage gaps
  sections.push(T.section(`Coverage Gaps (${gaps.length} found)`, `
    <div class="error-list">
      ${gaps.length === 0 ? '<p style="color:' + T.THEME.green + '">No gaps found.</p>' :
        gaps.slice(0, 100).map(g => `
        <div class="error-item" style="border-color:${g.severity === 'error' ? T.THEME.redDark : g.severity === 'warning' ? T.THEME.yellowDark : T.THEME.blueDark}">
          ${T.severityTag(g.severity)}
          <span style="font-family:monospace;color:${T.THEME.blue};margin-left:4px">${T.escapeHtml(g.type)}</span>
          ${g.driver ? `<span style="color:${T.THEME.textMuted}">[${T.escapeHtml(g.driver)}]</span>` : ''}
          <div style="color:${T.THEME.textMuted};font-size:0.85em;margin-top:2px">${T.escapeHtml(g.message)}</div>
        </div>`).join('')}
      ${gaps.length > 100 ? `<p style="color:${T.THEME.textMuted};margin-top:8px">Showing 100 of ${gaps.length} gaps</p>` : ''}
    </div>
  `));

  // Per-category driver lists
  for (const cat of sortedCats.slice(0, 15)) {
    sections.push(T.section(`${cat.label} (${cat.drivers.length} drivers, ${cat.totalFingerprints.toLocaleString()} FP)`, `
      <div style="margin:8px 0">
        ${cat.drivers.map(d => `
        <span class="tag ${d.issues.length > 0 ? 'tag-red' : 'tag-gray'}" title="${T.escapeHtml(d.id)}: ${d.fingerprintCount} FP, ${d.flowCardCount} FC${d.issues.length > 0 ? ' | ISSUES: ' + d.issues.join(', ') : ''}">
          ${T.escapeHtml(d.id)}${d.fingerprintCount > 0 ? ` <span style="color:${T.THEME.green}">[${d.fingerprintCount}]</span>` : ` <span style="color:${T.THEME.red}">[0]</span>`}
        </span>`).join('')}
      </div>
    `));
  }

  return T.buildPage({
    title: 'Coverage Dashboard',
    subtitle: `Universal Tuya Zigbee v${appVersion} - Driver Category & Fingerprint Coverage`,
    current: 'coverage',
    sections,
    timestamp
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[COVERAGE-DASHBOARD] Starting...');

  const args = process.argv.slice(2);
  let outputPath = path.join(ROOT, 'scripts', 'dashboard', 'coverage-dashboard.html');
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
      totalDrivers: metrics.drivers.total,
      totalFingerprints: metrics.fingerprints.totalDB,
      totalFlowCards: metrics.flowCards.total,
      categories: Object.values(metrics.drivers.categories).filter(c => c.drivers.length > 0).map(c => ({
        id: c.id, label: c.label, drivers: c.drivers.length,
        fingerprints: c.totalFingerprints, flowCards: c.totalFlowCards, health: c.healthScore
      })),
      imageCoverage: metrics.images,
      clusters: metrics.clusters.clusters.slice(0, 20),
      health: metrics.health
    }, null, 2), 'utf8');
    console.log(`[COVERAGE-DASHBOARD] JSON: ${jsonPath}`);
  }

  const html = generateDashboard(metrics);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[COVERAGE-DASHBOARD] HTML: ${outputPath}`);
  console.log(`[COVERAGE-DASHBOARD] Done.`);
}

main();
