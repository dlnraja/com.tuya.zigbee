#!/usr/bin/env node
/**
 * athom-archive-audit.js
 *
 * Deep audit of the current archive before Athom submission.
 * Identifies bloat, checks mandatory files, estimates compressed size.
 *
 * Usage:
 *   node .github/scripts/athom-archive-audit.js
 *   node .github/scripts/athom-archive-audit.js --fix    (auto-fix .homeyignore)
 *   node .github/scripts/athom-archive-audit.js --ci     (exit 1 if > 30MB)
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..', '..');
const AUTO_FIX = process.argv.includes('--fix');
const CI_MODE  = process.argv.includes('--ci');

// Files/dirs that MUST be included for Athom runtime
const REQUIRED_FILES = [
  'app.json', 'app.js', 'package.json',
  'README.txt', 'README.nl.txt', 'README.de.txt', 'README.fr.txt',
  'assets/icon.svg', 'assets/images/small.png', 'assets/images/large.png',
  '.homeychangelog.json',
  'driver-mapping-database.json',  // loaded by DriverMappingLoader.js at runtime
];

// Files/dirs that are NEVER needed at runtime (safe to exclude)
const ALWAYS_BLOAT = [
  { pattern: /^\.agents\//, reason: '640KB dev-only agent skills' },
  { pattern: /^screenshots\//, reason: 'Puppeteer diagnostic screenshots' },
  { pattern: /^scratch\//, reason: 'Temp dev files' },
  { pattern: /^reference pdf\//, reason: 'PDF docs (not runtime)' },
  { pattern: /^data\/archive\//, reason: 'Archived JSON data' },
  { pattern: /\.pdf$/, reason: 'PDF files' },
  { pattern: /PROJECT_INDEX\.md$/, reason: 'AI index doc' },
  { pattern: /AI_CONTEXT_MANDATE\.md$/, reason: 'AI context doc' },
  { pattern: /GLOBAL_IMPROVEMENT_PLAN\.md$/, reason: 'AI plan doc' },
  { pattern: /^\.github\//, reason: 'CI/CD scripts' },
];

// Max sizes that trigger warnings
const WARN_FILE_KB  = 500;  // warn if single file > 500KB
const ERROR_FILE_KB = 2048; // error if single file > 2MB (excluding known-large)
const KNOWN_LARGE   = [
  'data/fingerprints.json',       // fingerprint DB — lazy-loaded
  'data/mfs_db.json',             // AutonomousEnricher local-first runtime DB
  'app.json',                     // Homey manifest (412 drivers = large)
  'driver-mapping-database.json', // DriverMappingLoader.js runtime dep
]; // allowed to be large

function globToRegExp(pattern) {
  let p = pattern.replace(/\\/g, '/').replace(/^\//, '');
  const dirOnly = p.endsWith('/');
  if (dirOnly) p = p.slice(0, -1);
  const esc = p.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  if (dirOnly) return new RegExp(`^${esc}(?:/|$)`);
  if (!p.includes('/')) return new RegExp(`(^|/)${esc}$`);
  return new RegExp(`^${esc}$`);
}

function loadIgnoreRules() {
  const ignorePath = path.join(ROOT, '.homeyignore');
  if (!fs.existsSync(ignorePath)) return [];
  return fs.readFileSync(ignorePath, 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(raw => {
      const negate = raw.startsWith('!');
      const pattern = negate ? raw.slice(1) : raw;
      return { negate, re: globToRegExp(pattern) };
    });
}

function isIgnored(rel, rules) {
  let ignored = false;
  for (const rule of rules) {
    if (rule.re.test(rel)) ignored = !rule.negate;
  }
  return ignored;
}

function walkFallback(dir, rules, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (rel === '.git' || rel.startsWith('.git/')) continue;
    if (isIgnored(rel + (entry.isDirectory() ? '/' : ''), rules) || isIgnored(rel, rules)) continue;
    if (entry.isDirectory()) walkFallback(full, rules, out);
    else out.push(rel);
  }
  return out;
}

async function listPackedFiles() {
  try {
    const ignoreWalk = require('ignore-walk');
    return await ignoreWalk({
      path: ROOT,
      ignoreFiles: ['.homeyignore'],
      includeEmpty: false,
      follow: false,
    });
  } catch (err) {
    console.log(`[INFO] ignore-walk unavailable (${err.message}); using built-in .homeyignore fallback`);
    return walkFallback(ROOT, loadIgnoreRules());
  }
}

(async () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  ATHOM ARCHIVE AUDIT');
  console.log(`║  ${new Date().toISOString()}`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. Walk the files that will be packed ──
  const files = await listPackedFiles();

  let totalBytes = 0;
  const fileDetails = [];
  const bloatFound  = [];
  const missingRequired = [];
  const warnings   = [];
  const errors     = [];

  for (const f of files) {
    let size = 0;
    try { size = fs.statSync(path.join(ROOT, f)).size; } catch {}
    totalBytes += size;
    fileDetails.push({ f, size });

    // Check for bloat patterns
    for (const { pattern, reason } of ALWAYS_BLOAT) {
      if (pattern.test(f)) {
        bloatFound.push({ f, size, reason });
        break;
      }
    }

    // Check large files
    const sizeKB = size / 1024;
    const isKnownLarge = KNOWN_LARGE.some(kl => f.includes(kl));
    if (!isKnownLarge && sizeKB > ERROR_FILE_KB) {
      errors.push(`File too large: ${f} (${(sizeKB/1024).toFixed(2)} MB)`);
    } else if (!isKnownLarge && sizeKB > WARN_FILE_KB) {
      warnings.push(`Large file: ${f} (${sizeKB.toFixed(0)} KB)`);
    }
  }

  // Check required files
  for (const req of REQUIRED_FILES) {
    const exists = files.some(f => f === req || f.endsWith('/' + req));
    if (!exists) missingRequired.push(req);
  }

  // ── 2. Compute sizes ──
  const uncompMB  = totalBytes / 1024 / 1024;
  const estTgzMB  = uncompMB * 0.38; // empirical compression ratio
  const fileCount = files.length;

  // ── 3. Top directories by size ──
  const byDir = {};
  for (const { f, size } of fileDetails) {
    const dir = f.includes('/') ? f.split('/')[0] : '(root)';
    byDir[dir] = (byDir[dir] || 0) + size;
  }
  const topDirs = Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // ── 4. Report ──
  console.log('=== SIZE SUMMARY ===');
  console.log(`Files packed:       ${fileCount}`);
  console.log(`Uncompressed:       ${uncompMB.toFixed(2)} MB`);
  console.log(`Estimated .tgz:     ~${estTgzMB.toFixed(2)} MB`);
  console.log(`Status:             ${estTgzMB < 30 ? '✅ OK (< 30MB)' : '❌ TOO LARGE (> 30MB) — Athom will fail'}`);

  console.log('\n=== BY DIRECTORY ===');
  for (const [dir, sz] of topDirs) {
    const bar = '█'.repeat(Math.round(sz / totalBytes * 40));
    console.log(`  ${(sz/1024/1024).toFixed(2).padStart(6)} MB  ${dir.padEnd(35)} ${bar}`);
  }

  console.log('\n=== BIG FILES (> 100KB) ===');
  fileDetails
    .filter(({ size }) => size > 100 * 1024)
    .sort((a, b) => b.size - a.size)
    .slice(0, 20)
    .forEach(({ f, size }) => {
      const flag = KNOWN_LARGE.some(kl => f.includes(kl)) ? '  (expected-large)' : '';
      console.log(`  ${(size/1024).toFixed(0).padStart(6)} KB  ${f}${flag}`);
    });

  if (bloatFound.length > 0) {
    console.log('\n=== ⚠️  BLOAT DETECTED (should be in .homeyignore) ===');
    for (const { f, size, reason } of bloatFound) {
      console.log(`  ${(size/1024).toFixed(0).padStart(6)} KB  ${f}`);
      console.log(`             Reason: ${reason}`);
    }
    if (AUTO_FIX) {
      console.log('\n[AUTO-FIX] Adding bloat patterns to .homeyignore...');
      const ignorePath = path.join(ROOT, '.homeyignore');
      let ignore = fs.readFileSync(ignorePath, 'utf8');
      let added = [];
      for (const { f } of bloatFound) {
        const dir = f.includes('/') ? f.split('/')[0] + '/' : f;
        if (!ignore.includes(dir)) {
          ignore += `\n${dir}`;
          added.push(dir);
        }
      }
      if (added.length > 0) {
        fs.writeFileSync(ignorePath, ignore);
        console.log(`  Added to .homeyignore: ${added.join(', ')}`);
      } else {
        console.log('  All bloat patterns already in .homeyignore (check for exact name match)');
      }
    }
  } else {
    console.log('\n=== BLOAT CHECK: ✅ No known bloat patterns found ===');
  }

  if (missingRequired.length > 0) {
    console.log('\n=== ❌ MISSING REQUIRED FILES ===');
    for (const f of missingRequired) console.log(`  MISSING: ${f}`);
  } else {
    console.log('\n=== REQUIRED FILES: ✅ All present ===');
  }

  if (warnings.length > 0) {
    console.log('\n=== ⚠️  WARNINGS ===');
    warnings.forEach(w => console.log('  ' + w));
  }

  if (errors.length > 0) {
    console.log('\n=== ❌ ERRORS ===');
    errors.forEach(e => console.log('  ' + e));
  }

  // ── 5. Driver count ──
  const driverDirs = [...new Set(files
    .filter(f => f.startsWith('drivers/'))
    .map(f => f.split('/')[1])
    .filter(Boolean)
  )];
  const driverImageLarge = files.filter(f => f.match(/drivers\/[^/]+\/assets\/images\/large\.png/));
  const driverIconSVG    = files.filter(f => f.match(/drivers\/[^/]+\/assets\/icon\.svg/));
  console.log(`\n=== DRIVERS ===`);
  console.log(`  Driver dirs:        ${driverDirs.length}`);
  console.log(`  large.png present:  ${driverImageLarge.length}`);
  console.log(`  icon.svg present:   ${driverIconSVG.length}`);

  // ── 6. Final verdict ──
  console.log('\n═══════════════════════════════════════════════════════');
  const ok = estTgzMB < 30 && missingRequired.length === 0 && errors.length === 0;
  if (ok) {
    console.log('✅ ARCHIVE READY — safe to publish to Athom');
  } else {
    console.log('❌ ARCHIVE NOT READY:');
    if (estTgzMB >= 30) console.log(`   - Size ${estTgzMB.toFixed(2)} MB > 30MB`);
    if (missingRequired.length > 0) console.log(`   - Missing required: ${missingRequired.join(', ')}`);
    if (errors.length > 0) errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('═══════════════════════════════════════════════════════\n');

  if (CI_MODE && !ok) process.exit(1);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
