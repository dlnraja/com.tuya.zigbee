/**
 * check-archive-size.js — Pre-publish archive size guard
 *
 * Walks the project using .homeyignore rules and estimates compressed size.
 * Exits 1 if the estimated .tgz size exceeds TARGET_MB.
 *
 * Root cause discovered 2026-05-30:
 *   .diag/ was NOT in .homeyignore → 55MB of CI screenshots/tarballs leaked into archive
 *   → Athom "processing failed" for ALL builds since v8.1.7 (builds #2160-#2213)
 *   Fix: added .diag/ .memory/ .ai/ .gemini/ to .homeyignore
 *
 * THRESHOLDS:
 *   TARGET_MB  = 20  (our target — Athom hard limit is ~30MB)
 *   WARNING_MB = 15  (warn if approaching limit)
 */
'use strict';
const path = require('path');
const fs   = require('fs');

const TARGET_MB  = 20;
const WARNING_MB = 15;
const COMPRESSION_RATIO = 0.38; // empirical tgz ratio for mixed content

// Mandatory files that MUST be in the archive (runtime deps)
const REQUIRED = [
  'app.json', 'app.js', 'package.json',
  'README.txt', 'README.nl.txt', 'README.de.txt', 'README.fr.txt',
  'assets/icon.svg', '.homeychangelog.json',
  'driver-mapping-database.json',
];

let ig;
try {
  const ignore = require('ignore');
  ig = (ignore.default || ignore)().add(fs.readFileSync(path.join(process.cwd(), '.homeyignore'), 'utf8'));
} catch (e) {
  console.error('ERROR: Cannot load ignore module or .homeyignore:', e.message);
  process.exit(1);
}

const base       = process.cwd();
let   totalSize  = 0;
let   fileCount  = 0;
const bigFiles   = [];
const foundFiles = new Set();

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel  = path.relative(base, full).replace(/\\/g, '/');
    // Skip dot-dirs that should never be in archive
    if (['.git','.diag','.homeybuild','.cache','.tmp','.nyc_output'].includes(e.name)) continue;
    try { if (ig.ignores(rel)) continue; } catch { continue; }
    if (e.isDirectory()) { walk(full); continue; }
    try {
      const s = fs.statSync(full).size;
      totalSize += s;
      fileCount++;
      foundFiles.add(rel);
      if (s > 100 * 1024) bigFiles.push({ rel, kb: Math.round(s / 1024) });
    } catch {}
  }
}

walk(base);
bigFiles.sort((a, b) => b.kb - a.kb);

const uncompMB   = totalSize / 1024 / 1024;
const estimateMB = uncompMB * COMPRESSION_RATIO;

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  ARCHIVE SIZE CHECK (pre-publish gate)');
console.log(`║  ${new Date().toISOString()}`);
console.log('╚══════════════════════════════════════════════════════╝');
console.log(`\nFiles packed       : ${fileCount}`);
console.log(`Uncompressed       : ${uncompMB.toFixed(2)} MB`);
console.log(`Estimated .tgz     : ~${estimateMB.toFixed(2)} MB`);
console.log(`Target             : < ${TARGET_MB} MB compressed`);
console.log(`Athom hard limit   : ~30 MB compressed`);

if (estimateMB > TARGET_MB) {
  console.log(`\n❌ FAIL: ${estimateMB.toFixed(2)} MB > ${TARGET_MB} MB target!`);
  console.log('   Likely culprit: check .homeyignore for missing exclusions.');
  console.log('   Known bloat sources: .diag/ .memory/ .ai/ .archive/ screenshots/ docs/');
  console.log('   Run: node .github/scripts/athom-archive-audit.js --ci');
} else if (estimateMB > WARNING_MB) {
  console.log(`\n⚠️  WARNING: ${estimateMB.toFixed(2)} MB > ${WARNING_MB} MB — approaching limit`);
  console.log('   Consider trimming further to maintain safety margin.');
} else {
  console.log(`\n✅ OK: ${estimateMB.toFixed(2)} MB — well within ${TARGET_MB} MB target`);
}

if (bigFiles.length > 0) {
  console.log(`\nFiles > 100KB:`);
  bigFiles.slice(0, 15).forEach(f => console.log(`  ${String(f.kb).padStart(6)} KB  ${f.rel}`));
}

// Required files check
const missing = REQUIRED.filter(r => !foundFiles.has(r));
console.log('\nRequired files:');
REQUIRED.forEach(r => console.log(`  ${foundFiles.has(r) ? '✅' : '❌ MISSING'} — ${r}`));

// Exit code
const ok = estimateMB <= TARGET_MB && missing.length === 0;
if (!ok) {
  if (missing.length > 0) console.error(`\nMISSING REQUIRED: ${missing.join(', ')}`);
  process.exit(1);
}
