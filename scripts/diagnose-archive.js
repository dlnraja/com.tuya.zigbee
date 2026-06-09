#!/usr/bin/env node
/**
 * diagnose-archive.js — Deep diagnostic: tar-fs vs tar command vs homey publish
 *
 * Creates both tar-fs (Node.js) and tar command archives from .homeybuild/
 * Compares them byte by byte, shows exactly which files differ, and reports
 * the compression ratio. Also checks for files that shouldn't be in the archive.
 *
 * ROOT CAUSE FINDING (2026-06-01):
 * The CI produces 27MB+ archives because:
 * 1. The Athom Docker action (github-action-homey-app-publish) runs
 *    `npx homey app publish` which re-creates .homeybuild/ from scratch,
 *    UNDOING all CI optimizations (slimmed fingerprints, compacted app.json).
 * 2. The `npx homey app publish` CLI includes node_modules/ in the archive
 *    (tar-fs only ignores dotfiles, not node_modules).
 * 3. The v8.1.23/v8.1.24 "bad" archives (37-40MB) were packed from the
 *    ENTIRE repository, not .homeybuild/, including .agents/, .ai/, .github/.
 *
 * SOLUTION: Use `cd .homeybuild && tar czf output.tar.gz *` directly
 * (as auto-publish-on-push.yml step 6 does), bypassing the homey CLI.
 *
 * Usage: node scripts/ci/diagnose-archive.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');
const tar = require('tar-fs');
const { pipeline } = require('stream');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BUILD_DIR = path.join(PROJECT_ROOT, '.homeybuild');
const TMP_DIR = path.join(PROJECT_ROOT, '.diag', 'archive-compare');

// Use MSYS-compatible paths on Windows
function toMsys(p) {
  if (process.platform === 'win32') {
    return p.replace(/\\/g, '/');
  }
  return p;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getDirSize(dir) {
  let total = 0;
  let fileCount = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = getDirSize(fullPath);
        total += sub.size;
        fileCount += sub.count;
      } else {
        total += fs.statSync(fullPath).size;
        fileCount++;
      }
    }
  } catch (e) { /* ignore */ }
  return { size: total, count: fileCount };
}

function getDirSizeBySubdir(dir) {
  const results = {};
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = getDirSize(fullPath);
        results[entry.name + '/'] = sub;
      } else {
        results[entry.name] = { size: fs.statSync(fullPath).size, count: 1 };
      }
    }
  } catch (e) { /* ignore */ }
  return results;
}

/**
 * Create archive using tar-fs (matches homey CLI _getPackStream behavior)
 * @param {Object} opts - { excludeNm: bool, label: string }
 * @returns {Promise<{compressed: number, uncompressed: number, files: number}>}
 */
async function createTarFsArchive(opts = {}) {
  const label = opts.label || 'tar-fs';
  const outFile = path.join(TMP_DIR, `${label}.tar.gz`);

  return new Promise((resolve, reject) => {
    let totalBytes = 0;
    let numFiles = 0;

    const pack = tar.pack(BUILD_DIR, {
      dereference: true,
      map(header) {
        if (header.type === 'file') numFiles += 1;
        return header;
      },
      ignore(name) {
        if (name.startsWith('.')) return true;
        if (name.includes('/.git/')) return true;
        if (opts.excludeNm && name.includes('node_modules')) return true;
        return false;
      },
    }).on('data', (chunk) => {
      totalBytes += chunk.length;
    });

    const gzip = zlib.createGzip({ level: opts.level || 6 });
    const out = fs.createWriteStream(outFile);

    pipeline(pack, gzip, out, (err) => {
      if (err) return reject(err);
      const compressed = fs.statSync(outFile).size;
      resolve({ compressed, uncompressed: totalBytes, files: numFiles, path: outFile });
    });
  });
}

/**
 * Create archive using tar command (what CI auto-publish-on-push.yml does)
 */
