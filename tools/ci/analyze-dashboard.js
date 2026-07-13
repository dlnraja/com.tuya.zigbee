// analyze-dashboard.js — analyze the build dashboard data
const fs = require('fs');
const path = require('path');
const base = '.github/state/all-diagnostics-2026-07-13/'.replace(/\//g, path.sep);

// Find dashboard file
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
const verFile = findFile(base, 'version-intelligence-report.json');

console.log('Dashboard file:', dashFile);
console.log('Version file:', verFile);

const dash = JSON.parse(fs.readFileSync(dashFile, 'utf8'));
console.log('\n=== DASHBOARD REPORT TOP KEYS ===');
for (const k of Object.keys(dash)) {
  const v = dash[k];
  console.log('  ' + k + ':', typeof v, Array.isArray(v) ? '[' + v.length + ']' : (typeof v === 'object' && v ? '{' + Object.keys(v).length + '}' : ''));
}

// Show build history
if (dash.latestBuild) {
  console.log('\n=== LATEST BUILD ===');
  console.log(JSON.stringify(dash.latestBuild, null, 2).substring(0, 1500));
}
if (dash.latestBuilds) {
  console.log('\n=== LATEST BUILDS ===');
  console.log('Total:', Array.isArray(dash.latestBuilds) ? dash.latestBuilds.length : 'object');
  if (Array.isArray(dash.latestBuilds) && dash.latestBuilds.length) {
    console.log('Sample:', JSON.stringify(dash.latestBuilds.slice(0, 3), null, 2).substring(0, 1500));
  }
}
if (dash.failed && Array.isArray(dash.failed)) {
  console.log('\n=== FAILED BUILDS ===');
  console.log('Total failed:', dash.failed.length);
  if (dash.failed.length) {
    console.log('First 3 failed:');
    for (const f of dash.failed.slice(0, 3)) {
      console.log(JSON.stringify(f, null, 2).substring(0, 800));
    }
  }
}
if (dash.totalBuilds) console.log('\n=== TOTAL BUILDS: ' + dash.totalBuilds + ' ===');
if (dash.successful) console.log('Successful: ' + dash.successful);
if (dash.drafts) console.log('Drafts: ' + dash.drafts);
if (dash.inTest) console.log('In test: ' + dash.inTest);

// Version intelligence
if (verFile) {
  const ver = JSON.parse(fs.readFileSync(verFile, 'utf8'));
  console.log('\n=== VERSION INTELLIGENCE ===');
  console.log('App:', JSON.stringify(ver.app));
  console.log('Commits total:', ver.commits?.total);
  if (ver.dashboard) {
    console.log('Dashboard keys:', Object.keys(ver.dashboard).slice(0, 20));
  }
  if (ver.latestByCategory) {
    console.log('\nLatest by category:');
    for (const [k, v] of Object.entries(ver.latestByCategory).slice(0, 10)) {
      console.log('  ' + k + ':', JSON.stringify(v).substring(0, 200));
    }
  }
}
