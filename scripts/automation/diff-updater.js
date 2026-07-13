#!/usr/bin/env node
'use strict';

/**
 * diff-updater.js - Diff-Based Incremental Updater
 *
 * Fetches only changed portions of remote files using git-style diffs.
 * Minimizes bandwidth usage by comparing local and remote versions and
 * applying only the delta. Supports incremental updates for large files.
 *
 * Usage:
 *   node scripts/automation/diff-updater.js [--dry-run] [--source=z2m|zha|deconz|all] [--verbose]
 *
 * Options:
 *   --dry-run     Show what would change without modifying files
 *   --source      Specific source to update (default: all)
 *   --verbose     Show detailed diff output
 *   --force       Force full re-download (bypass diff)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ── Configuration ───────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, '.cache', 'diff-updater');
const COMMUNITY_SYNC_DIR = path.join(ROOT, 'data', 'community-sync');

const DIFF_SOURCES = {
  z2m: {
    name: 'Zigbee2MQTT',
    repo: 'Koenkk/zigbee-herdsman-converters',
    branch: 'master',
    files: [
      'src/devices/tuya.ts',
      'src/devices/sonoff.ts',
    ],
  },
  zha: {
    name: 'ZHA Device Handlers',
    repo: 'zigpy/zha-device-handlers',
    branch: 'dev',
    files: [
      'zhaquirks/tuya/__init__.py',
      'zhaquirks/tuya/ts0601.py',
    ],
  },
  deconz: {
    name: 'deCONZ REST Plugin',
    repo: 'dresden-elektronik/deconz-rest-plugin',
    branch: 'master',
    files: [
      'devices.json',
    ],
  },
};

// ── CLI ─────────────────────────────────────────────────────────────────────

const ARGS = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  force: process.argv.includes('--force'),
  source: (() => {
    const s = process.argv.find((a) => a.startsWith('--source='));
    return s ? s.split('=')[1] : 'all';
  })(),
};

const log = (msg) => console.log(`[DIFF-UPDATER] ${msg}`);
const verbose = (msg) => { if (ARGS.verbose) console.log(`[VERBOSE] ${msg}`); };
const error = (msg) => console.error(`[DIFF-UPDATER] ERROR: ${msg}`);

// ── HTTP ────────────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : require('http');

    const req = transport.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TuyaZigbee-DiffUpdater/1.0',
        Accept: 'application/vnd.github.v3.diff',
      },
      timeout: 60000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpGet(res.headers.location).then(resolve, reject);
        return;
      }

      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function httpGetText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : require('http');

    const req = transport.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': 'TuyaZigbee-DiffUpdater/1.0' },
      timeout: 60000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpGetText(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── Utilities ───────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function contentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function shortHash(content) {
  return contentHash(content).substring(0, 12);
}

// ── Diff Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a unified diff and return structured hunks.
 * Each hunk has: oldStart, oldLines, newStart, newLines, changes[]
 * where changes are prefixed with +, -, or space (context).
 */
function parseDiff(diffText) {
  const lines = diffText.split('\n');
  const hunks = [];
  let currentHunk = null;

  for (const line of lines) {
    // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        oldStart: parseInt(hunkMatch[1]),
        oldLines: parseInt(hunkMatch[2] || '1'),
        newStart: parseInt(hunkMatch[3]),
        newLines: parseInt(hunkMatch[4] || '1'),
        changes: [],
      };
      continue;
    }

    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.changes.push({ type: 'add', content: line.substring(1) });
      } else if (line.startsWith('-')) {
        currentHunk.changes.push({ type: 'remove', content: line.substring(1) });
      } else if (line.startsWith(' ')) {
        currentHunk.changes.push({ type: 'context', content: line.substring(1) });
      }
    }
  }

  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}

/**
 * Apply a parsed diff to local content.
 * Returns the new content or throws on conflict.
 */
