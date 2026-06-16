#!/usr/bin/env node
'use strict';

/**
 * auto-update.js - Automated External Source Updater
 *
 * Checks for new releases from Z2M (zigbee-herdsman-converters),
 * ZHA (zha-device-handlers), and deCONZ (deconz-rest-plugin).
 * Downloads and caches updates, applies changes automatically if safe,
 * and reverts if validation fails.
 *
 * Usage:
 *   node scripts/automation/auto-update.js [--dry-run] [--source=z2m|zha|deconz|all] [--force]
 *
 * Options:
 *   --dry-run     Show what would be updated without making changes
 *   --source      Specific source to update (default: all)
 *   --force       Force re-download even if already cached
 *   --verbose     Detailed output
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ── Configuration ───────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, '.cache', 'auto-update');
const DATA_DIR = path.join(ROOT, 'data');
const COMMUNITY_SYNC_DIR = path.join(DATA_DIR, 'community-sync');
const BACKUP_DIR = path.join(ROOT, '.cache', 'backups');

const SOURCES = {
  z2m: {
    name: 'Zigbee2MQTT (zigbee-herdsman-converters)',
    repo: 'Koenkk/zigbee-herdsman-converters',
    branch: 'master',
    files: [
      { remote: 'src/devices/tuya.ts', local: path.join(COMMUNITY_SYNC_DIR, 'z2m-tuya.ts') },
      { remote: 'src/devices/sonoff.ts', local: path.join(COMMUNITY_SYNC_DIR, 'z2m-sonoff.ts') },
    ],
    releaseUrl: 'https://api.github.com/repos/Koenkk/zigbee-herdsman-converters/releases/latest',
  },
  zha: {
    name: 'ZHA Device Handlers (zhaquirks)',
    repo: 'zigpy/zha-device-handlers',
    branch: 'dev',
    files: [
      { remote: 'zhaquirks/tuya/__init__.py', local: path.join(COMMUNITY_SYNC_DIR, 'zha-tuya-init.py') },
      { remote: 'zhaquirks/tuya/ts0601.py', local: path.join(COMMUNITY_SYNC_DIR, 'zha-tuya-ts0601.py') },
    ],
    releaseUrl: 'https://api.github.com/repos/zigpy/zha-device-handlers/releases/latest',
  },
  deconz: {
    name: 'deCONZ REST Plugin',
    repo: 'dresden-elektronik/deconz-rest-plugin',
    branch: 'master',
    files: [
      { remote: 'devices.json', local: path.join(COMMUNITY_SYNC_DIR, 'deconz-devices.json') },
    ],
    releaseUrl: 'https://api.github.com/repos/dresden-elektronik/deconz-rest-plugin/releases/latest',
  },
};

// ── CLI Arguments ───────────────────────────────────────────────────────────

const ARGS = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  verbose: process.argv.includes('--verbose'),
  source: (() => {
    const src = process.argv.find((a) => a.startsWith('--source='));
    return src ? src.split('=')[1] : 'all';
  })(),
};

// ── Logging ─────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`[AUTO-UPDATE] ${msg}`);
const warn = (msg) => console.warn(`[AUTO-UPDATE] WARNING: ${msg}`);
const error = (msg) => console.error(`[AUTO-UPDATE] ERROR: ${msg}`);
const verbose = (msg) => { if (ARGS.verbose) console.log(`[VERBOSE] ${msg}`); };

// ── HTTP ────────────────────────────────────────────────────────────────────

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : require('http');

    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TuyaZigbee-AutoUpdate/1.0',
        Accept: 'application/vnd.github.v3+json',
        ...options.headers,
      },
      timeout: 30000,
    };

    const req = transport.get(reqOptions, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpGet(res.headers.location, options).then(resolve, reject);
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

function httpGetRaw(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : require('http');

    const req = transport.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': 'TuyaZigbee-AutoUpdate/1.0' },
      timeout: 60000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpGetRaw(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── Utilities ───────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  ensureDir(BACKUP_DIR);
  const basename = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, `${basename}.${Date.now()}.bak`);

  fs.copyFileSync(filePath, backupPath);
  verbose(`Backed up: ${basename} -> ${path.basename(backupPath)}`);
  return backupPath;
}

function revertFile(backupPath, originalPath) {
  if (backupPath && fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, originalPath);
    log(`Reverted: ${path.basename(originalPath)} from backup`);
    return true;
  }
  return false;
}

function hashContent(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// ── Version Tracking ────────────────────────────────────────────────────────

function loadVersionCache() {
  const cachePath = path.join(CACHE_DIR, 'versions.json');
  try {
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath));
    }
  } catch (_e) { /* fall through */ }
  return {};
}

