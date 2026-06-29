#!/usr/bin/env node
'use strict';

/*
 * Diagnostic history gate.
 *
 * Turns sanitized Gmail/Homey diagnostic artifacts into CI-ready signals:
 * recurring crash categories, top error signatures, recommended local checks,
 * and missing guardrails. Historical user reports are evidence, not automatic
 * blockers; privacy leaks and missing mandatory guardrails are.
 */

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
    checks: ['validate:mfr-empty', 'check:athom', 'precommit:full'],
  },
  {
    id: 'processing_failed',
    label: 'Athom processing failed / publish pipeline',
    severity: 'critical',
    re: /processing failed|publish failed|build failed|athom.*build|homey app validate|homey app publish/i,
    checks: ['check:yaml', 'validate:publish', 'diag:build'],
  },
  {
    id: 'missing_capability_listener',
    label: 'Missing capability listener / SDK3 capability contract',
    severity: 'high',
    re: /missing capability listener|capability listener|setable|settable/i,
    checks: ['check:flows', 'check:voice', 'precommit:full'],
  },
  {
    id: 'button_flow',
    label: 'Button and flow trigger regressions',
    severity: 'high',
    re: /button|remote_button|virtual_button|button\.push|flow card|trigger card|flow trigger/i,
    checks: ['check:flows'],
    nodeChecks: ['scripts/automation/audit-flowcards.js'],
  },
  {
    id: 'battery_unknown',
    label: 'Battery value missing or unknown',
    severity: 'high',
    re: /battery|measure_battery|alarm_battery|powerconfiguration|question mark|\?\?|unknown battery/i,
    checks: ['precommit:full'],
    nodeChecks: ['scripts/ci/bug-hunter.js', 'scripts/automation/validate-drivers.js'],
  },
  {
    id: 'runtime_crash',
    label: 'Runtime crash / exception',
    severity: 'high',
    re: /crash|uncaught|typeerror|cannot read|unhandled|heap|oom|allocation failed/i,
    checks: ['check:timer-context'],
    nodeChecks: ['scripts/ci/bug-hunter.js'],
  },
  {
    id: 'security_privacy',
    label: 'Security or privacy signal',
    severity: 'critical',
    re: /token|secret|password|local[_ -]?key|privacy|leak/i,
    checks: ['security:diagnostics', 'security-scan'],
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
  const gmail = sources.gmailReport;
  if (gmail && Array.isArray(gmail.diagnostics)) entries.push(...gmail.diagnostics.map(e => ({ ...e, source: 'gmail' })));

  const aggregate = sources.aggregateSummary;
  if (aggregate && Array.isArray(aggregate.reports)) {
    entries.push(...aggregate.reports.map(e => ({ ...e, source: 'aggregate' })));
  }
  if (aggregate && Array.isArray(aggregate.errors)) {
    entries.push(...aggregate.errors.map(e => ({ type: 'aggregate_error', error: e, source: 'aggregate' })));
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
          nodeChecks: def.nodeChecks || [],
        });
      }
      categories.get(def.id).count++;
      for (const check of def.checks || []) checks.set(`npm run ${check}`, (checks.get(`npm run ${check}`) || 0) + 1);
      for (const check of def.nodeChecks || []) checks.set(`node ${check} --json`, (checks.get(`node ${check} --json`) || 0) + 1);
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
    for (const nodeCheck of category.nodeChecks) {
      if (!fs.existsSync(path.join(ROOT, nodeCheck))) missingGuardrails.push({ category: category.id, file: nodeCheck });
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

function appendSummary(report) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  let md = '## Diagnostic History Gate\n';
  md += `Score: ${report.score}/100 | Status: ${report.status} | Diagnostics: ${report.diagnosticsAnalyzed}\n\n`;
  if (report.categories.length) {
    md += '### Categories\n';
    md += report.categories.slice(0, 8).map(c => `- ${c.label}: ${c.count} (${c.severity})`).join('\n') + '\n\n';
  }
  if (report.recommendedChecks.length) {
    md += '### Recommended Checks\n';
    md += report.recommendedChecks.slice(0, 8).map(c => `- \`${c.command}\``).join('\n') + '\n\n';
  }
  if (report.missingGuardrails.length) {
    md += '### Missing Guardrails\n';
    md += report.missingGuardrails.map(g => `- ${g.category}: ${g.script || g.file}`).join('\n') + '\n';
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

function main() {
  const sources = {
    gmailReport: readJson(path.join(STATE_DIR, 'diagnostics-report.json')),
    aggregateSummary: readJson(path.join(DIAG_DIR, 'summary.json')),
    crossrefYamlPresent: !!readText(path.join(STATE_DIR, 'diagnostics-crossref.yml')),
  };
  const scripts = npmScripts();
  const entries = entriesFromSources(sources);
  const analysis = analyze(entries, scripts);
  const report = privacy.redactObject({
    timestamp: new Date().toISOString(),
    sourceFiles: {
      gmailReport: !!sources.gmailReport,
      aggregateSummary: !!sources.aggregateSummary,
      crossrefYaml: sources.crossrefYamlPresent,
    },
    ...analysis,
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
  appendSummary(report);

  if (JSON_OUTPUT) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Diagnostic history: ${report.diagnosticsAnalyzed} entries, score ${report.score}/100 (${report.status})`);
    for (const c of report.categories.slice(0, 10)) console.log(`- ${c.label}: ${c.count} (${c.severity})`);
    if (report.recommendedChecks.length) {
      console.log('Recommended checks:');
      for (const c of report.recommendedChecks.slice(0, 10)) console.log(`- ${c.command}`);
    }
  }

  if (STRICT && report.missingGuardrails.length) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
