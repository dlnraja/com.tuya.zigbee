#!/usr/bin/env node
/**
 * issue-content-analyzer.js
 * Analyzes GitHub issues and PRs including:
 * - Body text (manufacturer IDs, diagnostic IDs, error patterns)
 * - Images (extracts URLs, detects device screenshots)
 * - Comments/discussions (user feedback, follow-up reports)
 * - Labels and milestones
 *
 * Per GLOBAL_INVESTIGATION_PLAN.md §8 (Forum & GitHub Investigation Protocol)
 *
 * Usage: node scripts/automation/issue-content-analyzer.js [--repo owner/repo] [--state open]
 * Output: .github/state/issue-analysis-report.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_FILE = path.join(STATE_DIR, 'issue-analysis-report.json');

// Parse args
const repoArg = process.argv.find(a => a.startsWith('--repo'));
const repo = repoArg ? process.argv[process.argv.indexOf(repoArg) + 1] : 'dlnraja/com.tuya.zigbee';
const stateArg = process.argv.find(a => a.startsWith('--state'));
const state = stateArg ? process.argv[process.argv.indexOf(stateArg) + 1] : 'open';

function ghJSON(cmd) {
  try { return JSON.parse(execSync(cmd, { encoding: 'utf8', timeout: 30000 })); }
  catch { return []; }
}

// ─── Fetch Issues ───
console.log(`Fetching ${state} issues from ${repo}...`);
const issues = ghJSON(`gh issue list --repo ${repo} --state ${state} --limit 50 --json number,title,body,labels,comments,createdAt,author`);

const analysis = [];

for (const issue of issues) {
  const body = issue.body || '';
  const a = {
    number: issue.number,
    title: issue.title,
    author: issue.author?.login || 'unknown',
    labels: (issue.labels || []).map(l => l.name),
    comments: issue.comments || 0,
    createdAt: issue.createdAt,
    // Extracted data
    manufacturerIds: [...new Set((body.match(/_[A-Z0-9]{6,}/gi) || []))],
    productIds: [...new Set(body.match(/TS[0-9]{4}[A-Z]?/g) || [])],
    diagnosticIds: [...new Set(body.match(/[a-f0-9]{8,}/g) || [])],
    images: [...new Set(body.match(/https:\/\/github\.com\/user-attachments\/assets\/[a-f0-9-]+/g) || [])],
    errorPatterns: [],
    deviceTypes: [],
    hasImage: /!\[.*\]\(https:\/\/github\.com\/user-attachments/.test(body),
    hasDiagnostic: /\b[a-f0-9]{16,}\b/.test(body) || /crash|diag|error|stack|trace/i.test(body),
    bodyLength: body.length,
    bodyPreview: body.substring(0, 300),
  };

  // Detect error patterns
  const ERROR_RX = [
    { rx: /ReferenceError/i, type: 'ReferenceError' },
    { rx: /TypeError/i, type: 'TypeError' },
    { rx: /AggregateError/i, type: 'AggregateError' },
    { rx: /MODULE_NOT_FOUND/i, type: 'MODULE_NOT_FOUND' },
    { rx: /OOM|heap limit|Allocation failed/i, type: 'OOM' },
    { rx: /SyntaxError/i, type: 'SyntaxError' },
    { rx: /crash/i, type: 'crash' },
    { rx: /freeze|hang|stuck/i, type: 'hang' },
    { rx: /battery.*wrong|battery.*stuck/i, type: 'battery_issue' },
    { rx: /temperature.*wrong|temp.*null/i, type: 'temp_issue' },
    { rx: /humidity.*wrong|moisture.*stuck/i, type: 'humidity_issue' },
    { rx: /power.*wrong|energy.*crazy/i, type: 'power_issue' },
  ];
  for (const { rx, type } of ERROR_RX) {
    if (rx.test(body)) a.errorPatterns.push(type);
  }

  // Detect device types from manufacturer IDs
  const MFR_DEVICE_MAP = {
    '_TZE200_npj9bug3': 'soil_sensor', '_TZE284_aao3yzhs': 'soil_sensor',
    '_TZE284_oitavov2': 'soil_sensor', '_TZE284_hdml1aav': 'soil_sensor',
    '_TZE200_u6x1zyv2': 'rain_sensor', '_TZE200_jsaqgakf': 'rain_sensor',
    '_TZE200_ka8l86iu': 'presence_sensor_radar',
    '_TZE200_seq9cm6u': 'bed_sensor',
    '_TZE200_8ygsuhe1': 'air_quality_sensor',
  };
  for (const mfr of a.manufacturerIds) {
    if (MFR_DEVICE_MAP[mfr]) a.deviceTypes.push(MFR_DEVICE_MAP[mfr]);
  }
  a.deviceTypes = [...new Set(a.deviceTypes)];

  analysis.push(a);
}

// ─── Fetch Comments for each issue ───
console.log(`Fetching comments for ${analysis.length} issues...`);
for (const a of analysis) {
  if (a.comments === 0) continue;
  const comments = ghJSON(`gh issue view ${a.number} --repo ${repo} --json comments -q '.comments[].body' 2>/dev/null`);
  if (Array.isArray(comments)) {
    a.commentTexts = comments.map(c => c.substring(0, 200));
    // Extract additional manufacturer IDs from comments
    for (const c of comments) {
      const mfrs = (c.match(/_[A-Z0-9]{6,}/gi) || []);
      mfrs.forEach(m => { if (!a.manufacturerIds.includes(m)) a.manufacturerIds.push(m); });
    }
  }
}

// ─── Summary ───
const summary = {
  timestamp: new Date().toISOString(),
  repo,
  state,
  totalIssues: analysis.length,
  withImages: analysis.filter(a => a.hasImage).length,
  withDiagnostics: analysis.filter(a => a.hasDiagnostic).length,
  withErrorPatterns: analysis.filter(a => a.errorPatterns.length > 0).length,
  uniqueManufacturerIds: [...new Set(analysis.flatMap(a => a.manufacturerIds))],
  uniqueDeviceTypes: [...new Set(analysis.flatMap(a => a.deviceTypes))],
  issues: analysis,
};

fs.mkdirSync(STATE_DIR, { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(summary, null, 2));

console.log(`\n=== Issue Analysis Report ===`);
console.log(`Total issues: ${summary.totalIssues}`);
console.log(`With images: ${summary.withImages}`);
console.log(`With diagnostics: ${summary.withDiagnostics}`);
console.log(`With error patterns: ${summary.withErrorPatterns}`);
console.log(`Unique MFR IDs: ${summary.uniqueManufacturerIds.length}`);
console.log(`Unique device types: ${summary.uniqueDeviceTypes.join(', ')}`);
console.log(`\nReport saved to: ${REPORT_FILE}`);
