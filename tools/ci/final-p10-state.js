#!/usr/bin/env node
// final-p10-state.js
const fs = require('fs');
const path = require('path');

console.log('=== P10 FINAL STATE ===\n');

// 1. Johan audit
const report = JSON.parse(fs.readFileSync('.github/state/johan-references-audit.json', 'utf8'));
console.log('1. JOHAN AUDIT:');
console.log('   Issues (forbidden writes):', report.summary.issues);
console.log('   Warnings (legit references):', report.summary.warnings);
console.log('   Info (allow-listed):', report.summary.info);
if (report.summary.issues > 0) {
  console.log('   ❌ FAIL: ' + report.summary.issues + ' forbidden writes to Johan');
  for (const i of report.issues.slice(0, 5)) {
    console.log('     - ' + i.file + ':' + i.line);
  }
} else {
  console.log('   ✓ PASS: no writes to Johan');
}

// 2. Workflows
const wf = '.github/workflows';
const active = fs.readdirSync(wf).filter(f => (f.endsWith('.yml') || f.endsWith('.yaml')) && !f.startsWith('.'));
const archive = fs.readdirSync(path.join(wf, 'archive')).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
console.log('\n2. WORKFLOWS:');
console.log('   Active:', active.length);
console.log('   Archive (preserved):', archive.length);
console.log('   New in P10:');
for (const f of active) {
  if (f.includes('continuous-flow') || f.includes('e2e-dashboard') || f.includes('upstream-guard')) {
    console.log('     ✓ ' + f);
  }
}

// 3. Cron local
console.log('\n3. CRON LOCAL (Mavis):');
console.log('   shadow-mode-runner: every 6h, free, 0 GH minutes');

// 4. P10 tools
const p10Tools = [
  'tools/ci/audit-johan-references.js',
  'tools/ci/check-writes.js',
  'tools/ci/archive-disabled.js',
  'tools/ci/validate-all-workflows.js',
  'tools/ci/final-p10-state.js',
];
console.log('\n4. P10 TOOLS:');
for (const t of p10Tools) {
  const exists = fs.existsSync(t);
  console.log('   ' + (exists ? '✓' : '✗') + ' ' + t);
}

// 5. Reports
const reports = [
  '.github/state/johan-references-audit.json',
  '.github/state/workflow-consolidation-report.json',
  'docs/P9_WORKFLOW_CONSOLIDATION_2026-07-12.md',
  'docs/P10_SECURITY_AUTOMATION_2026-07-12.md',
];
console.log('\n5. REPORTS:');
for (const r of reports) {
  const exists = fs.existsSync(r);
  console.log('   ' + (exists ? '✓' : '✗') + ' ' + r);
}
