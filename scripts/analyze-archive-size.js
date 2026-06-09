#!/usr/bin/env node
/**
 * analyze-archive-size.js — Analyze and optimize archive size for Athom publishing
 *
 * Athom thresholds:
 *   < 20MB compressed: SAFE
 *   20-30MB: WARNING
 *   > 30MB: Processing failed
 *
 * Usage: node scripts/ci/analyze-archive-size.js [--fix]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(process.cwd(), '.homeybuild');
const FIX_MODE = process.argv.includes('--fix');

// Files that MUST be in the archive (runtime deps)
const REQUIRED_FILES = [
  'app.json', 'app.js', 'package.json', '.homeychangelog.json',
  'driver-mapping-database.json', 'data/fingerprints.json',
  'lib/tuya/fingerprints.json', 'README.txt',
  'README.nl.txt', 'README.de.txt', 'README.fr.txt',
  'assets/icon.svg', 'assets/images/small.png',
];

// Files/dirs that can be excluded from archive
const EXCLUDABLE_PATTERNS = [
  'node_modules/@emnapi/',        // 466KB - @emnapi native bindings
  'node_modules/tinycolor2/',     // 326KB - color library (unused at runtime)
  'node_modules/tr46/',           // 269KB - Unicode IDNA mapping (qrcode dep)
  'node_modules/@types/',         // 54KB  - TypeScript types (not needed at runtime)
  'node_modules/dijkstrajs/',     // 24KB  - graph algorithm (qrcode dep)
  'node_modules/husl/',           // 20KB  - color space (qrcode dep)
  'node_modules/almost-equal/',   // 19KB  - floating point comparison
  'node_modules/ansi-styles/',    // 36KB  - terminal colors
  'node_modules/ansi-regex/',     // 21KB  - terminal regex
  'node_modules/emoji-regex/',    // 65KB  - emoji detection
  'node_modules/string-width/',   // 24KB  - string display width
  'node_modules/is-fullwidth-code-point/', // 21KB
  'node_modules/strip-ansi/',     // 18KB  - strip ANSI codes
  'node_modules/require-directory/', // 30KB
  'node_modules/require-main-filename/', // 21KB
  'node_modules/which-module/',   // 13KB
  'node_modules/camelcase/',      // 24KB
  'node_modules/decamelize/',     // 13KB
  'node_modules/path-exists/',    // 18KB
  'node_modules/p-timeout/',      // 24KB
  'node_modules/p-retry/',        // 24KB
  'node_modules/p-finally/',      // 13KB
  'node_modules/p-try/',          // 21KB
  'node_modules/retry/',          // 38KB
  'node_modules/debug/',          // 57KB  - debug logging (usually stripped)
  'node_modules/ms/',             // 16KB  - ms conversion
];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getDirSize(dir) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += getDirSize(fullPath);
      } else {
        total += fs.statSync(fullPath).size;
      }
    }
  } catch (e) {}
  return total;
}

function analyzeArchive() {
  console.log('=== Archive Size Analyzer ===\n');

  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ .homeybuild/ not found. Run: npx homey app build');
    process.exit(1);
  }

  // Get uncompressed size
  const totalSize = getDirSize(BUILD_DIR);
  console.log(`Uncompressed: ${formatSize(totalSize)}`);

  // Get compressed size
  const archivePath = '/tmp/analyze-archive.tar.gz';
  try {
    execSync(`tar czf ${archivePath} -C ${path.dirname(BUILD_DIR)} ${path.basename(BUILD_DIR)}`, { stdio: 'pipe' });
    const compressedSize = fs.statSync(archivePath).size;
    const ratio = ((1 - compressedSize / totalSize) * 100).toFixed(1);
    console.log(`Compressed:   ${formatSize(compressedSize)} (${ratio}% compression)`);
    console.log(`Files:        ${execSync(`tar tzf ${archivePath}`, { encoding: 'utf8' }).split('\n').filter(Boolean).length}`);
    fs.unlinkSync(archivePath);
  } catch (e) {
    console.error('Error creating archive:', e.message);
  }

  // Analyze directory sizes
  console.log('\n--- Directory Breakdown ---');
  const dirs = ['drivers', 'lib', 'node_modules', 'assets', 'data', 'locales', 'settings', 'capabilities'];
  for (const dir of dirs) {
    const dirPath = path.join(BUILD_DIR, dir);
    if (fs.existsSync(dirPath)) {
      const size = getDirSize(dirPath);
      const files = execSync(`find "${dirPath}" -type f | wc -l`, { encoding: 'utf8' }).trim();
      console.log(`  ${dir}/: ${formatSize(size)} (${files} files)`);
    }
  }

  // Analyze file types
  console.log('\n--- File Types ---');
  const types = {};
  execSync(`find "${BUILD_DIR}" -type f`, { encoding: 'utf8' }).split('\n').filter(Boolean).forEach(f => {
    const ext = path.extname(f) || '(no ext)';
    const size = fs.statSync(f).size;
    if (!types[ext]) types[ext] = { count: 0, size: 0 };
    types[ext].count++;
    types[ext].size += size;
  });
  Object.entries(types).sort((a, b) => b[1].size - a[1].size).forEach(([ext, data]) => {
    console.log(`  ${ext.padEnd(8)} ${formatSize(data.size).padStart(10)}  (${data.count} files)`);
  });

  // Analyze node_modules
  console.log('\n--- node_modules Breakdown ---');
  const nmDir = path.join(BUILD_DIR, 'node_modules');
  if (fs.existsSync(nmDir)) {
    execSync(`du -sh "${nmDir}"/*/ 2>/dev/null`, { encoding: 'utf8' }).split('\n').filter(Boolean).forEach(line => {
      console.log(`  ${line.trim()}`);
    });
  }

  // Check what can be excluded
  console.log('\n--- Excludable (non-runtime) ---');
  let excludableSize = 0;
  for (const pattern of EXCLUDABLE_PATTERNS) {
    const fullPath = path.join(BUILD_DIR, pattern);
    if (fs.existsSync(fullPath)) {
      const size = getDirSize(fullPath);
      excludableSize += size;
      console.log(`  ${pattern}: ${formatSize(size)}`);
    }
  }
  console.log(`  TOTAL EXCLUDABLE: ${formatSize(excludableSize)}`);

  // Recommendations
  console.log('\n--- Recommendations ---');
  if (totalSize > 30 * 1024 * 1024) {
    console.log('❌ CRITICAL: Archive too large for Athom (>30MB uncompressed)');
  } else if (totalSize > 20 * 1024 * 1024) {
    console.log('⚠️  WARNING: Archive at risk (>20MB uncompressed)');
  } else {
    console.log('✅ OK: Archive within safe limits');
  }

  if (excludableSize > 0) {
    console.log(`💡 Can save ${formatSize(excludableSize)} by excluding non-runtime node_modules`);
  }

  return { totalSize, excludableSize };
}

const result = analyzeArchive();