function applyDiff(localContent, hunks) {
  const localLines = localContent.split('\n');

  // Apply hunks in reverse order to preserve line numbers
  const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    const insertions = [];
    const deletions = 0;

    let localIdx = hunk.oldStart - 1; // 0-indexed
    let changedCount = 0;

    for (const change of hunk.changes) {
      if (change.type === 'remove') {
        if (localLines[localIdx] !== undefined &&
            localLines[localIdx].trimEnd() === change.content.trimEnd()) {
          localLines.splice(localIdx, 1);
          changedCount++;
        } else {
          // Conflict: line content mismatch
          throw new Error(
            `Diff conflict at line ${hunk.oldStart + changedCount}: ` +
            `expected "${change.content.substring(0, 50)}" ` +
            `but found "${(localLines[localIdx] || '').substring(0, 50)}"`
          );
        }
      } else if (change.type === 'add') {
        localLines.splice(localIdx, 0, change.content);
        localIdx++;
        changedCount++;
      } else {
        // Context line - just advance
        localIdx++;
      }
    }
  }

  return localLines.join('\n');
}

/**
 * Compute line-level diff statistics between old and new content.
 */
function diffStats(oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const added = newLines.filter((l) => !oldLines.includes(l)).length;
  const removed = oldLines.filter((l) => !newLines.includes(l)).length;
  const modified = Math.min(added, removed);

  return {
    totalOld: oldLines.length,
    totalNew: newLines.length,
    added: added - modified,
    removed: removed - modified,
    modified,
  };
}

// ── Fetch with Diff Support ─────────────────────────────────────────────────

async function fetchDiff(repo, filePath, branch) {
  // Try GitHub diff API first
  const diffUrl = `https://api.github.com/repos/${repo}/compare/${branch}~1:${filePath}...${branch}:${filePath}`;

  try {
    const { status, body } = await httpGet(diffUrl);
    if (status === 200) {
      const data = JSON.parse(body);
      if (data.diff) {
        return { type: 'unified', diff: data.diff, patch: data.patch };
      }
    }
  } catch (_e) {
    // Fall through to raw file download
  }

  // Fallback: download full file
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
  const content = await httpGetText(rawUrl);
  return { type: 'full', content };
}

// ── Core Update Logic ───────────────────────────────────────────────────────

function getLocalPath(repoPath) {
  const basename = path.basename(repoPath);
  const dirname = path.dirname(repoPath);
  const parts = dirname.split('/');
  const prefix = parts[parts.length - 1] || 'root';

  return path.join(COMMUNITY_SYNC_DIR, `${prefix}-${basename}`);
}

