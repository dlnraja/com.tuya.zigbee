#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

const FP_RE = /_T[A-Z0-9]+_[a-z0-9]+/gi;

function gh(endpoint) {
  try {
    return execSync(`gh api "${endpoint}"`, { encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: '' } });
  } catch { return '[]'; }
}

const johanIssues = [1408,1366,1354,1355,1359,1360,1363,1364,1365,1367,1368,1370,1371,1373,1374,1375,1376,1377,1379,1380,1381,1382,1383,1384,1388,1389,1390,1391,1392,1393,1394,1395,1396,1397,1398,1400,1401,1208,1404];
const johanPRs = [1406,1372,1350,1346,1332,1292,1253,1237,1231,1230,1221,1220,1219,1218,1210,1209,1195,1194,1171,1303];

const allFPs = new Map();

function extract(txt, src) {
  if (!txt) return;
  const ms = txt.match(FP_RE) || [];
  for (const m of ms) {
    const k = m.toLowerCase();
    if (!allFPs.has(k)) allFPs.set(k, { fp: m, src });
  }
}

console.log('=== Scanning Johan Issues ===');
for (const n of johanIssues) {
  try {
    const d = JSON.parse(gh(`/repos/JohanBendz/com.tuya.zigbee/issues/${n}`));
    extract((d.title || '') + ' ' + (d.body || ''), `johan-issue-${n}`);
    process.stdout.write('.');
  } catch { process.stdout.write('x'); }
}
console.log('');

console.log('=== Scanning Johan PRs ===');
for (const n of johanPRs) {
  try {
    const d = JSON.parse(gh(`/repos/JohanBendz/com.tuya.zigbee/pulls/${n}`));
    extract((d.title || '') + ' ' + (d.body || ''), `johan-pr-${n}`);
    const files = JSON.parse(gh(`/repos/JohanBendz/com.tuya.zigbee/pulls/${n}/files`));
    for (const f of files) extract(f.patch || '', `johan-pr-${n}-diff`);
    process.stdout.write('.');
  } catch { process.stdout.write('x'); }
}
console.log('');

// 2) Cross-reference with our codebase
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const exist = new Set();
for (const d of app.drivers) {
  if (d.zigbee && d.zigbee.manufacturerName)
    for (const m of d.zigbee.manufacturerName) exist.add(m.toLowerCase());
}

const newFPs = [];
for (const [k, v] of allFPs) {
  if (!exist.has(k)) newFPs.push(v);
}

console.log(`\nTotal unique FPs: ${allFPs.size}`);
console.log(`Known: ${allFPs.size - newFPs.length}`);
console.log(`NEW: ${newFPs.length}`);
console.log('\n--- New FPs Not In Our Codebase ---');
newFPs.forEach(f => console.log(`  ${f.fp} from ${f.src}`));

// Save
fs.writeFileSync('.github/state/johan-community-extract.json', JSON.stringify({
  ts: new Date().toISOString(), total: allFPs.size, known: allFPs.size - newFPs.length,
  new: newFPs.length, newFPs: newFPs.map(f => ({ fp: f.fp, src: f.src }))
}, null, 2));
console.log('\nReport saved to .github/state/johan-community-extract.json');