function saveVersionCache(cache) {
  ensureDir(CACHE_DIR);
  fs.writeFileSync(path.join(CACHE_DIR, 'versions.json'), JSON.stringify(cache, null, 2));
}

// ── Core Update Logic ───────────────────────────────────────────────────────

async function checkLatestRelease(source) {
  const config = SOURCES[source];
  if (!config) throw new Error(`Unknown source: ${source}`);

  log(`Checking latest release for ${config.name}...`);

  try {
    const { body } = await httpGet(config.releaseUrl);
    const release = JSON.parse(body);

    return {
      tag: release.tag_name || release.target_commitish || 'unknown',
      name: release.name || release.tag_name,
      publishedAt: release.published_at,
      tarballUrl: release.tarball_url,
      zipballUrl: release.zipball_url,
      body: release.body || '',
    };
  } catch (err) {
    warn(`Could not fetch release info for ${source}: ${err.message}`);

    // Fallback: use branch HEAD
    return {
      tag: `HEAD-${config.branch}`,
      name: `Latest ${config.branch} HEAD`,
      publishedAt: new Date().toISOString(),
      tarballUrl: null,
      zipballUrl: null,
      body: 'Using branch HEAD (no release found)',
    };
  }
}

async function downloadFileFromGitHub(repo, filePath, branch = 'master') {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
  verbose(`Downloading: ${url}`);

  const { body } = await httpGet(url);
  return body;
}

