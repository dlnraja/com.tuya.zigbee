// analyze-failures.js — deep analysis of build failures
const fs = require('fs');
const path = require('path');
const base = '.github/state/all-diagnostics-2026-07-13/'.replace(/\//g, path.sep);

function findFile(dir, name) {
  function walk(d) {
    if (!fs.existsSync(d)) return null;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { const r = walk(p); if (r) return r; }
      else if (e.name === name) return p;
    }
    return null;
  }
  return walk(dir);
}

const dashFile = findFile(base, 'dashboard-monitor-report.json');
const dash = JSON.parse(fs.readFileSync(dashFile, 'utf8'));

console.log('=== SUMMARY ===');
console.log('Total builds:', dash.totalBuilds);
console.log('Successful:', dash.successful);
console.log('Failed:', dash.failed);
console.log('Drafts:', dash.drafts);
console.log('In test:', dash.inTest);
console.log('Success rate:', dash.successRate);
console.log('Recent window:', dash.recentWindow);
console.log('Recent failed count:', dash.recentFailedCount);

console.log('\n=== CURRENT STATUS ===');
console.log(JSON.stringify(dash.currentStatus, null, 2));

console.log('\n=== FAILURE PATTERNS (10) ===');
for (const [i, p] of dash.failurePatterns.entries()) {
  console.log('\n--- Pattern ' + (i+1) + ' ---');
  console.log(JSON.stringify(p, null, 2).substring(0, 600));
}

console.log('\n=== LATEST FAILED BUILD ===');
console.log(JSON.stringify(dash.latestFailedBuild, null, 2));

console.log('\n=== LATEST GOOD BUILD ===');
console.log(JSON.stringify(dash.latestGoodBuild, null, 2));

console.log('\n=== VERSION TOTALS ===');
console.log(JSON.stringify(dash.versionTotals, null, 2));

// Find the recent failed builds
const recentFails = (dash.versionHistory || []).filter(v => v.state === 'failed').slice(0, 10);
console.log('\n=== RECENT FAILED BUILDS (10) ===');
for (const f of recentFails) {
  console.log('  #' + f.id + ' v' + f.version + ' ' + (f.createdAt?.substring(0,16) || '') + ' | ' + (f.failureDetail || 'no detail'));
}

// Last 20 working versions
const working = (dash.workingVersions || []).slice(0, 20);
console.log('\n=== LAST 20 WORKING VERSIONS ===');
for (const w of working) {
  console.log('  #' + (w.id || '?') + ' v' + (w.version || '?') + ' | ' + (w.createdAt?.substring(0,16) || ''));
}

// Save summary
const summary = {
  meta: { generatedAt: new Date().toISOString() },
  totals: {
    totalBuilds: dash.totalBuilds,
    successful: dash.successful,
    failed: dash.failed,
    drafts: dash.drafts,
    inTest: dash.inTest,
    successRate: dash.successRate,
    recentWindow: dash.recentWindow,
    recentFailedCount: dash.recentFailedCount
  },
  currentStatus: dash.currentStatus,
  failurePatterns: dash.failurePatterns,
  latestFailedBuild: dash.latestFailedBuild,
  latestGoodBuild: dash.latestGoodBuild,
  recentFailed: recentFails,
  lastWorkingVersions: working
};
fs.writeFileSync('.github/state/dashboard-analysis.json', JSON.stringify(summary, null, 2));
console.log('\nSaved to .github/state/dashboard-analysis.json');
