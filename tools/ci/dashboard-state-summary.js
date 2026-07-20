#!/usr/bin/env node
// P76.8: Dashboard state summary
const fs = require('fs');
try {
  const j = JSON.parse(fs.readFileSync('.github/state/dashboard-monitor-report.json', 'utf8'));
  console.log('Failed:', j.failed);
  console.log('InTest:', j.inTest);
  console.log('Drafts:', j.drafts);
  console.log('Last 20 builds:');
  (j.latestBuilds || []).slice(0, 20).forEach(b => {
    const fd = b.failureDetail ? ' (' + b.failureDetail + ')' : '';
    console.log(`  #${b.id} v${b.version} [${b.state}]${fd}`);
  });
} catch (e) {
  console.log('No report:', e.message);
}
