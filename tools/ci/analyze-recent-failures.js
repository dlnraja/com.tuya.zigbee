// analyze-recent-failures.js — look at recent failed builds
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

console.log('=== RECENT FAILED BUILDS (from versionHistory) ===');
const failed = (dash.versionHistory || []).filter(v => v.state === 'failed');
console.log('Total failed:', failed.length);

const recent = failed.slice(0, 20);
for (const f of recent) {
  console.log('  #' + f.id + ' v' + f.version + ' | ' + (f.createdAt?.substring(0,16) || '') + ' | ' + (f.failureDetail?.substring(0,80) || 'no detail'));
}

// Top 10 versions with most failures
console.log('\n=== TOP FAILURE PATTERNS ===');
for (let i = 0; i < dash.failurePatterns.length; i++) {
  const p = dash.failurePatterns[i];
  if (p.count >= 3) {
    console.log((i+1) + '. ' + p.count + 'x: ' + (p.detail?.substring(0,150) || 'no detail') + ' (latest: v' + p.latestVersion + ' #' + p.latestBuildId + ' at ' + (p.latestAt?.substring(0,16) || '') + ')');
  }
}

// Recent failed - last 5
console.log('\n=== LAST 5 FAILED BUILDS (with full details) ===');
for (const f of failed.slice(0, 5)) {
  console.log('\n--- #' + f.id + ' v' + f.version + ' ---');
  console.log('  Created:', f.createdAt);
  console.log('  Detail:', f.failureDetail?.substring(0, 500));
}
