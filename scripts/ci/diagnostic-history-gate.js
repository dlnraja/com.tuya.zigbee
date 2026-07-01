#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const privacy = require('../../.github/scripts/privacy-redactor');

const ROOT = path.resolve(__dirname, '../..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const DIAG_DIR = path.join(ROOT, 'diagnostics');

const JSON_OUTPUT = process.argv.includes('--json');
const STRICT = process.argv.includes('--strict');
const OUTPUT_IDX = process.argv.indexOf('--output');
const OUTPUT_PATH = OUTPUT_IDX !== -1 ? process.argv[OUTPUT_IDX + 1] : null;

const CATEGORY_DEFS = [
  {
    id: 'aggregate_error',
    label: 'AggregateError / empty Zigbee fingerprint arrays',
    severity: 'critical',
    re: /aggregateerror|empty manufacturername|manufacturername arrays?|zigbee initialization/i,
    checks: ['check:button-flows', 'precommit'],
  },
  {
    id: 'processing_failed',
    label: 'Athom processing failed / publish pipeline',
    severity: 'critical',
    re: /processing failed|publish failed|build failed|athom.*build|homey app validate|homey app publish/i,
    checks: ['validate:publish'],
  },
  {
    id: 'button_flow',
    label: 'Button and flow trigger regressions',
    severity: 'high',
    re: /button|remote_button|virtual_button|button\.push|flow card|trigger card|flow trigger/i,
    checks: ['check:button-flows'],
  },
  {
    id: 'battery_unknown',
    label: 'Battery value missing or unknown',
    severity: 'high',
    re: /battery|measure_battery|alarm_battery|powerconfiguration|question mark|\?\?|unknown battery/i,
    checks: ['precommit'],
  },
  {
    id: 'runtime_crash',
    label: 'Runtime crash / exception',
    severity: 'high',
    re: /crash|uncaught|typeerror|cannot read|unhandled|heap|oom|allocation failed/i,
    checks: ['check:timer-context'],
  },
  {
    id: 'security_privacy',
    label: 'Security or privacy signal',
    severity: 'critical',
    re: /token|secret|password|local[_ -]?key|privacy|leak/i,
    checks: ['security:diagnostics'],
  },
];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function readText(file) {
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  privacy.assertNoLeaks(raw, rel(file));
  return raw;
}

function readJson(file) {
  const raw = readText(file);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function npmScripts() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
  } catch {
    return {};
  }
}

function normalizeError(value) {
  return privacy.redact(String(value || '').replace(/\s+/g, ' ').trim()).substring(0, 180);
}

function textFor(entry) {
  return [
    entry.type,
    entry.subj,
    entry.subject,
    entry.error,
    entry.message,
    entry.crashInfo && entry.crashInfo.crashApp,
    Array.isArray(entry.errs) ? entry.errs.join(' ') : '',
    entry.crashInfo && Array.isArray(entry.crashInfo.stackTraces) ? entry.crashInfo.stackTraces.join(' ') : '',
  ].filter(Boolean).join(' ');
}

function entriesFromSources(sources) {
  const entries = [];
  if (sources.gmailReport && Array.isArray(sources.gmailReport.diagnostics)) {
    entries.push(...sources.gmailReport.diagnostics.map(e => ({ ...e, source: 'gmail' })));
  }
  if (sources.aggregateSummary && Array.isArray(sources.aggregateSummary.reports)) {
    entries.push(...sources.aggregateSummary.reports.map(e => ({ ...e, source: 'aggregate' })));
  }
  if (sources.aggregateSummary && Array.isArray(sources.aggregateSummary.errors)) {
    entries.push(...sources.aggregateSummary.errors.map(e => ({ type: 'aggregate_error', error: e, source: 'aggregate' })));
  }
  return entries;
}

function analyze(entries, scripts) {
  const categories = new Map();
  const checks = new Map();
  const errors = new Map();
  const latest = [];

  for (const entry of entries) {
    const text = textFor(entry);
    const matched = [];
    for (const def of CATEGORY_DEFS) {
      if (!def.re.test(text)) continue;
      matched.push(def.id);
      if (!categories.has(def.id)) {
        categories.set(def.id, {
          id: def.id,
          label: def.label,
          severity: def.severity,
          count: 0,
          checks: def.checks || [],
        });
      }
      categories.get(def.id).count++;
      for (const check of def.checks || []) checks.set(`npm run ${check}`, (checks.get(`npm run ${check}`) || 0) + 1);
    }

    const entryErrors = Array.isArray(entry.errs) ? entry.errs : [entry.error || entry.message].filter(Boolean);
    for (const err of entryErrors) {
      const normalized = normalizeError(err);
      if (normalized) errors.set(normalized, (errors.get(normalized) || 0) + 1);
    }
    if (matched.length) {
      latest.push({
        date: entry.date || entry.timestamp || 'unknown',
        source: entry.source || 'unknown',
        type: entry.type || 'unknown',
        subj: privacy.redact(entry.subj || entry.subject || ''),
        categories: matched,
      });
    }
  }

  const missingGuardrails = [];
  for (const category of categories.values()) {
    for (const script of category.checks) {
      if (!scripts[script]) missingGuardrails.push({ category: category.id, script });
    }
  }

  const severityWeight = { critical: 12, high: 7, medium: 4, low: 1 };
  let score = 100;
  for (const category of categories.values()) {
    score -= Math.min(35, category.count * (severityWeight[category.severity] || 3));
  }
  score -= missingGuardrails.length * 10;
  score = Math.max(0, score);

  return {
    diagnosticsAnalyzed: entries.length,
    score,
    status: score >= 80 ? 'healthy' : score >= 50 ? 'needs_attention' : 'critical',
    categories: [...categories.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    recommendedChecks: [...checks.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([command, weight]) => ({ command, weight })),
    topErrors: [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
      .map(([error, count]) => ({ error, count })),
    latestEvents: latest.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 25),
    missingGuardrails,
  };
}

function main() {
  const sources = {
    gmailReport: readJson(path.join(STATE_DIR, 'diagnostics-report.json')),
    aggregateSummary: readJson(path.join(DIAG_DIR, 'summary.json')),
    crossrefYamlPresent: !!readText(path.join(STATE_DIR, 'diagnostics-crossref.yml')),
  };
  const entries = entriesFromSources(sources);
  const report = privacy.redactObject({
    timestamp: new Date().toISOString(),
    sourceFiles: {
      gmailReport: !!sources.gmailReport,
      aggregateSummary: !!sources.aggregateSummary,
      crossrefYaml: sources.crossrefYamlPresent,
    },
    ...analyze(entries, npmScripts()),
    verdict: entries.length
      ? 'historical diagnostics analyzed; use recommended checks to reproduce and prevent regressions'
      : 'no sanitized diagnostic history found; privacy gate still passed',
  });
  privacy.assertNoLeaks(report, 'diagnostic-history-gate report');

  if (OUTPUT_PATH) {
    const out = path.resolve(ROOT, OUTPUT_PATH);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  }

  if (JSON_OUTPUT) console.log(JSON.stringify(report, null, 2));
  else console.log(`Diagnostic history: ${report.diagnosticsAnalyzed} entries, score ${report.score}/100 (${report.status})`);

  if (STRICT && report.missingGuardrails.length) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