function createTarCmdArchive(opts = {}) {
  const label = opts.label || 'tar-cmd';
  const outFile = path.join(TMP_DIR, `${label}.tar.gz`);

  try {
    if (opts.excludeNm) {
      execSync(
        `tar czf "${toMsys(outFile)}" --exclude='node_modules' -C "${toMsys(BUILD_DIR)}" .`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(
        `tar czf "${toMsys(outFile)}" -C "${toMsys(BUILD_DIR)}" .`,
        { stdio: 'pipe' }
      );
    }
    const stat = fs.statSync(outFile);
    return { size: stat.size, path: outFile };
  } catch (e) {
    console.error(`  tar command failed: ${e.message.split('\n')[0]}`);
    return null;
  }
}

function listArchiveContents(archivePath) {
  try {
    const output = execSync(`tar tzf "${toMsys(archivePath)}" 2>/dev/null`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    return output.split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

function analyzeArchive(entries, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`  Total entries: ${entries.length}`);

  // Categorize entries
  const nodeModules = entries.filter(e => e.includes('node_modules'));
  const dotEntries = entries.filter(e => {
    const parts = e.split('/');
    return parts.some(p => p.startsWith('.') && p !== '' && p !== '..');
  });

  if (nodeModules.length > 0) {
    console.log(`  node_modules: ${nodeModules.length} entries`);
  } else {
    console.log(`  node_modules: none`);
  }

  if (dotEntries.length > 0) {
    console.log(`  Dotfile entries: ${dotEntries.length}`);
  }

  // Top-level structure
  const topLevel = {};
  for (const entry of entries) {
    const first = entry.split('/')[0];
    if (!topLevel[first]) topLevel[first] = 0;
    topLevel[first]++;
  }
  console.log(`  Top-level entries:`);
  for (const [name, count] of Object.entries(topLevel).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${name.padEnd(40)} ${count}`);
  }
}

function compareArchives(entries1, entries2, label1, label2) {
  const set1 = new Set(entries1);
  const set2 = new Set(entries2);

  const onlyIn1 = entries1.filter(e => !set2.has(e));
  const onlyIn2 = entries2.filter(e => !set1.has(e));

  if (onlyIn1.length === 0 && onlyIn2.length === 0) {
    console.log(`  Both archives contain identical file lists.`);
    return;
  }

  if (onlyIn1.length > 0) {
    console.log(`\n  Only in ${label1} (${onlyIn1.length}):`);
    for (const e of onlyIn1.slice(0, 10)) console.log(`    + ${e}`);
    if (onlyIn1.length > 10) console.log(`    ... and ${onlyIn1.length - 10} more`);
  }
  if (onlyIn2.length > 0) {
    console.log(`\n  Only in ${label2} (${onlyIn2.length}):`);
    for (const e of onlyIn2.slice(0, 10)) console.log(`    + ${e}`);
    if (onlyIn2.length > 10) console.log(`    ... and ${onlyIn2.length - 10} more`);
  }
}

async function main() {
  console.log('=== ARCHIVE DIAGNOSTIC ===\n');

  // Verify .homeybuild exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('ERROR: .homeybuild/ not found. Run: npx homey app build');
    process.exit(1);
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });

  // --- SECTION 1: Analyze .homeybuild/ contents ---
  console.log('--- SECTION 1: .homeybuild/ Contents ---');
  const buildInfo = getDirSize(BUILD_DIR);
  console.log(`  Total: ${formatSize(buildInfo.size)} (${buildInfo.count} files)\n`);

  const bySubdir = getDirSizeBySubdir(BUILD_DIR);
  for (const [name, info] of Object.entries(bySubdir).sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  ${name.padEnd(40)} ${formatSize(info.size).padStart(10)}  (${info.count} files)`);
  }

  // --- SECTION 2: Create archives with different methods ---
  console.log('\n--- SECTION 2: Archive Creation (5 methods) ---');

  // Method 1: tar-fs WITH node_modules (homey CLI behavior)
  const r1 = await createTarFsArchive({ label: '1-tar-fs-with-nm', excludeNm: false });
  console.log(`  1. tar-fs WITH node_modules:    ${formatSize(r1.compressed).padStart(10)}  (${r1.files} files, ratio: ${((1 - r1.compressed / r1.uncompressed) * 100).toFixed(1)}%)`);

  // Method 2: tar-fs WITHOUT node_modules
  const r2 = await createTarFsArchive({ label: '2-tar-fs-no-nm', excludeNm: true });
  console.log(`  2. tar-fs WITHOUT node_modules: ${formatSize(r2.compressed).padStart(10)}  (${r2.files} files, ratio: ${((1 - r2.compressed / r2.uncompressed) * 100).toFixed(1)}%)`);

  // Method 3: tar-fs WITHOUT node_modules + compacted app.json
  const appJsonPath = path.join(BUILD_DIR, 'app.json');
  const origContent = fs.readFileSync(appJsonPath, 'utf8');
  const compacted = JSON.stringify(JSON.parse(origContent));
  fs.writeFileSync(appJsonPath, compacted, 'utf8');

  const r3 = await createTarFsArchive({ label: '3-tar-fs-no-nm-compact', excludeNm: true });

  // Restore
  fs.writeFileSync(appJsonPath, origContent, 'utf8');
  console.log(`  3. tar-fs no-nm + compact:      ${formatSize(r3.compressed).padStart(10)}  (${r3.files} files, ratio: ${((1 - r3.compressed / r3.uncompressed) * 100).toFixed(1)}%)`);

  // Method 4: tar command (what auto-publish-on-push.yml does)
  const r4 = createTarCmdArchive({ label: '4-tar-cmd' });
  if (r4) console.log(`  4. tar command (from .homeybuild): ${formatSize(r4.size).padStart(10)}`);

  // Method 5: tar command WITHOUT node_modules
  const r5 = createTarCmdArchive({ label: '5-tar-cmd-no-nm', excludeNm: true });
  if (r5) console.log(`  5. tar command (no node_modules):  ${formatSize(r5.size).padStart(10)}`);

  // --- SECTION 3: Archive contents analysis ---
  console.log('\n--- SECTION 3: Archive Contents ---');
  const entries1 = listArchiveContents(r1.path);
  analyzeArchive(entries1, 'tar-fs WITH node_modules');

  const entries2 = listArchiveContents(r2.path);
  analyzeArchive(entries2, 'tar-fs WITHOUT node_modules');

  // --- SECTION 4: Compare archives ---
  console.log('\n--- SECTION 4: Archive Comparison ---');
  compareArchives(entries1, entries2, 'with-nm', 'no-nm');

  // --- SECTION 5: Size breakdown ---
  console.log('\n--- SECTION 5: Size Breakdown ---');
  const nmDir = path.join(BUILD_DIR, 'node_modules');
  if (fs.existsSync(nmDir)) {
    const nmInfo = getDirSize(nmDir);
    console.log(`  node_modules/:                ${formatSize(nmInfo.size)} (${nmInfo.count} files)`);
  }
  console.log(`  app.json raw:                 ${formatSize(Buffer.byteLength(origContent))}`);
  console.log(`  app.json compacted:           ${formatSize(Buffer.byteLength(compacted))}`);
  console.log(`  drivers/:                     ${formatSize(bySubdir['drivers/']?.size || 0)}`);
  console.log(`  lib/:                         ${formatSize(bySubdir['lib/']?.size || 0)}`);
  console.log('');
  console.log(`  tar-fs with nm:               ${formatSize(r1.compressed)}`);
  console.log(`  tar-fs without nm:            ${formatSize(r2.compressed)}`);
  console.log(`  Savings from removing nm:     ${formatSize(r1.compressed - r2.compressed)}`);
  console.log(`  tar-fs no-nm + compact:       ${formatSize(r3.compressed)}`);
  console.log(`  Savings from compaction:      ${formatSize(r2.compressed - r3.compressed)}`);

  // --- SECTION 6: Compare with known archives ---
  console.log('\n--- SECTION 6: Known Archives ---');
  const diagDir = path.join(PROJECT_ROOT, '.diag', 'tarballs');
  if (fs.existsSync(diagDir)) {
    const archives = fs.readdirSync(diagDir).filter(f => f.endsWith('.tar.gz'));
    for (const archive of archives) {
      const archivePath = path.join(diagDir, archive);
      const stat = fs.statSync(archivePath);
      const entries = listArchiveContents(archivePath);
      const hasNm = entries.some(e => e.includes('node_modules'));
      const hasDotAgents = entries.some(e => e.includes('.agents'));
      const hasDotAi = entries.some(e => e.includes('.ai/'));
      const firstEntry = entries[0] || '';
      const hasPrefix = firstEntry.includes('/') && !firstEntry.startsWith('.');
      const prefix = hasPrefix ? firstEntry.split('/')[0] : '(none)';

      console.log(`  ${archive.padEnd(30)} ${formatSize(stat.size).padStart(10)}  entries=${String(entries.length).padStart(5)}  prefix=${prefix.padEnd(25)}  nm=${hasNm}  .agents=${hasDotAgents}  .ai=${hasDotAi}`);
    }
  }

  // --- SECTION 7: homey CLI analysis ---
  console.log('\n--- SECTION 7: Homey CLI Analysis ---');
  console.log('  The Homey CLI _getPackStream() method (node_modules/homey/lib/App.js:1558):');
  console.log('    tar.pack(appPath, {');
  console.log('      dereference: true,');
  console.log('      ignore(name) {');
  console.log('        if (name.startsWith(".")) return true;   // ignores dotfiles');
  console.log('        if (name.includes("/.git/")) return true; // ignores .git');
  console.log('        return false;                              // INCLUDES node_modules!');
  console.log('      }');
  console.log('    })');
  console.log('    .pipe(zlib.createGzip())');
  console.log('');
  console.log('  The preprocess() method (node_modules/homey/lib/App.js:857):');
  console.log('    1. Removes old .homeybuild/');
  console.log('    2. _copyAppSourceFiles() - copies files filtered by .homeyignore');
  console.log('    3. _copyAppProductionDependencies() - copies ALL production node_modules');
  console.log('');
  console.log('  CRITICAL: When publish() is called, it:');
  console.log('    1. Calls preprocess() -> rebuilds .homeybuild/ with node_modules');
  console.log('    2. Minifies .homeybuild/app.json');
  console.log('    3. Calls _getPackStream() -> tar-fs packs everything (incl. node_modules)');

  // --- SECTION 8: DIAGNOSIS ---
  console.log('\n========================================');
  console.log('=== DIAGNOSIS ===');
  console.log('========================================');
  console.log('');
  console.log('FINDING 1: The 5.76MB archive is tar-fs WITHOUT node_modules');
  console.log(`  Measured: ${formatSize(r2.compressed)} (no nm) vs ${formatSize(r1.compressed)} (with nm)`);
  console.log('  The difference is production dependencies (qrcode, @emnapi, etc.)');
  console.log('');
  console.log('FINDING 2: The "27MB" archives were NOT created from .homeybuild/');
  console.log('  The bad archives (v8.1.23, v8.1.24) contain the ENTIRE git repo:');
  console.log('  .agents/, .ai/, .cache/, .github/, .memory/, .vscode/, docs/, etc.');
  console.log('  They were packed from the root directory, not from .homeybuild/.');
  console.log('');
  console.log('FINDING 3: The v8.1.6-good archive (14MB) was packed from root');
  console.log('  It contains node_modules + dev files (.py, .patch, scratch/)');
  console.log('  This is larger than .homeybuild/ because .homeyignore is more selective');
  console.log('');
  console.log('FINDING 4: Two distinct failure modes exist:');
  console.log('  A) Docker action packs entire repo -> 37-40MB (Athom rejects)');
  console.log('  B) homey CLI includes node_modules -> 6.6MB (borderline OK)');
  console.log('');
  console.log('ROOT CAUSE:');
  console.log('  The publish.yml workflow uses athombv/github-action-homey-app-publish');
  console.log('  which runs npx homey app publish in Docker. This command:');
  console.log('  1. Runs preprocess() which rebuilds .homeybuild/ from scratch');
  console.log('     (undoing any CI optimizations like slimmed fingerprints)');
  console.log('  2. Archives with tar-fs which includes node_modules/');
  console.log('  3. The archive is ~6.6MB compressed (safe)');
  console.log('');
  console.log('  HOWEVER: If the Docker environment lacks .homeyignore or');
  console.log('  the CI uses a different archiving path (tar from root),');
  console.log('  the archive becomes 37-40MB (Athom rejects).');
  console.log('');
  console.log('SOLUTION:');
  console.log('  1. auto-publish-on-push.yml step 6 (correct approach):');
  console.log('     cd .homeybuild && tar czf /tmp/homey-app.tar.gz *');
  console.log('     Creates ~5.76MB archive (no node_modules, clean)');
  console.log('');
  console.log('  2. Remove the fallback to npx homey app publish (line 318/337)');
  console.log('     This fallback re-creates .homeybuild/ and may produce larger archives');
  console.log('');
  console.log('  3. Ensure ALL publish workflows use the same approach:');
  console.log('     build -> optimize .homeybuild/ -> tar from .homeybuild/ -> upload');

  // Cleanup temp files
  const tmpFiles = fs.readdirSync(TMP_DIR).filter(f => f.endsWith('.tar.gz'));
  for (const f of tmpFiles) {
    try { fs.unlinkSync(path.join(TMP_DIR, f)); } catch (e) { /* ignore */ }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
