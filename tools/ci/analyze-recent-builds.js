// analyze-recent-builds.js
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

console.log('=== ALL RECENT BUILDS (last 100) ===');
const recent = (dash.versionHistory || []).slice(0, 100);
const states = {};
for (const b of recent) states[b.state] = (states[b.state] || 0) + 1;
console.log('States:', states);

// Get all recent failed
const failed = recent.filter(b => b.state === 'failed');
console.log('\nFailed in last 100:', failed.length);
console.log('\nRecent failed builds:');
for (const f of failed.slice(0, 30)) {
  console.log('  #' + f.id + ' v' + f.version + ' | ' + (f.createdAt?.substring(0,16) || '') + ' | ' + (f.failureDetail?.substring(0, 100) || ''));
}

// All builds sorted by date - look at the last 30
const all = (dash.versionHistory || []).slice(0, 30);
console.log('\n=== LAST 30 BUILDS ===');
for (const b of all) {
  const icon = b.state === 'failed' ? '❌' : b.state === 'test' ? '🧪' : b.state === 'live' || b.state === 'published' ? '✅' : '⏳';
  console.log('  ' + icon + ' #' + b.id + ' v' + b.version + ' [' + b.state + '] | ' + (b.createdAt?.substring(0,16) || ''));
}

// Save the data
const summary = {
  meta: { generatedAt: new Date().toISOString() },
  totalBuilds: dash.totalBuilds,
  recentWindow: dash.recentWindow,
  recentFailedCount: dash.recentFailedCount,
  recentStates: states,
  recentFailed: failed.slice(0, 30).map(f => ({ id: f.id, version: f.version, createdAt: f.createdAt, state: f.state, failureDetail: f.failureDetail })),
  last30Builds: all.map(b => ({ id: b.id, version: b.version, state: b.state, createdAt: b.createdAt }))
};
fs.writeFileSync('.github/state/recent-builds-summary.json', JSON.stringify(summary, null, 2));
console.log('\nSaved to .github/state/recent-builds-summary.json');
