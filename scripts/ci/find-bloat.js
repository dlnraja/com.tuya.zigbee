#!/usr/bin/env node
/**
 * find-bloat.js - Bundle Bloat Detector for CI/CD
 * Scans the app bundle for oversized files that may cause OOM crashes on Homey Pro (64MB limit).
 *
 * Usage: node scripts/ci/find-bloat.js [--json] [--threshold <KB>]
 * Exit code: 0 = no bloat, 1 = bloat detected, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSON_OUTPUT = process.argv.includes('--json');
const thresholdIdx = process.argv.indexOf('--threshold');
const THRESHOLD_KB = thresholdIdx !== -1 ? parseInt(process.argv[thresholdIdx + 1], 10) : 500;

const ROOT = path.resolve(__dirname, '../..');

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.homeybuild', 'tmp', 'temp', '_temp',
  'scripts/temp', '.archive', 'reference pdf',
]);

const IGNORE_PATTERNS = [
  '.*',
  '.homeybuild',
  '*.{ts,mts,cts}',
  'tsconfig.json',
  'env.json',
  '*.compose.json',
  'node_modules',
];

let files = [];
let totalSize = 0;
let bloatFiles = [];

function walk(dir, relPath = '') {
  if (!fs.existsSync(dir)) return;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch { return; }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);
    const rel = relPath ? `${relPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      walk(fullPath, rel);
    } else if (entry.isFile()) {
      // Skip ignored patterns
      if (IGNORE_PATTERNS.some(p => {
        const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(entry.name);
      })) continue;

      try {
        const stat = fs.statSync(fullPath);
        const sizeKB = Math.round(stat.size / 1024);
        totalSize += stat.size;
        files.push({ path: rel, size: stat.size, sizeKB });

        if (sizeKB >= THRESHOLD_KB) {
          bloatFiles.push({ path: rel, sizeKB, sizeMB: (stat.size / 1048576).toFixed(2) });
        }
      } catch { /* skip unreadable */ }
    }
  }
}

try {
  if (!JSON_OUTPUT) console.log('Scanning for bundle bloat...\n');

  walk(ROOT);

  // Sort by size descending
  files.sort((a, b) => b.size - a.size);
  bloatFiles.sort((a, b) => b.sizeKB - a.sizeKB);

  if (JSON_OUTPUT) {
    const output = {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      totalSizeMB: (totalSize / 1048576).toFixed(2),
      thresholdKB: THRESHOLD_KB,
      bloatCount: bloatFiles.length,
      bloatFiles: bloatFiles.slice(0, 50),
      topFiles: files.slice(0, 50).map(f => ({ path: f.path, sizeKB: f.sizeKB })),
      exitCode: bloatFiles.length > 0 ? 1 : 0,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`Total files: ${files.length}`);
    console.log(`Total uncompressed size: ${(totalSize / 1048576).toFixed(2)} MB`);
    console.log(`Threshold: ${THRESHOLD_KB} KB`);

    if (bloatFiles.length > 0) {
      console.log(`\nBLOAT DETECTED (${bloatFiles.length} files >= ${THRESHOLD_KB} KB):`);
      for (const f of bloatFiles) {
        console.log(`  ${f.sizeMB} MB -> ${f.path}`);
      }
    } else {
      console.log(`\nNo bloat detected (all files < ${THRESHOLD_KB} KB).`);
    }

    console.log(`\nTop 20 largest files:`);
    files.slice(0, 20).forEach(f => {
      console.log(`  ${(f.size / 1048576).toFixed(2)} MB -> ${f.path}`);
    });
  }

  process.exit(bloatFiles.length > 0 ? 1 : 0);
} catch (e) {
  if (!JSON_OUTPUT) console.error(`[find-bloat] Fatal error: ${e.message}`);
  process.exit(2);
}
