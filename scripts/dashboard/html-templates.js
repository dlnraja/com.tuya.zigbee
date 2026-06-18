#!/usr/bin/env node
/**
 * html-templates.js - Shared HTML Template Engine
 *
 * Provides reusable HTML components for all dashboard generators:
 * - Page shell (head, nav, footer)
 * - Metric cards
 * - Bar charts
 * - Tables
 * - Treemaps
 * - Trend sparklines
 * - Health badges
 * - Filter controls
 *
 * All templates use a consistent dark theme matching the existing dashboards.
 */

'use strict';

// ---------------------------------------------------------------------------
// Theme Constants
// ---------------------------------------------------------------------------

const THEME = {
  bg: '#0a0e17',
  cardBg: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
  textBright: '#f0f6fc',
  blue: '#58a6ff',
  blueDark: '#1f6feb',
  green: '#3fb950',
  greenDark: '#238636',
  yellow: '#d29922',
  yellowDark: '#9e6a03',
  red: '#f85149',
  redDark: '#da3633',
  purple: '#bc8cff',
  orange: '#f0883e',
  cyan: '#79c0ff'
};

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Page Shell
// ---------------------------------------------------------------------------

function pageHead(title, extraCss = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: ${THEME.bg}; color: ${THEME.text}; padding: 20px; line-height: 1.6;
  }
  h1 { color: ${THEME.blue}; margin-bottom: 5px; font-size: 1.8em; }
  h2 { color: ${THEME.cyan}; margin: 24px 0 12px; border-bottom: 1px solid ${THEME.border}; padding-bottom: 6px; font-size: 1.3em; }
  h3 { color: ${THEME.textMuted}; margin: 15px 0 8px; font-size: 1.1em; }
  .subtitle { color: ${THEME.textMuted}; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 16px 0; }
  .grid-sm { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; }
  .card {
    background: ${THEME.cardBg}; border: 1px solid ${THEME.border}; border-radius: 8px;
    padding: 16px; transition: border-color 0.2s;
  }
  .card:hover { border-color: ${THEME.blue}; }
  .card-title { color: ${THEME.blue}; font-weight: 600; margin-bottom: 8px; font-size: 0.95em; }
  .metric { font-size: 2em; font-weight: 700; color: ${THEME.textBright}; }
  .metric-sm { font-size: 1.3em; font-weight: 600; color: ${THEME.textBright}; }
  .metric-label { font-size: 0.85em; color: ${THEME.textMuted}; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid ${THEME.border}; font-size: 0.88em; }
  th { color: ${THEME.cyan}; font-weight: 600; }
  .bar { height: 14px; background: ${THEME.border}; border-radius: 3px; overflow: hidden; margin: 2px 0; }
  .bar-lg { height: 20px; background: ${THEME.border}; border-radius: 4px; overflow: hidden; margin: 4px 0; }
  .bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; margin: 2px; }
  .tag-green { background: ${THEME.greenDark}; color: #fff; }
  .tag-blue { background: ${THEME.blueDark}; color: #fff; }
  .tag-yellow { background: ${THEME.yellowDark}; color: #fff; }
  .tag-red { background: ${THEME.redDark}; color: #fff; }
  .tag-gray { background: ${THEME.border}; color: ${THEME.text}; }
  .tag-purple { background: #6e40c9; color: #fff; }
  .health-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 0.8em; font-weight: 600; color: #fff;
  }
  .health-good { background: ${THEME.greenDark}; }
  .health-mid { background: ${THEME.yellowDark}; }
  .health-bad { background: ${THEME.redDark}; }
  .section { margin-bottom: 30px; }
  .summary-bar { display: flex; gap: 20px; margin: 16px 0; flex-wrap: wrap; }
  .summary-item { padding: 10px 16px; border-radius: 8px; background: ${THEME.cardBg}; border: 1px solid ${THEME.border}; }
  .summary-item .num { font-size: 1.8em; font-weight: 700; }
  .summary-item .label { font-size: 0.85em; color: ${THEME.textMuted}; }
  .filter-controls { margin: 12px 0; display: flex; gap: 8px; flex-wrap: wrap; }
  .filter-btn {
    padding: 4px 12px; border-radius: 6px; border: 1px solid ${THEME.border};
    background: ${THEME.cardBg}; color: ${THEME.text}; cursor: pointer; font-size: 0.85em;
  }
  .filter-btn.active { border-color: ${THEME.blue}; color: ${THEME.blue}; }
  .filter-btn:hover { border-color: ${THEME.blue}; }
  pre {
    background: ${THEME.cardBg}; padding: 12px; border-radius: 6px;
    border: 1px solid ${THEME.border}; font-size: 0.85em; overflow-x: auto;
  }
  .nav-links { margin: 12px 0; display: flex; gap: 12px; flex-wrap: wrap; }
  .nav-links a { color: ${THEME.blue}; text-decoration: none; font-size: 0.9em; }
  .nav-links a:hover { text-decoration: underline; }
  .treemap { display: flex; flex-wrap: wrap; gap: 2px; margin: 16px 0; }
  .treemap-cell {
    border-radius: 6px; padding: 10px; text-align: center;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    min-height: 60px; transition: transform 0.15s; cursor: default; overflow: hidden;
  }
  .treemap-cell:hover { transform: scale(1.03); z-index: 2; }
  .treemap-num { font-size: 1.6em; font-weight: 700; color: #fff; }
  .treemap-label { font-size: 0.75em; color: rgba(255,255,255,0.8); margin-top: 2px; }
  .sparkline { display: flex; align-items: flex-end; gap: 1px; height: 30px; margin: 8px 0; }
  .spark-bar { flex: 1; background: ${THEME.blue}; border-radius: 1px; min-width: 3px; }
  .error-list { max-height: 400px; overflow-y: auto; }
  .error-item {
    padding: 6px 10px; margin: 3px 0; border-left: 3px solid ${THEME.border};
    background: ${THEME.cardBg}; border-radius: 0 4px 4px 0; font-size: 0.88em;
  }
  .module-path { font-family: monospace; color: ${THEME.blue}; font-size: 0.88em; }
  .tooltip { position: relative; }
  .tooltip:hover::after {
    content: attr(data-tip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
    background: ${THEME.cardBg}; border: 1px solid ${THEME.border}; padding: 4px 8px;
    border-radius: 4px; font-size: 0.75em; white-space: nowrap; z-index: 10;
  }
  @media (max-width: 800px) {
    .grid { grid-template-columns: 1fr; }
    .grid-sm { grid-template-columns: 1fr 1fr; }
  }
  ${extraCss}
</style>
</head>`;
}

function pageNav(dashboards, current) {
  const links = dashboards
    .map(d => d.id === current
      ? `<span style="color:${THEME.textBright};font-weight:600">${d.label}</span>`
      : `<a href="${d.file}">${d.label}</a>`)
    .join(' | ');
  return `<div class="nav-links">${links}</div>`;
}

function pageFooter(timestamp) {
  return `<pre>
Generated: ${timestamp}
Universal Tuya Zigbee - Dashboard Suite
</pre>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function metricCard(title, value, label = '', color = THEME.textBright) {
  return `<div class="card">
  <div class="card-title">${escapeHtml(title)}</div>
  <div class="metric" style="color:${color}">${typeof value === 'number' ? value.toLocaleString() : escapeHtml(String(value))}</div>
  ${label ? `<div class="metric-label">${escapeHtml(label)}</div>` : ''}
</div>`;
}

function metricCardSm(title, value, label = '') {
  return `<div class="card">
  <div class="card-title">${escapeHtml(title)}</div>
  <div class="metric-sm">${typeof value === 'number' ? value.toLocaleString() : escapeHtml(String(value))}</div>
  ${label ? `<div class="metric-label">${escapeHtml(label)}</div>` : ''}
</div>`;
}

function progressBar(value, max, color = THEME.blue, width = '100%') {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `<div class="bar" style="width:${width}"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

function progressBarLg(value, max, color = THEME.blue) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `<div class="bar-lg"><div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}cc)"></div></div>`;
}

function healthBadge(score) {
  const cls = score >= 80 ? 'health-good' : score >= 50 ? 'health-mid' : 'health-bad';
  return `<span class="health-badge ${cls}">${score}%</span>`;
}

function severityTag(severity) {
  const map = { error: 'tag-red', warning: 'tag-yellow', info: 'tag-blue', success: 'tag-green' };
  return `<span class="tag ${map[severity] || 'tag-gray'}">${severity}</span>`;
}

function trendArrow(values) {
  if (!values || values.length < 2) return '';
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (last > prev) return `<span style="color:${THEME.red}">&#9650; +${(last - prev).toLocaleString()}</span>`;
  if (last < prev) return `<span style="color:${THEME.green}">&#9660; ${(last - prev).toLocaleString()}</span>`;
  return `<span style="color:${THEME.textMuted}">&#9644; stable</span>`;
}

function sparkline(values, color = THEME.blue) {
  if (!values || values.length === 0) return '';
  const max = Math.max(...values, 1);
  return `<div class="sparkline">${values.map(v =>
    `<div class="spark-bar" style="height:${Math.max(2, (v / max) * 100)}%;background:${color}"></div>`
  ).join('')}</div>`;
}

function dataTable(headers, rows, options = {}) {
  const { maxHeight, sortable } = options;
  const scrollStyle = maxHeight ? `max-height:${maxHeight}px;overflow-y:auto` : '';
  return `<div style="${scrollStyle}">
<table>
<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody>
${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>
</div>`;
}

function summaryBar(items) {
  return `<div class="summary-bar">
${items.map(i => `<div class="summary-item">
  <div class="num" style="color:${i.color || THEME.textBright}">${typeof i.value === 'number' ? i.value.toLocaleString() : i.value}</div>
  <div class="label">${escapeHtml(i.label)}</div>
</div>`).join('\n')}
</div>`;
}

function section(title, content) {
  return `<div class="section">
<h2>${escapeHtml(title)}</h2>
${content}
</div>`;
}

// ---------------------------------------------------------------------------
// Full Page Builder
// ---------------------------------------------------------------------------

function buildPage(config) {
  const {
    title,
    subtitle,
    dashboards = [],
    current = '',
    sections = [],
    extraCss = '',
    timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  } = config;

  const navDashboards = [
    { id: 'master', label: 'Master Dashboard', file: 'master-dashboard.html' },
    { id: 'coverage', label: 'Coverage', file: 'coverage-dashboard.html' },
    { id: 'drivers', label: 'Drivers', file: 'driver-dashboard.html' },
    { id: 'dependencies', label: 'Dependencies', file: 'dependency-dashboard.html' },
    { id: 'errors', label: 'Errors', file: 'error-dashboard.html' },
    { id: 'performance', label: 'Performance', file: 'performance-dashboard.html' },
    ...dashboards
  ];

  return `${pageHead(title, extraCss)}
<body>

<h1>${escapeHtml(title)}</h1>
<p class="subtitle">${escapeHtml(subtitle)} | ${timestamp}</p>

${pageNav(navDashboards, current)}

${sections.join('\n')}

${pageFooter(timestamp)}`;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  THEME,
  escapeHtml,
  pageHead,
  pageNav,
  pageFooter,
  metricCard,
  metricCardSm,
  progressBar,
  progressBarLg,
  healthBadge,
  severityTag,
  trendArrow,
  sparkline,
  dataTable,
  summaryBar,
  section,
  buildPage
};
