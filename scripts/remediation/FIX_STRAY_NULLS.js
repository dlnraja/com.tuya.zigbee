#!/usr/bin/env node
/**
 * FIX_STRAY_NULLS.js — v1 (real implementation, 2026-06-22)
 * ---------------------------------------------------------------
 * This file was previously an empty stub ('use strict';).
 * The remediation it names — deleting stray Windows reserved-name
 * files (NUL, CON, PRN, AUX, COM1-9, LPT1-9) from the project tree — was
 * never actually implemented, which is the root cause of the Athom
 * "processing_failed" loop (a NUL inside .homeybuild hangs the
 * tar-stream and produces a 0-byte / corrupt archive).
 *
 * It now delegates to scripts/maintenance/kill-stray-nulls.cjs,
 * which performs the deletion via the \\?\ extended-length path
 * prefix (the ONLY reliable way to remove reserved-name files on
 * Windows — fs.unlinkSync / fs.renameSync always throw EPERM).
 *
 * Usage:
 *   node scripts/remediation/FIX_STRAY_NULLS.js             # dry-run
 *   node scripts/remediation/FIX_STRAY_NULLS.js --force     # delete
 *   node scripts/remediation/FIX_STRAY_NULLS.js --force --dir .homeybuild
 *
 * NOTE: Always archive reserved-name files before --force — they
 * may contain real source code accidentally renamed by a broken
 * PowerShell Out-File / redirection (see .archive/
 * NUL-recovered-ButtonDevice_v5.5.805.js for an example).
 * ---------------------------------------------------------------
 */
'use strict';

const path = require('path');
const { killStrayNulls } = require(path.join(__dirname, '..', 'maintenance', 'kill-stray-nulls.cjs'));

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const verbose = !argv.includes('--quiet');

// Collect --dir <dir> occurrences
const dirs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dir' && argv[i + 1]) dirs.push(argv[i + 1]);
}

const rootDir = path.resolve(__dirname, '..', '..');
const targets = dirs.length ? dirs : ['.homeybuild'];

if (verbose) {
  console.log('FIX_STRAY_NULLS.js — delegates to kill-stray-nulls.cjs');
  console.log(`  Root: ${rootDir}`);
  console.log(`  Targets: ${targets.join(', ')}`);
  console.log(`  Mode : ${force ? 'FORCE (delete)' : 'DRY-RUN'}`);
}

const result = killStrayNulls(rootDir, { force, verbose, dirs: targets });

if (verbose) {
  console.log('----------------------------------------');
  console.log(`Found: ${result.found.length}, Deleted: ${result.deleted}, Failed: ${result.failed.length}`);
}

// Exit codes: 0 = clean / all deleted, 1 = dry-run found some, 2 = force failed to delete some
if (force && result.failed.length > 0) process.exit(2);
if (result.found.length > 0 && !force) process.exit(1);

module.exports = { killStrayNulls };
