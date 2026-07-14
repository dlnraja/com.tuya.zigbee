#!/usr/bin/env node
/**
 * daily-knowledge-sync.js — P56 Daily Knowledge Graph Sync
 *
 * Runs daily (off-peak) to:
 *   1. Rebuild the knowledge graph (incremental, fast — ~10s for 685 docs)
 *   2. Run a set of "smart investigations" on hot topics
 *   3. Detect new entities (drivers, lessons, fixes) since last build
 *   4. Save a daily report to .github/state/knowledge-graph-history/
 *
 * This is the autonomous investigation enhancer the user asked for:
 *   "il faut aussi croiser un max d'infos ... et aider de tout ca pour
 *    améliorer les investigations autonomes"
 *
 * Usage:
 *   node tools/ci/daily-knowledge-sync.js
 *   node tools/ci/daily-knowledge-sync.js --quick
 *   node tools/ci/daily-knowledge-sync.js --full
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(REPO, '.github', 'state');
const KG_FILE = path.join(STATE_DIR, 'knowledge-graph.json');
const HISTORY_DIR = path.join(STATE_DIR, 'knowledge-graph-history');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const FULL = args.includes('--full');

function git(args, cwd = REPO) {
  return execFileSync('C:\\Program Files\\Git\\cmd\\git.exe', args, { cwd, encoding: 'utf8' }).toString();
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

console.log('=== DAILY KNOWLEDGE GRAPH SYNC (P56) ===\n');
console.log(`Mode: ${FULL ? 'full' : (QUICK ? 'quick' : 'normal')}`);
console.log(`Time: ${new Date().toISOString()}\n`);

// 1. Rebuild the knowledge graph
console.log('[1/4] Rebuilding knowledge graph...');
const t0 = Date.now();
try {
  execFileSync('node', ['tools/ci/build-knowledge-graph.js', '--stats'], { cwd: REPO, stdio: 'pipe' });
  console.log(`  Built in ${Date.now() - t0}ms\n`);
} catch (e) {
  console.error('  FAILED:', e.message);
  process.exit(1);
}

// Load the new KG
const kg = JSON.parse(fs.readFileSync(KG_FILE, 'utf8'));
console.log(`  Entities: ${kg.meta.totalEntities}`);
console.log(`  Relations: ${kg.meta.totalRelations}`);
console.log(`  Docs scanned: ${kg.meta.totalDocsScanned}`);
console.log('');

// 2. Compare with previous (detect new entities)
console.log('[2/4] Detecting new entities since last sync...');
ensureDir(HISTORY_DIR);
const histFiles = fs.readdirSync(HISTORY_DIR).filter(f => f.startsWith('kg-') && f.endsWith('.json')).sort();
const prevFile = histFiles.length ? path.join(HISTORY_DIR, histFiles[histFiles.length - 1]) : null;
const newFindings = { drivers: [], mfrs: [], issues: [], lessons: [], workflows: [] };
if (prevFile && fs.existsSync(prevFile)) {
  const prev = JSON.parse(fs.readFileSync(prevFile, 'utf8'));
  for (const type of Object.keys(newFindings)) {
    const cur = new Set(Object.keys(kg.entities[type] || {}));
    const prev2 = new Set(Object.keys(prev.entities[type] || {}));
    for (const k of cur) if (!prev2.has(k)) newFindings[type].push(k);
  }
  console.log(`  New ${Object.values(newFindings).reduce((s, a) => s + a.length, 0)} entities since last sync`);
  for (const [type, arr] of Object.entries(newFindings)) {
    if (arr.length) console.log(`    ${type}: +${arr.length}`);
  }
} else {
  console.log('  (no previous build)');
}
console.log('');

// 3. Run smart investigations on hot topics
console.log('[3/4] Running smart investigations on hot topics...');
const hotTopics = [
  // Most-referenced drivers
  ...Object.entries(kg.entities.drivers || {})
    .sort((a, b) => (b[1].mfrs?.length || 0) - (a[1].mfrs?.length || 0))
    .slice(0, 3)
    .map(([k]) => k),
  // Most-referenced issues
  ...Object.entries(kg.entities.issues || {})
    .sort((a, b) => (b[1].references?.length || 0) - (a[1].references?.length || 0))
    .slice(0, 3)
    .map(([k]) => '#' + k),
  // Most-referenced lessons
  ...Object.entries(kg.entities.lessons || {})
    .sort((a, b) => (b[1].references?.length || 0) - (a[1].references?.length || 0))
    .slice(0, 3)
    .map(([k]) => k),
];
const uniqTopics = [...new Set(hotTopics)].slice(0, 10);
console.log(`  Topics: ${uniqTopics.join(', ')}`);
for (const topic of uniqTopics) {
  try {
    execFileSync('node', ['tools/ci/smart-investigate.js', topic], { cwd: REPO, stdio: 'pipe' });
    console.log(`    ✓ ${topic}`);
  } catch (e) {
    console.log(`    ✗ ${topic}: ${e.message.substring(0, 80)}`);
  }
}
console.log('');

// 4. Save snapshot
console.log('[4/4] Saving snapshot to history...');
const date = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const snapshotFile = path.join(HISTORY_DIR, `kg-${date}.json`);
fs.copyFileSync(KG_FILE, snapshotFile);

// Generate daily report
const report = {
  date: new Date().toISOString(),
  duration: Date.now() - t0,
  kg: {
    entities: kg.meta.totalEntities,
    relations: kg.meta.totalRelations,
    docs: kg.meta.totalDocsScanned,
    byType: kg.meta.byType,
  },
  newEntities: Object.fromEntries(Object.entries(newFindings).map(([k, v]) => [k, v.length])),
  investigations: uniqTopics,
};
const reportFile = path.join(HISTORY_DIR, `report-${date}.json`);
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

// Prune old snapshots (keep last 30)
const allHist = fs.readdirSync(HISTORY_DIR).filter(f => f.startsWith('kg-')).sort();
while (allHist.length > 30) {
  fs.unlinkSync(path.join(HISTORY_DIR, allHist.shift()));
}

console.log(`  Snapshot: ${snapshotFile}`);
console.log(`  Report:   ${reportFile}`);
console.log('');
console.log('=== DAILY SYNC COMPLETE ===');
console.log(`Total time: ${Date.now() - t0}ms`);
console.log(`Hot investigations: ${uniqTopics.length}`);
console.log(`New entities: ${Object.values(newFindings).reduce((s, a) => s + a.length, 0)}`);