async function updateSource(source, dryRun = false) {
  const config = SOURCES[source];
  if (!config) {
    error(`Unknown source: ${source}`);
    return { success: false, error: `Unknown source: ${source}` };
  }

  log(`\n=== Updating: ${config.name} ===`);

  const results = {
    source,
    name: config.name,
    files: [],
    success: true,
    skipped: false,
  };

  // Check version cache
  const versionCache = loadVersionCache();
  const releaseInfo = await checkLatestRelease(source);
  const cachedVersion = versionCache[source];

  if (!ARGS.force && cachedVersion && cachedVersion.tag === releaseInfo.tag) {
    log(`Already up to date (${releaseInfo.tag}). Use --force to re-download.`);
    results.skipped = true;
    results.version = releaseInfo.tag;
    return results;
  }

  log(`New version available: ${releaseInfo.tag} (was: ${cachedVersion?.tag || 'none'})`);
  log(`Published: ${releaseInfo.publishedAt || 'unknown'}`);

  ensureDir(COMMUNITY_SYNC_DIR);

  for (const file of config.files) {
    const result = {
      remote: file.remote,
      local: file.local,
      status: 'pending',
      backup: null,
    };

    try {
      const content = await downloadFileFromGitHub(config.repo, file.remote, config.branch);
      const newHash = hashContent(content);

      // Check if content changed
      if (!ARGS.force && fs.existsSync(file.local)) {
        const existing = fs.readFileSync(file.local);
        const existingHash = hashContent(existing.toString());

        if (existingHash === newHash) {
          log(`  ${file.remote} -> unchanged (hash: ${newHash})`);
          result.status = 'unchanged';
          results.files.push(result);
          continue;
        }
      }

      if (dryRun) {
        log(`  [DRY-RUN] Would update: ${file.remote} -> ${file.local}`);
        log(`    New hash: ${newHash}`);
        result.status = 'would-update';
        results.files.push(result);
        continue;
      }

      // Backup existing file
      result.backup = backupFile(file.local);

      // Write new content
      fs.writeFileSync(file.local, content, 'utf8');
      log(`  Updated: ${file.remote} -> ${file.local} (hash: ${newHash})`);
      result.status = 'updated';
      result.hash = newHash;
    } catch (err) {
      error(`  Failed to update ${file.remote}: ${err.message}`);
      result.status = 'error';
      result.error = err.message;
      results.success = false;

      // Attempt revert on failure
      if (result.backup) {
        revertFile(result.backup, file.local);
      }
    }

    results.files.push(result);
  }

  // Update version cache
  if (results.success && !dryRun) {
    versionCache[source] = {
      tag: releaseInfo.tag,
      updatedAt: new Date().toISOString(),
    };
    saveVersionCache(versionCache);
  }

  return results;
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateUpdatedFiles() {
  log('\n=== Validating updated files ===');
  let valid = true;

  // Check that all community-sync files are valid
  if (!fs.existsSync(COMMUNITY_SYNC_DIR)) {
    log('No community-sync directory found - nothing to validate');
    return true;
  }

  const files = fs.readdirSync(COMMUNITY_SYNC_DIR);
  for (const file of files) {
    const filePath = path.join(COMMUNITY_SYNC_DIR, file);

    if (file.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(filePath);
        JSON.parse(raw);
        verbose(`  ${file}: valid JSON`);
      } catch (err) {
        error(`  ${file}: INVALID JSON - ${err.message}`);
        valid = false;
      }
    }

    // Check file size (warn if suspiciously large)
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 5 * 1024 * 1024) { // 5MB
        warn(`  ${file}: Large file (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
      }
    } catch (_e) { /* skip */ }
  }

  if (valid) {
    log('All updated files validated successfully');
  } else {
    error('Validation failed for some files');
  }

  return valid;
}

function revertAllChanges(allResults) {
  log('\n=== Reverting all changes due to validation failure ===');

  let reverted = 0;
  for (const result of allResults) {
    for (const file of result.files) {
      if (file.status === 'updated' && file.backup) {
        if (revertFile(file.backup, file.local)) {
          reverted++;
        }
      }
    }
  }

  // Clear version cache for reverted sources
  const versionCache = loadVersionCache();
  for (const result of allResults) {
    if (!result.success) {
      delete versionCache[result.source];
    }
  }
  saveVersionCache(versionCache);

  log(`Reverted ${reverted} file(s)`);
}

// ── Diff Report ─────────────────────────────────────────────────────────────

function generateDiffReport(allResults) {
  const reportPath = path.join(CACHE_DIR, 'last-update-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: ARGS.dryRun,
    results: allResults,
    summary: {
      sourcesChecked: allResults.length,
      sourcesUpdated: allResults.filter((r) => r.files.some((f) => f.status === 'updated')).length,
      sourcesSkipped: allResults.filter((r) => r.skipped).length,
      filesUpdated: allResults.reduce((sum, r) => sum + r.files.filter((f) => f.status === 'updated').length, 0),
      filesUnchanged: allResults.reduce((sum, r) => sum + r.files.filter((f) => f.status === 'unchanged').length, 0),
      errors: allResults.reduce((sum, r) => sum + r.files.filter((f) => f.status === 'error').length, 0),
      allSuccess: allResults.every((r) => r.success || r.skipped),
    },
  };

  ensureDir(CACHE_DIR);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('Tuya Zigbee Auto-Update System v1.0.0');
  log(`Mode: ${ARGS.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  log(`Source: ${ARGS.source}`);
  log(`Force: ${ARGS.force}`);
  log('');

  // Determine which sources to update
  const sourcesToUpdate = ARGS.source === 'all'
    ? Object.keys(SOURCES)
    : [ARGS.source];

  // Validate source names
  for (const src of sourcesToUpdate) {
    if (!SOURCES[src]) {
      error(`Unknown source: ${src}. Valid sources: ${Object.keys(SOURCES).join(', ')}`);
      process.exit(1);
    }
  }

  const allResults = [];

  for (const source of sourcesToUpdate) {
    try {
      const result = await updateSource(source, ARGS.dryRun);
      allResults.push(result);
    } catch (err) {
      error(`Failed to update ${source}: ${err.message}`);
      allResults.push({
        source,
        name: SOURCES[source]?.name || source,
        success: false,
        error: err.message,
        files: [],
      });
    }
  }

  // Validate all updated files (unless dry-run)
  let validationPassed = true;
  if (!ARGS.dryRun) {
    validationPassed = validateUpdatedFiles();
  }

  // Revert on validation failure
  if (!validationPassed && !ARGS.dryRun) {
    revertAllChanges(allResults);
  }

  // Generate report
  const report = generateDiffReport(allResults);

  // Print summary
  log('\n=== Update Summary ===');
  log(`Sources checked: ${report.summary.sourcesChecked}`);
  log(`Sources updated: ${report.summary.sourcesUpdated}`);
  log(`Sources skipped (up to date): ${report.summary.sourcesSkipped}`);
  log(`Files updated: ${report.summary.filesUpdated}`);
  log(`Files unchanged: ${report.summary.filesUnchanged}`);
  log(`Errors: ${report.summary.errors}`);
  log(`Overall: ${report.summary.allSuccess ? 'SUCCESS' : 'FAILED'}`);

  if (report.summary.filesUpdated > 0 && !ARGS.dryRun) {
    log('\nRun the following to apply fingerprint changes:');
    log('  node scripts/automation/generate-mapping-db.js');
  }

  process.exit(report.summary.allSuccess ? 0 : 1);
}

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  if (ARGS.verbose) console.error(err.stack);
  process.exit(2);
});
