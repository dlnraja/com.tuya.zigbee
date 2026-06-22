#!/usr/bin/env node
/**
 * kill-stray-nulls.cjs
 * ---------------------------------------------------------------
 * Sanitize Windows reserved-name files (NUL, CON, PRN, AUX, COM1-9,
 * LPT1-9) that pollute the project root and .homeybuild/.
 *
 * ROOT CAUSE these files exist:
 *   PowerShell redirections / CI scripts that use 'NUL' as a sink
 *   (process.env.GITHUB_STEP_SUMMARY || 'NUL') create a real file
 *   named "NUL" when the path logic turns the sink into a filename.
 *   fs.unlinkSync / fs.renameSync cannot delete reserved device names
 *   (EPERM/EACCES) — only the Win32 extended-length prefix \\?\ works.
 *
 * This module exports:
 *   - killStrayNulls(rootDir, opts) : programmatic API
 *   - main()                        : CLI entry (this file)
 *
 * CLI usage:
 *   node scripts/maintenance/kill-stray-nulls.cjs [--force] [--root <dir>]
 *   Default: --dry-run (reports only, no deletion).
 *
 * Safety: archived copies should be made BEFORE running with --force.
 * Reserved-name files may contain real source code (e.g. a driver
 * accidentally renamed NUL by a broken Out-File redirection).
 * ---------------------------------------------------------------
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Windows reserved base names (case-insensitive, with/without extension).
const RESERVED_BASENAMES = new Set([
  'NUL', 'CON', 'PRN', 'AUX',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * True if a filename uses a Windows reserved device name.
 * Matches "NUL", "NUL.txt", "con.log", etc.
 */
function isReservedName(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const base = filename.split('.')[0].toUpperCase();
  return RESERVED_BASENAMES.has(base);
}

/**
 * Walk a directory tree, returning absolute paths of reserved-name entries.
 */
function findReserved(rootDir) {
  const hits = [];
  if (!fs.existsSync(rootDir)) return hits;
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch (e) {
    // A directory containing a reserved-named child may itself throw EPERM
    // on readdir. Try the parent's listing and probe reserved names directly.
    entries = [];
  }
  for (const ent of entries) {
    const full = path.join(rootDir, ent.name);
    if (isReservedName(ent.name)) {
      hits.push({ path: full, name: ent.name, isDir: ent.isDirectory() });
    }
    if (ent.isDirectory() && !ent.name.startsWith('.')) {
      // Recurse, but skip dotdirs (.git, .homeybuild handled separately if requested)
      try { hits.push(...findReserved(full)); } catch (_) { /* ignore */ }
    }
  }
  // Also probe known reserved names that readdir may hide (Windows quirk).
  for (const reserved of RESERVED_BASENAMES) {
    for (const candidate of [reserved, `${reserved}.txt`, `${reserved}.log`]) {
      const probe = path.join(rootDir, candidate);
      // Use stat with throwaway; reserved device names resolve, so only test files.
      try {
        const st = fs.statSync(probe);
        if (st.isFile() && !hits.some(h => h.path === probe)) {
          hits.push({ path: probe, name: candidate, isDir: false });
        }
      } catch (_) { /* not present */ }
    }
  }
  return hits;
}

/**
 * Delete a reserved-name file using the \\?\ extended-length path prefix.
 * Node.js does NOT reinterpret reserved device names the way the Win32 CRT
 * does, so fs.rmSync on '\\?\C:\...\NUL' targets the real file, not \\.\NUL.
 *
 * Returns true on success, false on failure.
 */
function deleteReserved(absPath, { verbose = false } = {}) {
  const prefixed = absPath.startsWith('\\\\?\\') ? absPath : `\\\\?\\${absPath}`;
  try {
    fs.rmSync(prefixed, { force: false, maxRetries: 3, retryDelay: 200 });
    if (verbose) console.log(`  [OK] deleted: ${absPath}`);
    return true;
  } catch (e) {
    // Fallback: cmd.exe del with the \\?\ prefix (sometimes works when Node doesn't).
    if (verbose) console.log(`  [fs.rmSync failed: ${e.message}] trying cmd del fallback...`);
    try {
      execFileSync('cmd.exe', ['/c', 'del', '/f', '/q', prefixed], { stdio: 'ignore' });
      if (!fs.existsSync(prefixed)) {
        if (verbose) console.log(`  [OK] deleted via cmd: ${absPath}`);
        return true;
      }
    } catch (_) { /* fall through */ }
    if (verbose) console.log(`  [FAIL] could not delete: ${absPath} (${e.message})`);
    return false;
  }
}

/**
 * Programmatic API.
 * @param {string} rootDir - absolute path to scan
 * @param {object} opts - { force: bool, verbose: bool, dirs: string[] }
 *   dirs: extra subdirs to also scan (e.g. ['.homeybuild'])
 * @returns {{ scanned: number, found: Array, deleted: number, failed: Array }}
 */
function killStrayNulls(rootDir, opts = {}) {
  const { force = false, verbose = false, dirs = [] } = opts;
  const scanTargets = [rootDir, ...dirs.map(d => path.join(rootDir, d))];
  const found = [];
  for (const target of scanTargets) {
    if (verbose) console.log(`Scanning: ${target}`);
    found.push(...findReserved(target));
  }
  // Deduplicate by path.
  const unique = [];
  const seen = new Set();
  for (const h of found) {
    const key = h.path.toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(h); }
  }
  let deleted = 0;
  const failed = [];
  for (const h of unique) {
    if (force) {
      if (deleteReserved(h.path, { verbose })) deleted++;
      else failed.push(h.path);
    } else if (verbose) {
      console.log(`  [DRY-RUN] would delete: ${h.path}`);
    }
  }
  return { scanned: scanTargets.length, found: unique, deleted, failed };
}

function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const rootIdx = argv.indexOf('--root');
  const rootArg = rootIdx >= 0 ? argv[rootIdx + 1] : null;
  const extraDirs = ['--dir'].reduce((acc, flag) => {
    let i = argv.indexOf(flag);
    while (i >= 0) { acc.push(argv[i + 1]); i = argv.indexOf(flag, i + 1); }
    return acc;
  }, []);

  const rootDir = path.resolve(rootArg || process.cwd());
  console.log('========================================');
  console.log(' kill-stray-nulls.cjs');
  console.log('========================================');
  console.log(`Root: ${rootDir}`);
  console.log(`Mode: ${force ? 'FORCE (delete)' : 'DRY-RUN (report only)'}`);
  if (extraDirs.length) console.log(`Extra dirs: ${extraDirs.join(', ')}`);
  console.log('');

  const result = killStrayNulls(rootDir, {
    force,
    verbose: true,
    dirs: extraDirs.length ? extraDirs : ['.homeybuild'],
  });

  console.log('');
  console.log('----------------------------------------');
  console.log(`Found : ${result.found.length} reserved-name file(s)`);
  if (force) {
    console.log(`Deleted: ${result.deleted}`);
    if (result.failed.length) {
      console.log(`Failed : ${result.failed.length}`);
      result.failed.forEach(p => console.log(`  - ${p}`));
    }
  } else {
    console.log('Re-run with --force to delete.');
  }
  console.log('----------------------------------------');

  // Exit non-zero if any reserved file remains (useful in CI / pre-publish).
  if (force && result.failed.length > 0) process.exit(2);
  if (result.found.length > 0 && !force) process.exit(1);
}

if (require.main === module) main();

module.exports = { killStrayNulls, findReserved, deleteReserved, isReservedName, RESERVED_BASENAMES };
