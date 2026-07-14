#!/usr/bin/env node
/**
 * test-knowledge-graph.js — Test suite for P56 knowledge graph
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(REPO, '.github', 'state');
const KG_FILE = path.join(STATE_DIR, 'knowledge-graph.json');
const SUMMARY_FILE = path.join(STATE_DIR, 'knowledge-graph-summary.md');
const INV_DIR = path.join(STATE_DIR, 'investigations');

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✅', msg); }
  else { failed++; console.log('  ❌', msg); }
}

function assertEq(a, b, msg) {
  if (JSON.stringify(a) === JSON.stringify(b)) { passed++; console.log('  ✅', msg); }
  else { failed++; console.log('  ❌', msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')'); }
}

console.log('═══ KNOWLEDGE GRAPH TEST SUITE (P56) ═══\n');

// Test 1: Build the graph
console.log('Test 1: Build knowledge graph');
try {
  execFileSync('node', ['tools/ci/build-knowledge-graph.js', '--stats'], { cwd: REPO, stdio: 'pipe' });
} catch (e) { console.log('  ❌ BUILD FAILED:', e.message); failed++; process.exit(1); }
assert(fs.existsSync(KG_FILE), 'KG file exists');
const kg = JSON.parse(fs.readFileSync(KG_FILE, 'utf8'));
assert(kg.meta.totalEntities > 1000, `Entities > 1000 (got ${kg.meta.totalEntities})`);
assert(kg.meta.totalRelations > 5000, `Relations > 5000 (got ${kg.meta.totalRelations})`);
assert(kg.meta.totalDocsScanned > 100, `Docs > 100 (got ${kg.meta.totalDocsScanned})`);

// Test 2: Entity counts by type
console.log('\nTest 2: Entity counts by type');
assert(kg.meta.byType.drivers > 100, `Drivers > 100 (got ${kg.meta.byType.drivers})`);
assert(kg.meta.byType.fingerprints > 100, `Fingerprints > 100 (got ${kg.meta.byType.fingerprints})`);
assert(kg.meta.byType.workflows > 10, `Workflows > 10 (got ${kg.meta.byType.workflows})`);
assert(kg.meta.byType.issues > 10, `Issues > 10 (got ${kg.meta.byType.issues})`);
assert(kg.meta.byType.lessons > 10, `Lessons > 10 (got ${kg.meta.byType.lessons})`);

// Test 3: Summary file
console.log('\nTest 3: Summary file');
assert(fs.existsSync(SUMMARY_FILE), 'Summary file exists');
const summary = fs.readFileSync(SUMMARY_FILE, 'utf8');
assert(summary.includes('# Knowledge Graph Summary'), 'Summary has title');
assert(summary.includes('## Entity counts'), 'Summary has entity counts section');
assert(summary.includes('## Relations'), 'Summary has relations section');

// Test 4: Smart investigate - by mfr
console.log('\nTest 4: Smart investigate by mfr');
try {
  execFileSync('node', ['tools/ci/smart-investigate.js', '_TZE200_aoclfnxz'], { cwd: REPO, stdio: 'pipe' });
} catch (e) { console.log('  ❌ INVESTIGATE FAILED:', e.message); failed++; }
const invFiles = fs.existsSync(INV_DIR) ? fs.readdirSync(INV_DIR).filter(f => f.endsWith('.md')) : [];
assert(invFiles.length > 0, `Investigation files created (${invFiles.length})`);

// Test 5: Daily sync
console.log('\nTest 5: Daily knowledge sync');
try {
  execFileSync('node', ['tools/ci/daily-knowledge-sync.js'], { cwd: REPO, stdio: 'pipe' });
} catch (e) { console.log('  ❌ DAILY SYNC FAILED:', e.message); failed++; }
const histDir = path.join(STATE_DIR, 'knowledge-graph-history');
const histFiles = fs.existsSync(histDir) ? fs.readdirSync(histDir).filter(f => f.startsWith('kg-') && f.endsWith('.json')) : [];
assert(histFiles.length > 0, `Snapshot history files (${histFiles.length})`);

// Test 6: KG is loadable
console.log('\nTest 6: KG is well-formed');
assert(kg.entities !== undefined, 'KG has entities');
assert(kg.relations !== undefined, 'KG has relations');
assert(kg.docs !== undefined, 'KG has docs');
assert(kg.meta !== undefined, 'KG has meta');
assert(typeof kg.meta.generatedAt === 'string', 'KG meta has generatedAt timestamp');

// Summary
console.log('\n═══ RESULTS ═══');
console.log('  Passed:', passed);
console.log('  Failed:', failed);
console.log('  Total: ', passed + failed);
if (failed > 0) {
  console.log('\n❌', failed, 'test(s) FAILED');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}
