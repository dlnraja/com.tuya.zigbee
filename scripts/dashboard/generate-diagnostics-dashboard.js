#!/usr/bin/env node
'use strict';

/**
 * generate-diagnostics-dashboard.js — Gmail / Homey diagnostics HTML dashboard
 *
 * Reads .github/state/diagnostics-report.json (sanitized) and renders an
 * interactive triage view using DiagContentEnricher signals.
 *
 * Usage:
 *   node scripts/dashboard/generate-diagnostics-dashboard.js [--json]
 */

const fs = require('fs');
const path = require('path');
const { enrich, KNOWN_SIGNALS } = require('../../lib/diagnostics/DiagContentEnricher');
const T = require('./html-templates');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT = process.env.DIAG_REPORT
  ? path.resolve(process.env.DIAG_REPORT)
  : (() => {
    const local = path.join(ROOT, '.github', 'state', 'diagnostics-report.json');
    if (fs.existsSync(local)) return local;
    const sibling = path.resolve(ROOT, '..', 'master', '.github', 'state', 'diagnostics-report.json');
    return fs.existsSync(sibling) ? sibling : local;
  })();
const OUT = path.join(__dirname, 'diagnostics-dashboard.html');
const JSON_MODE = process.argv.includes('--json');

function loadReport() {
  if (!fs.existsSync(REPORT)) return null;
  return JSON.parse(fs.readFileSync(REPORT, 'utf8'));
}

function bodyBits(d) {
  return [
    d.subj,
    d.bodyExcerpt,
    d.diagSummary,
    d.userMessage,
    d.logId,
    (d.couples || []).map((c) => `${c.mfr} ${c.pid}`).join(' '),
    (d.fps?.mfr || []).join(' '),
    (d.fps?.pid || []).join(' '),
    (d.crashInfo?.stackTraces || []).join('\n'),
    (d.errs || []).join('\n'),
    (d.logHighlights || []).join('\n'),
  ].filter(Boolean).join('\n');
}

function enrichEntry(d) {
  const fromReport = {
    logIdShort: d.logIdShort || (d.logId ? String(d.logId).slice(0, 8) : null),
    couples: (d.couples || []).map((c) => ({ mfr: c.mfr, pid: c.pid || c.productId })),
    signals: (d.signals || []).map((s) => (
      typeof s === 'string'
        ? (KNOWN_SIGNALS.find((k) => k.id === s) || { id: s, severity: 'medium', fix: 'see device-truth' })
        : s
    )),
    drivers: d.driversInLog || [],
    meta: {
      appVersion: d.appVersion,
      appId: d.appId,
      homeyVersion: d.homeyVersion,
    },
    userMessage: d.userMessage,
    summary: d.diagSummary,
  };
  const parsed = enrich(bodyBits(d));
  return {
    logIdShort: fromReport.logIdShort || parsed.logIdShort,
    couples: fromReport.couples.length ? fromReport.couples : parsed.couples,
    signals: fromReport.signals.length ? fromReport.signals : parsed.signals,
    drivers: fromReport.drivers.length ? fromReport.drivers : parsed.drivers,
    meta: {
      appVersion: fromReport.meta.appVersion || parsed.meta.appVersion,
      appId: fromReport.meta.appId || parsed.meta.appId,
      homeyVersion: fromReport.meta.homeyVersion || parsed.meta.homeyVersion,
    },
    userMessage: fromReport.userMessage || parsed.userMessage,
    summary: fromReport.summary || parsed.summary,
  };
}

function severityClass(sev) {
  if (sev === 'critical' || sev === 'high') return 'tag-red';
  if (sev === 'medium') return 'tag-yellow';
  return 'tag-blue';
}

function buildRows(diags) {
  return diags.map((d) => {
    const en = enrich(bodyBits(d));
    return {
      date: (d.date || '').slice(0, 16).replace('T', ' '),
      type: d.type || 'unknown',
      logId: en.logIdShort || '—',
      app: en.meta.appVersion || d.appVersion || '—',
      appId: en.meta.appId || d.appId || '—',
      couple: en.couples[0] ? `${en.couples[0].mfr}+${en.couples[0].pid}` : '—',
      drivers: en.drivers.slice(0, 3).join(', ') || '—',
      signals: en.signals,
      signalIds: en.signals.map((s) => s.id).join(', ') || '—',
      userMessage: en.userMessage || '',
      subj: String(d.subj || '').slice(0, 72),
      summary: en.summary,
    };
  });
}

function countBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || k === '—') continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function topSignals(rows) {
  const m = new Map();
  for (const r of rows) {
    for (const s of r.signals) {
      m.set(s.id, (m.get(s.id) || 0) + 1);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function renderSignalLegend() {
  return KNOWN_SIGNALS.slice(0, 10).map((s) =>
    `<div class="error-item" style="border-left-color:${s.severity === 'critical' ? T.THEME.red : s.severity === 'high' ? T.THEME.orange : T.THEME.yellow}">
      <span class="tag ${severityClass(s.severity)}">${s.id}</span>
      <span style="color:${T.THEME.textMuted};margin-left:8px">${T.escapeHtml(s.fix)}</span>
    </div>`,
  ).join('\n');
}

function renderBarList(entries, max = 8) {
  const top = entries.slice(0, max);
  const peak = top[0]?.[1] || 1;
  return top.map(([label, count]) => `
    <div style="margin:6px 0">
      <div style="display:flex;justify-content:space-between;font-size:0.85em">
        <span>${T.escapeHtml(label)}</span><span>${count}</span>
      </div>
      ${T.progressBar(count, peak, T.THEME.blue)}
    </div>`).join('');
}

function main() {
  const report = loadReport();
  if (!report) {
    console.error('[diagnostics-dashboard] Missing', REPORT);
    console.error('Run: npm run diag:gmail  (or copy sanitized report into .github/state/)');
    process.exit(1);
  }

  const raw = report.diagnostics || [];
  const rows = buildRows(raw);
  const withSignals = rows.filter((r) => r.signals.length);
  const signalTop = topSignals(rows);
  const appVersions = countBy(rows, (r) => r.app);
  const couples = countBy(rows, (r) => r.couple);
  const types = report.byType || {};

  const summary = {
    generatedAt: new Date().toISOString(),
    total: report.count || raw.length,
    enriched: rows.length,
    withSignals: withSignals.length,
    runMode: report.run?.mode,
    authOk: report.access?.gmail?.ok,
    topSignals: signalTop,
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const tableRows = rows.slice(0, 80).map((r) => {
    const sigTags = r.signals.map((s) =>
      `<span class="tag ${severityClass(s.severity)}" title="${T.escapeHtml(s.fix)}">${s.id}</span>`,
    ).join(' ');
    return `<tr data-type="${T.escapeHtml(r.type)}" data-signals="${T.escapeHtml(r.signalIds)}">
      <td>${T.escapeHtml(r.date)}</td>
      <td><code>${T.escapeHtml(r.logId)}</code></td>
      <td>${T.escapeHtml(r.type)}</td>
      <td>v${T.escapeHtml(String(r.app))}</td>
      <td><code style="font-size:0.8em">${T.escapeHtml(r.couple)}</code></td>
      <td>${sigTags || '<span class="tag tag-gray">—</span>'}</td>
      <td title="${T.escapeHtml(r.subj)}">${T.escapeHtml(r.subj)}</td>
    </tr>`;
  }).join('\n');

  const historyCats = (report.history?.categories || []).map((c) =>
    `<div class="card"><div class="card-title">${T.escapeHtml(c.label)}</div>
     <div class="metric-sm">${c.count}</div>
     <div class="metric-label">${T.severityTag(c.severity === 'high' ? 'error' : 'warning')}</div></div>`,
  ).join('\n');

  const html = T.buildPage({
    title: 'Diagnostics Dashboard',
    subtitle: `Gmail triage — ${summary.total} emails | ${withSignals.length} with known signals`,
    current: 'diagnostics',
    dashboards: [{ id: 'diagnostics', label: 'Diagnostics', file: 'diagnostics-dashboard.html' }],
    sections: [
      `<div class="summary-bar">
        ${T.metricCardSm('Total diags', summary.total, report.run?.since || 'rolling window')}
        ${T.metricCardSm('Known signals', withSignals.length, `${((withSignals.length / Math.max(rows.length, 1)) * 100).toFixed(0)}% matched`)}
        ${T.metricCardSm('Types', Object.keys(types).length, Object.entries(types).map(([k, v]) => `${k}:${v}`).join(' '))}
        ${T.metricCardSm('Gmail access', report.access?.gmail?.ok ? 'OK' : (report.access?.gmail?.code || 'blocked'), report.run?.authMode || '')}
      </div>`,

      historyCats ? `<h2>History categories</h2><div class="grid-sm">${historyCats}</div>` : '',

      `<div class="grid">
        <div class="section"><h2>Top signals</h2>${renderBarList(signalTop)}</div>
        <div class="section"><h2>App versions</h2>${renderBarList(appVersions)}</div>
        <div class="section"><h2>Sacred couples (in logs)</h2>${renderBarList(couples)}</div>
      </div>`,

      `<h2>Signal → fix legend</h2><div class="error-list">${renderSignalLegend()}</div>`,

      `<h2>Recent diagnostics</h2>
       <div class="filter-controls">
         <button class="filter-btn active" data-filter="all">All</button>
         <button class="filter-btn" data-filter="diagnostic">Diagnostic</button>
         <button class="filter-btn" data-filter="crash_report">Crash</button>
         <button class="filter-btn" data-filter="signals">Has signals</button>
       </div>
       <table id="diag-table">
         <thead><tr>
           <th>When</th><th>Log ID</th><th>Type</th><th>App</th><th>Couple</th><th>Signals</th><th>Subject</th>
         </tr></thead>
         <tbody>${tableRows}</tbody>
       </table>
       <script>
       document.querySelectorAll('.filter-btn').forEach(btn=>{
         btn.addEventListener('click',()=>{
           document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
           btn.classList.add('active');
           const f=btn.dataset.filter;
           document.querySelectorAll('#diag-table tbody tr').forEach(tr=>{
             if(f==='all'){ tr.style.display=''; return; }
             if(f==='signals'){ tr.style.display=tr.dataset.signals?'':'none'; return; }
             tr.style.display=tr.dataset.type===f?'':'none';
           });
         });
       });
       </script>`,
    ],
  });

  fs.writeFileSync(OUT, html);
  console.log('[diagnostics-dashboard] HTML:', OUT);
  console.log(`  rows: ${rows.length} | signals: ${withSignals.length} | report: ${REPORT}`);
}

main();
