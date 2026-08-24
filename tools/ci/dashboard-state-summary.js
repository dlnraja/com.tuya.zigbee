#!/usr/bin/env node
'use strict';
// P76.8 / P2240: Dashboard state summary (single app + dual-app report)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state');

function printBuilds(label, j) {
  if (!j) return;
  console.log(`\n--- ${label} ---`);
  console.log('Failed:', j.failed ?? 0);
  console.log('InTest:', j.inTest ?? 0);
  console.log('Drafts:', j.drafts ?? 0);
  (j.latestBuilds || []).slice(0, 10).forEach((b) => {
    const fd = b.failureDetail ? ` (${b.failureDetail})` : '';
    console.log(`  #${b.id} v${b.version} [${b.state}]${fd}`);
  });
}

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const both = loadJson(path.join(STATE, 'dashboard-monitor-both.json'));
if (both?.apps?.length) {
  console.log('Dual-app dashboard report', both.meta?.generatedAt || '');
  console.log(`Master v${both.meta?.masterVersion || '?'} | Stable v${both.meta?.stableVersion || '?'}`);
  for (const app of both.apps) {
    const snap = app.result?.snapshot || loadJson(path.join(STATE, `dashboard-monitor-report-${app.name}.json`));
    const status = app.result?.skipped ? 'skipped' : (app.result?.success ? 'ok' : 'FAIL');
    console.log(`${app.name} (${app.id}): ${status}`);
    printBuilds(app.name, snap);
  }
} else {
  const j = loadJson(path.join(STATE, 'dashboard-monitor-report.json'));
  if (!j) {
    console.log('No dashboard report. Run: node tools/ci/dashboard-both-apps.js');
    process.exit(0);
  }
  printBuilds('current app', j);
}