async function updateFileWithDiff(source, repoPath, dryRun = false) {
  const config = DIFF_SOURCES[source];
  const localPath = getLocalPath(repoPath);
  const result = {
    remote: repoPath,
    local: localPath,
    status: 'pending',
    stats: null,
  };

  try {
    // Fetch diff from GitHub
    const diffResult = await fetchDiff(config.repo, repoPath, config.branch);

    if (diffResult.type === 'full') {
      // Full file download (diff not available)
      verbose(`  No diff available for ${repoPath}, downloading full file`);

      if (fs.existsSync(localPath)) {
        const localContent = fs.readFileSync(localPath, 'utf8');
        const localHash = shortHash(localContent);
        const remoteHash = shortHash(diffResult.content);

        if (localHash === remoteHash) {
          log(`  ${repoPath}: unchanged`);
          result.status = 'unchanged';
          return result;
        }

        result.stats = diffStats(localContent, diffResult.content);
      } else {
        result.stats = { totalOld: 0, totalNew: diffResult.content.split('\n').length, added: diffResult.content.split('\n').length, removed: 0, modified: 0 };
      }

      if (dryRun) {
        log(`  [DRY-RUN] Would download: ${repoPath} -> ${localPath}`);
        if (result.stats) {
          log(`    +${result.stats.added} -${result.stats.removed} ~${result.stats.modified} lines`);
        }
        result.status = 'would-update';
        return result;
      }

      ensureDir(path.dirname(localPath));
      fs.writeFileSync(localPath, diffResult.content, 'utf8');
      log(`  Updated: ${repoPath} -> ${localPath}`);
      result.status = 'updated';
      return result;
    }

    // Diff-based update
    const hunks = parseDiff(diffResult.diff || diffResult.patch || '');

    if (hunks.length === 0) {
      log(`  ${repoPath}: no changes in diff`);
      result.status = 'unchanged';
      return result;
    }

    const totalChanges = hunks.reduce((sum, h) => sum + h.changes.filter((c) => c.type !== 'context').length, 0);

    if (dryRun) {
      log(`  [DRY-RUN] Would apply diff to: ${repoPath}`);
      log(`    ${hunks.length} hunks, ${totalChanges} line changes`);
      for (const hunk of hunks) {
        const adds = hunk.changes.filter((c) => c.type === 'add').length;
        const dels = hunk.changes.filter((c) => c.type === 'remove').length;
        log(`    @@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@ (+${adds} -${dels})`);
      }
      result.status = 'would-update';
      result.stats = { hunks: hunks.length, changes: totalChanges };
      return result;
    }

    // Apply diff to local file
    if (fs.existsSync(localPath)) {
      const localContent = fs.readFileSync(localPath, 'utf8');
      try {
        const newContent = applyDiff(localContent, hunks);
        result.stats = diffStats(localContent, newContent);

        ensureDir(path.dirname(localPath));
        fs.writeFileSync(localPath, newContent, 'utf8');
        log(`  Applied diff: ${repoPath} (+${result.stats.added} -${result.stats.removed} ~${result.stats.modified})`);
        result.status = 'updated';
      } catch (err) {
        error(`  Diff conflict on ${repoPath}: ${err.message}`);
        result.status = 'conflict';
        result.error = err.message;
      }
    } else {
      // Local file doesn't exist, need full download
      const rawUrl = `https://raw.githubusercontent.com/${config.repo}/${config.branch}/${repoPath}`;
      const content = await httpGetText(rawUrl);

      ensureDir(path.dirname(localPath));
      fs.writeFileSync(localPath, content, 'utf8');
      result.stats = { totalNew: content.split('\n').length, added: content.split('\n').length, removed: 0, modified: 0 };
      log(`  Downloaded new: ${repoPath} -> ${localPath}`);
      result.status = 'updated';
    }

    return result;
  } catch (err) {
    error(`  Failed: ${repoPath}: ${err.message}`);
    result.status = 'error';
    result.error = err.message;
    return result;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('Tuya Zigbee Diff-Based Updater v1.0.0');
  log(`Mode: ${ARGS.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  log(`Source: ${ARGS.source}`);
  log('');

  const sourcesToUpdate = ARGS.source === 'all'
    ? Object.keys(DIFF_SOURCES)
    : [ARGS.source];

  for (const src of sourcesToUpdate) {
    if (!DIFF_SOURCES[src]) {
      error(`Unknown source: ${src}. Valid: ${Object.keys(DIFF_SOURCES).join(', ')}`);
      process.exit(1);
    }
  }

  ensureDir(COMMUNITY_SYNC_DIR);

  const allResults = [];
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let totalErrors = 0;

  for (const source of sourcesToUpdate) {
    const config = DIFF_SOURCES[source];
    log(`\n=== ${config.name} ===`);

    for (const filePath of config.files) {
      const result = await updateFileWithDiff(source, filePath, ARGS.dryRun);
      allResults.push(result);

      switch (result.status) {
        case 'updated': totalUpdated++; break;
        case 'unchanged': totalUnchanged++; break;
        case 'error':
        case 'conflict': totalErrors++; break;
        default: break;
      }
    }
  }

  // Summary
  log('\n=== Diff Update Summary ===');
  log(`Files updated: ${totalUpdated}`);
  log(`Files unchanged: ${totalUnchanged}`);
  log(`Errors/conflicts: ${totalErrors}`);

  if (totalErrors > 0) {
    log('\nErrors occurred. Check individual file results above.');
  }

  if (totalUpdated > 0 && !ARGS.dryRun) {
    log('\nApply the following to integrate updates:');
    log('  node scripts/automation/generate-mapping-db.js');
    log('  node scripts/automation/optimize-fingerprints.js');
  }

  // Save report
  const reportPath = path.join(CACHE_DIR, 'last-diff-report.json');
  ensureDir(CACHE_DIR);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun: ARGS.dryRun,
    results: allResults,
    summary: { updated: totalUpdated, unchanged: totalUnchanged, errors: totalErrors },
  }, null, 2));

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  if (ARGS.verbose) console.error(err.stack);
  process.exit(2);
});
