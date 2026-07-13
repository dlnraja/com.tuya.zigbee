// R8 — Daily activity digest
// Reads all the state files and produces a concise summary
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = '.github/state';
const files = {
  'activity-snapshot.json': 'GH + forum + email + crash activity',
  'recurrent-orchestrator-report.json': 'Orchestrator run',
  'local-first-engine-predictions.json': 'LFE predictions',
  'autonomous-verification.json': 'Autonomous verification',
  'battery-cartography.json': 'Battery cartography',
  'battery-gaps.json': 'Battery gaps',
  'crash-analysis.json': 'Crash analysis',
  'auto-fix-proposals.json': 'Auto-fix proposals',
  'temporal-monitor-report.json': 'Temporal monitor',
  'driver-confidence-scores.json': 'Driver confidence',
  'sacred-couple-enrichment-report.json': 'Sacred Couples',
  'all-mfr-pid-pairs.json': 'Mfr+pid pairs',
  'z2m-pairs-full.json': 'Z2M pairs',
  'zha-pairs.json': 'ZHA pairs',
  'forum-topics-detailed.json': 'Forum topics',
  'shadow-mode/state.json': 'Shadow mode state',
  'emails-aggregate.json': 'Emails aggregate',
  'ai-budget.json': 'AI budget',
  'variant-matrix.json': 'Variant matrix',
};

const summary = {
  timestamp: new Date().toISOString(),
  files: {},
  insights: [],
};

for (const [f, desc] of Object.entries(files)) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    summary.files[f] = { exists: false, desc };
    continue;
  }
  const stat = fs.statSync(p);
  const sizeKB = Math.round(stat.size / 1024);
  const mtime = stat.mtime.toISOString();
  let counts = null;
  try {
    const c = Buffer.from(fs.readFileSync(p)).toString('utf8');
    const data = JSON.parse(c);
    if (Array.isArray(data)) counts = data.length;
    else if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      counts = keys.length;
    }
  } catch (e) { /* ignore */ }
  summary.files[f] = { exists: true, sizeKB, mtime, counts, desc };
}

// Compute insights
const orchReport = path.join(ROOT, 'recurrent-orchestrator-report.json');
if (fs.existsSync(orchReport)) {
  const r = JSON.parse(Buffer.from(fs.readFileSync(orchReport)).toString('utf8'));
  if (r.summary) {
    summary.insights.push(`Orchestrator: ${r.summary.ok}/${r.summary.totalSteps} steps ok, ${r.summary.totalDuration}ms`);
    if (r.summary.localFirstEngine) {
      const lfe = r.summary.localFirstEngine;
      summary.insights.push(`LFE: ${lfe.predictions} predictions (${JSON.stringify(lfe.bySeverity)})`);
    }
  }
}

const aiBudget = path.join(ROOT, 'ai-budget.json');
if (fs.existsSync(aiBudget)) {
  const b = JSON.parse(Buffer.from(fs.readFileSync(aiBudget)).toString('utf8'));
  if (b && b.budget) {
    const used = b.budget.used || {};
    const total = Object.values(used).reduce((a, b) => a + b, 0);
    summary.insights.push(`AI budget: ${total} calls today`);
  }
}

const shadowState = path.join(ROOT, 'shadow-mode/state.json');
if (fs.existsSync(shadowState)) {
  const s = JSON.parse(Buffer.from(fs.readFileSync(shadowState)).toString('utf8'));
  if (s && s.metrics) {
    summary.insights.push(`Shadow: ${s.metrics.runs} runs, ${s.metrics.bugsFound || 0} bugs found, ${s.metrics.bugsFixed || 0} fixed`);
  }
}

const outputFile = path.join(ROOT, 'daily-digest.json');
fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
console.log('Daily digest:');
for (const [f, info] of Object.entries(summary.files)) {
  if (info.exists) {
    console.log(`  ✓ ${f}  ${info.sizeKB}KB  ${info.counts !== null ? info.counts + ' items' : ''}  (${info.mtime})`);
  } else {
    console.log(`  ✗ ${f}  (missing)`);
  }
}
console.log('');
console.log('Insights:');
for (const i of summary.insights) console.log('  -', i);
