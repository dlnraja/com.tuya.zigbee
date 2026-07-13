// analyze-all-builds.js — full analysis
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

// Combine working + test + failedOnly
const all = [
  ...(dash.workingVersions || []).map(v => ({ ...v, state: 'working' })),
  ...(dash.testVersions || []).map(v => ({ ...v, state: 'test' })),
  ...(dash.failedOnlyVersions || []).map(v => ({ ...v, state: 'failed' }))
];

// Sort by ID desc
all.sort((a, b) => (b.id || 0) - (a.id || 0));

console.log('Total unique builds:', all.length);
console.log('Working:', dash.workingVersions?.length);
console.log('Test:', dash.testVersions?.length);
console.log('Failed only:', dash.failedOnlyVersions?.length);

// Last 30 builds with all states
console.log('\n=== LAST 30 BUILDS (with states) ===');
for (const b of all.slice(0, 30)) {
  const icon = b.state === 'failed' ? '❌' : b.state === 'test' ? '🧪' : b.state === 'working' ? '✅' : '⏳';
  console.log('  ' + icon + ' #' + b.id + ' v' + b.version + ' [' + b.state + '] | ' + (b.createdAt?.substring(0,16) || '') + ' | ' + (b.failureDetail?.substring(0,80) || ''));
}

// Last 30 failed
const failed = all.filter(b => b.state === 'failed');
console.log('\n=== LAST 30 FAILED BUILDS ===');
for (const f of failed.slice(0, 30)) {
  console.log('  ❌ #' + f.id + ' v' + f.version + ' | ' + (f.createdAt?.substring(0,16) || '') + ' | ' + (f.failureDetail?.substring(0,150) || 'no detail'));
}

// Find most recent failure
const mostRecentFail = failed[0];
console.log('\n=== MOST RECENT FAILURE ===');
console.log(JSON.stringify(mostRecentFail, null, 2).substring(0, 1000));

// Save
const summary = {
  meta: { generatedAt: new Date().toISOString() },
  totalBuilds: all.length,
  counts: { working: dash.workingVersions?.length, test: dash.testVersions?.length, failed: dash.failedOnlyVersions?.length },
  last30Failed: failed.slice(0, 30).map(f => ({ id: f.id, version: f.version, createdAt: f.createdAt, failureDetail: f.failureDetail })),
  mostRecentFailure: mostRecentFail,
  failurePatterns: dash.failurePatterns
};
fs.writeFileSync('.github/state/build-failures-full.json', JSON.stringify(summary, null, 2));
console.log('\nSaved to .github/state/build-failures-full.json');
