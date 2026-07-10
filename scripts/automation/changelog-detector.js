#!/usr/bin/env node
'use strict';

/**
 * changelog-detector.js - External Source Changelog Detector v1.0.0
 * ==========================================================================
 * Monitors external source files for changes by comparing content hashes.
 * Only fetches new data when the source has actually changed, avoiding
 * unnecessary network traffic and processing.
 *
 * Monitors:
 *   - Z2M tuya.ts (6h TTL)
 *   - Z2M index.ts (6h TTL)
 *   - ZHA quirks __init__.py, ts0601.py (12h TTL)
 *   - deCONZ devices.json (24h TTL)
 *   - Phoscon compatibility page (7d TTL)
 *   - Blakadder devices (7d TTL)
 *
 * Stores last-known hashes in .cache/hashes/
 *
 * Usage:
 *   node scripts/automation/changelog-detector.js                # check all sources
 *   node scripts/automation/changelog-detector.js --source=z2m  # check specific source
 *   node scripts/automation/changelog-detector.js --reset        # clear all hashes
 *   node scripts/automation/changelog-detector.js --report       # JSON report
 *   node scripts/automation/changelog-detector.js --watch        # continuous monitoring
 *   node scripts/automation/changelog-detector.js --verbose      # detailed output
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Lazy-load UrlCacheManager ─────────────────────────────────────────────────
let UrlCacheManager;
try {
  UrlCacheManager = require('./url-cache-manager');
} catch {
  // Inline minimal fallback
  const https = require('https');
  const http = require('http');
  UrlCacheManager = class {
    async fetchOrGet(id, url) {
      return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, { timeout: 60000, headers: { 'User-Agent': 'ChangelogDetector/1.0' } }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const loc = res.headers.location;
            const locUrl = loc.startsWith('http') ? loc : new URL(loc, url).href;
            return this.fetchOrGet(id, locUrl).then(resolve, reject);
          }
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => resolve({ data: body, sha256: crypto.createHash('sha256').update(body).digest('hex'), cached: false }));
        }).on('error', reject);
      });
    }
  };
}

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const HASH_DIR = path.join(REPO_ROOT, '.cache', 'hashes');
const HASH_FILE = path.join(HASH_DIR, 'source-hashes.json');
const CHANGELOG_DIR = path.join(REPO_ROOT, '.cache', 'changelogs');

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m',
};
const log = (c, ...a) => console.log(`${c}[CHANGELOG]${C.X} ${a.join(' ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SOURCES = {
  'z2m-tuya': {
    name: 'Z2M tuya.ts',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    ttl: 6 * 60 * 60 * 1000,
    category: 'z2m',
    parser: 'tuya-ts',
  },
  'z2m-index': {
    name: 'Z2M index.ts',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/index.ts',
    ttl: 6 * 60 * 60 * 1000,
    category: 'z2m',
    parser: 'index-ts',
  },
  'zha-init': {
    name: 'ZHA __init__.py',
    url: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
    ttl: 12 * 60 * 60 * 1000,
    category: 'zha',
    parser: 'zha-py',
  },
  'zha-ts0601': {
    name: 'ZHA ts0601.py',
    url: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0601.py',
    ttl: 12 * 60 * 60 * 1000,
    category: 'zha',
    parser: 'zha-py',
  },
  'deconz-devices': {
    name: 'deCONZ devices.json',
    url: 'https://api.github.com/repos/dresden-elektronik/deconz-rest-plugin/contents/devices/tuya',
    ttl: 24 * 60 * 60 * 1000,
    category: 'deconz',
    parser: 'json',
  },
  'phoscon-compatible': {
    name: 'Phoscon Compatible',
    url: 'https://www.phoscon.de/en/conbee2/compatible',
    ttl: 7 * 24 * 60 * 60 * 1000,
    category: 'phoscon',
    parser: 'html',
  },
  'blakadder-devices': {
    name: 'Blakadder DB',
    url: 'https://zigbee.blakadder.com/all.html',
    ttl: 7 * 24 * 60 * 60 * 1000,
    category: 'blakadder',
    parser: 'html',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ChangelogDetector CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ChangelogDetector {
  constructor(options = {}) {
    this.hashFile = options.hashFile || HASH_FILE;
    this.changelogDir = options.changelogDir || CHANGELOG_DIR;
    this.verbose = options.verbose || false;
    this.cache = new UrlCacheManager({ verbose: this.verbose });
    this._knownHashes = this._loadHashes();
    this._results = [];
  }

  // ── Hash storage ───────────────────────────────────────────────────────────

  _loadHashes() {
    this._ensureDir(path.dirname(this.hashFile));
    try {
      if (fs.existsSync(this.hashFile)) {
        return JSON.parse(fs.readFileSync(this.hashFile));
      }
    } catch {
      // corrupted, start fresh
    }
    return {};
  }

  _saveHashes() {
    this._ensureDir(path.dirname(this.hashFile));
    fs.writeFileSync(this.hashFile, JSON.stringify(this._knownHashes, null, 2));
  }

  _ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // ── Core detection ─────────────────────────────────────────────────────────

  /**
   * Check a single source for changes.
   * Returns { id, name, changed, isFirstFetch, previousHash, currentHash, timestamp }
   */
  async checkSource(sourceId) {
    const source = SOURCES[sourceId];
    if (!source) throw new Error(`Unknown source: ${sourceId}`);

    const previousHash = this._knownHashes[sourceId]?.hash || null;
    const lastChecked = this._knownHashes[sourceId]?.lastChecked || null;

    try {
      const result = await this.cache.fetchOrGet(sourceId, source.url, { force: false });
      const currentHash = result.sha256;
      const changed = previousHash !== null && previousHash !== currentHash;
      const isFirstFetch = previousHash === null;

      const entry = {
        id: sourceId,
        name: source.name,
        category: source.category,
        changed,
        isFirstFetch,
        previousHash,
        currentHash,
        timestamp: new Date().toISOString(),
        dataLength: result.data.length,
        cached: result.cached,
      };

      // Update stored hash
      this._knownHashes[sourceId] = {
        hash: currentHash,
        lastChecked: entry.timestamp,
        dataLength: result.data.length,
        changed,
      };

      this._results.push(entry);

      if (this.verbose) {
        if (changed) {
          log(C.Y, `CHANGED  ${source.name} (${previousHash?.substring(0, 8)} -> ${currentHash.substring(0, 8)})`);
        } else if (isFirstFetch) {
          log(C.B, `NEW      ${source.name} (hash=${currentHash.substring(0, 8)})`);
        } else {
          log(C.G, `unchanged ${source.name}`);
        }
      }

      return entry;
    } catch (err) {
      const entry = {
        id: sourceId,
        name: source.name,
        category: source.category,
        changed: false,
        isFirstFetch: previousHash === null,
        previousHash,
        currentHash: null,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
      this._results.push(entry);
      log(C.R, `ERROR    ${source.name}: ${err.message}`);
      return entry;
    }
  }

  /**
   * Check all sources (or a filtered subset).
   */
  async checkAll(categoryFilter = null) {
    const sourceIds = Object.keys(SOURCES);
    const filtered = categoryFilter
      ? sourceIds.filter(id => SOURCES[id].category === categoryFilter)
      : sourceIds;

    log(C.B, `Checking ${filtered.length} sources...`);
    const startTime = Date.now();

    for (const id of filtered) {
      await this.checkSource(id);
    }

    this._saveHashes();

    const elapsed = Date.now() - startTime;
    const changed = this._results.filter(r => r.changed);
    const errors = this._results.filter(r => r.error);
    const unchanged = this._results.filter(r => !r.changed && !r.error);

    console.log(`\n=== Change Detection Complete (${(elapsed / 1000).toFixed(1)}s) ===`);
    console.log(`  Changed:    ${C.Y}${changed.length}${C.X}`);
    console.log(`  Unchanged:  ${C.G}${unchanged.length}${C.X}`);
    console.log(`  Errors:     ${C.R}${errors.length}${C.X}`);

    if (changed.length > 0) {
      console.log(`\n${C.Y}Changed sources:${C.X}`);
      for (const r of changed) {
        console.log(`  * ${r.name} (${r.previousHash?.substring(0, 8)} -> ${r.currentHash.substring(0, 8)})`);
      }
    }

    return {
      changed: changed.map(r => r.id),
      unchanged: unchanged.map(r => r.id),
      errors: errors.map(r => ({ id: r.id, error: r.error })),
      results: this._results,
    };
  }

  /**
   * Check if any source has changed since the last check.
   * Useful for GitHub Actions to skip unnecessary work.
   */
  async hasChanges(categoryFilter = null) {
    const report = await this.checkAll(categoryFilter);
    return report.changed.length > 0;
  }

  /**
   * Generate a human-readable changelog report.
   */
  generateReport() {
    const changed = this._results.filter(r => r.changed);
    const lines = ['# External Source Change Report', `Generated: ${new Date().toISOString()}`, ''];

    if (changed.length === 0) {
      lines.push('No changes detected since last check.');
    } else {
      lines.push(`## ${changed.length} source(s) changed\n`);
      for (const r of changed) {
        lines.push(`### ${r.name}`);
        lines.push(`- Previous hash: \`${r.previousHash || 'N/A'}\``);
        lines.push(`- Current hash:  \`${r.currentHash}\``);
        lines.push(`- Checked at: ${r.timestamp}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  reset() {
    this._knownHashes = {};
    this._saveHashes();
    log(C.Y, 'All stored hashes cleared.');
  }

  resetSource(sourceId) {
    delete this._knownHashes[sourceId];
    this._saveHashes();
    log(C.Y, `Hash cleared for ${sourceId}.`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

async function cli() {
  const args = process.argv.slice(2);
  const flag = (name) => args.some(a => a === `--${name}`);
  const opt = (name) => {
    const a = args.find(x => x.startsWith(`--${name}=`));
    return a ? a.split('=').slice(1).join('=') : null;
  };

  const detector = new ChangelogDetector({ verbose: flag('verbose') });

  if (flag('reset')) {
    detector.reset();
    return;
  }

  if (flag('report')) {
    const report = await detector.checkAll(opt('source'));
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Default: check all sources
  const result = await detector.checkAll(opt('source'));

  // Exit code: 0 = no changes, 1 = changes detected (useful for CI)
  if (opt('exit-on-change') && result.changed.length > 0) {
    process.exit(1);
  }
}

// ── Export & run ──────────────────────────────────────────────────────────────
module.exports = ChangelogDetector;

if (require.main === module) {
  cli().catch((err) => {
    console.error(`[CHANGELOG] Fatal: ${err.message}`);
    process.exit(1);
  });
}
