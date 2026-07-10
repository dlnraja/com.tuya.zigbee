#!/usr/bin/env node
'use strict';

/**
 * url-cache-manager.js - Centralized URL Cache Manager v1.0.0
 * ==========================================================================
 * Maintains a cache of all external URLs with timestamps, checks staleness
 * via configurable TTL per URL type, fetches fresh data when stale, stores
 * cache in .cache/urls/ directory, and logs cache hits/misses.
 *
 * Designed as a shared module for all automation scripts. Can also run as a
 * standalone CLI to pre-warm or invalidate the cache.
 *
 * Usage (CLI):
 *   node scripts/automation/url-cache-manager.js                        # warm all URLs
 *   node scripts/automation/url-cache-manager.js --invalidate           # clear all caches
 *   node scripts/automation/url-cache-manager.js --invalidate=<id>     # clear one entry
 *   node scripts/automation/url-cache-manager.js --stats               # show cache stats
 *   node scripts/automation/url-cache-manager.js --fetch=<id>          # force-fetch one URL
 *   node scripts/automation/url-cache-manager.js --list                # list cached URLs
 *
 * Usage (module):
 *   const UrlCacheManager = require('./url-cache-manager');
 *   const cache = new UrlCacheManager();
 *   const result = await cache.fetchOrGet('z2m-tuya', 'https://...');
 *   // result = { data, sha256, cached, sourceId, fetchedAt }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'urls');
const CACHE_INDEX = path.join(CACHE_DIR, '_index.json');

// ── Default TTLs per URL type (milliseconds) ──────────────────────────────────
const DEFAULT_TTLS = {
  'z2m':        6 * 60 * 60 * 1000,   // 6 hours
  'zha':       12 * 60 * 60 * 1000,   // 12 hours
  'deconz':    24 * 60 * 60 * 1000,   // 24 hours (daily)
  'phoscon':   7 * 24 * 60 * 60 * 1000, // 7 days (weekly)
  'blakadder': 7 * 24 * 60 * 60 * 1000, // 7 days (weekly)
  'hubitat':   24 * 60 * 60 * 1000,   // daily
  'smartthings': 24 * 60 * 60 * 1000, // daily
  'iobroker':  24 * 60 * 60 * 1000,   // daily
  'domoticz':  24 * 60 * 60 * 1000,   // daily
  'zigpy':     12 * 60 * 60 * 1000,   // 12 hours
  'community':  6 * 60 * 60 * 1000,   // 6 hours
  'default':    6 * 60 * 60 * 1000,   // 6 hours
};

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};

function log(c, ...a) { console.log(`${c}[URL-CACHE]${C.X} ${a.join(' ')}`); }

// ═══════════════════════════════════════════════════════════════════════════════
// UrlCacheManager CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class UrlCacheManager {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || CACHE_DIR;
    this.cacheIndex = options.cacheIndex || path.join(this.cacheDir, '_index.json');
    this.ttls = { ...DEFAULT_TTLS, ...(options.ttls || {}) };
    this.verbose = options.verbose || false;
    this._index = this._loadIndex();
  }

  // ── Index management ───────────────────────────────────────────────────────

  _loadIndex() {
    try {
      if (fs.existsSync(this.cacheIndex)) {
        return JSON.parse(fs.readFileSync(this.cacheIndex));
      }
    } catch {
      // corrupted index, start fresh
    }
    return { entries: {}, stats: { totalHits: 0, totalMisses: 0, totalFetches: 0 } };
  }

  _saveIndex() {
    this._ensureDir(path.dirname(this.cacheIndex));
    fs.writeFileSync(this.cacheIndex, JSON.stringify(this._index, null, 2));
  }

  _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ── Entry management ───────────────────────────────────────────────────────

  /**
   * Get the TTL for a given source ID based on its prefix.
   */
  getTTL(sourceId) {
    const prefix = sourceId.split('-')[0].toLowerCase();
    return this.ttls[prefix] || this.ttls['default'];
  }

  /**
   * Get the file path for a cached entry.
   */
  _entryPath(sourceId) {
    // Sanitize to safe filename: use hex encoding for special chars
    const safe = sourceId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    return path.join(this.cacheDir, `${safe}.json`);
  }

  /**
   * Check if a cached entry is stale (or missing).
   */
  isStale(sourceId) {
    const entry = this._index.entries[sourceId];
    if (!entry) return true;
    const ttl = this.getTTL(sourceId);
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    return age > ttl;
  }

  /**
   * Get a cached entry without fetching. Returns null if not cached.
   */
  getCacheInfo(sourceId) {
    const entry = this._index.entries[sourceId];
    if (!entry) return null;
    const ttl = this.getTTL(sourceId);
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    return {
      ...entry,
      ttl,
      age,
      stale: age > ttl,
      remaining: Math.max(0, ttl - age),
    };
  }

  // ── HTTP fetching ──────────────────────────────────────────────────────────

  _httpGet(url, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, {
        timeout,
        headers: {
          'User-Agent': 'TuyaUnifiedCache/1.0 (Homey App)',
          'Accept': '*/*',
        },
      }, (res) => {
        // Follow redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const location = res.headers.location;
          if (!location) return reject(new Error(`Redirect with no Location header for ${url}`));
          // Handle relative redirects
          const redirectUrl = location.startsWith('http') ? location : new URL(location, url).href;
          return this._httpGet(redirectUrl, timeout).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout fetching ${url} (${timeout}ms)`));
      });
    });
  }

  // ── Core API ───────────────────────────────────────────────────────────────

  /**
   * Fetch-or-get: return cached data if fresh, otherwise fetch and cache.
   *
   * @param {string} sourceId  - Unique identifier (e.g. 'z2m-tuya', 'zha-init')
   * @param {string} url       - The URL to fetch
   * @param {object} [options] - { force, timeout }
   * @returns {{ data, sha256, cached, sourceId, fetchedAt }}
   */
  async fetchOrGet(sourceId, url, options = {}) {
    const { force = false, timeout = 60000 } = options;

    // Check cache first
    if (!force && !this.isStale(sourceId)) {
      const cached = this._readCache(sourceId);
      if (cached !== null) {
        this._index.stats.totalHits++;
        this._saveIndex();
        if (this.verbose) log(C.G, `HIT  [${sourceId}] age=${this._formatAge(sourceId)}`);
        return { ...cached, cached: true, sourceId };
      }
    }

    // Cache miss or stale -- fetch fresh data
    this._index.stats.totalMisses++;
    if (this.verbose) log(C.Y, `MISS [${sourceId}] fetching from ${url}`);

    const data = await this._httpGet(url, timeout);
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    const fetchedAt = new Date().toISOString();

    // Store in cache
    const entry = { sha256, fetchedAt, url, dataLength: data.length };
    this._index.entries[sourceId] = entry;
    this._index.stats.totalFetches++;
    this._saveIndex();

    // Write data file
    const cachePath = this._entryPath(sourceId);
    const cachePayload = { ...entry, data };
    fs.writeFileSync(cachePath, JSON.stringify(cachePayload));

    if (this.verbose) log(C.G, `FRESH [${sourceId}] sha256=${sha256.substring(0, 12)}... size=${data.length}`);

    return { data, sha256, cached: false, sourceId, fetchedAt };
  }

  /**
   * Fetch raw content with hash comparison (for changelog detection).
   * Returns { data, changed, previousHash, currentHash }.
   */
  async fetchWithHash(sourceId, url, options = {}) {
    const { force = false, timeout = 60000 } = options;

    const prevEntry = this._index.entries[sourceId];
    const previousHash = prevEntry ? prevEntry.sha256 : null;

    const result = await this.fetchOrGet(sourceId, url, { force, timeout });

    return {
      data: result.data,
      changed: previousHash !== null && previousHash !== result.sha256,
      isFirstFetch: previousHash === null,
      previousHash,
      currentHash: result.sha256,
      cached: result.cached,
    };
  }

  /**
   * Invalidate (clear) a cached entry.
   */
  invalidate(sourceId) {
    delete this._index.entries[sourceId];
    const cachePath = this._entryPath(sourceId);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
    this._saveIndex();
    log(C.Y, `INVALIDATED [${sourceId}]`);
  }

  /**
   * Invalidate all cached entries.
   */
  invalidateAll() {
    const ids = Object.keys(this._index.entries);
    for (const id of ids) {
      this.invalidate(id);
    }
    log(C.Y, `INVALIDATED ALL (${ids.length} entries)`);
  }

  /**
   * Get stats about the cache.
   */
  stats() {
    const entries = Object.entries(this._index.entries);
    const now = Date.now();
    let fresh = 0;
    let stale = 0;

    for (const [id, entry] of entries) {
      const ttl = this.getTTL(id);
      const age = now - new Date(entry.fetchedAt).getTime();
      if (age > ttl) stale++;
      else fresh++;
    }

    return {
      totalEntries: entries.length,
      fresh,
      stale,
      hits: this._index.stats.totalHits,
      misses: this._index.stats.totalMisses,
      fetches: this._index.stats.totalFetches,
      hitRate: this._index.stats.totalHits + this._index.stats.totalMisses > 0
        ? (this._index.stats.totalHits / (this._index.stats.totalHits + this._index.stats.totalMisses) * 100).toFixed(1) + '%'
        : 'N/A',
    };
  }

  /**
   * List all cached entries with their status.
   */
  list() {
    const entries = Object.entries(this._index.entries);
    const now = Date.now();

    return entries.map(([id, entry]) => {
      const ttl = this.getTTL(id);
      const age = now - new Date(entry.fetchedAt).getTime();
      return {
        id,
        sha256: entry.sha256,
        fetchedAt: entry.fetchedAt,
        url: entry.url,
        dataLength: entry.dataLength,
        age: this._formatMs(age),
        ttl: this._formatMs(ttl),
        stale: age > ttl,
      };
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _readCache(sourceId) {
    try {
      const cachePath = this._entryPath(sourceId);
      if (!fs.existsSync(cachePath)) return null;
      const raw = JSON.parse(fs.readFileSync(cachePath));
      return { data: raw.data, sha256: raw.sha256, fetchedAt: raw.fetchedAt };
    } catch {
      return null;
    }
  }

  _formatAge(sourceId) {
    const entry = this._index.entries[sourceId];
    if (!entry) return 'N/A';
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    return this._formatMs(age);
  }

  _formatMs(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 60 * 60 * 1000) return `${(ms / 60000).toFixed(1)}min`;
    if (ms < 24 * 60 * 60 * 1000) return `${(ms / 3600000).toFixed(1)}h`;
    return `${(ms / 86400000).toFixed(1)}d`;
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

  const cache = new UrlCacheManager({ verbose: flag('verbose') });

  if (flag('stats')) {
    const s = cache.stats();
    console.log('\n=== URL Cache Stats ===');
    console.log(`  Entries:   ${s.totalEntries} (${s.fresh} fresh, ${s.stale} stale)`);
    console.log(`  Hits:      ${s.hits}`);
    console.log(`  Misses:    ${s.misses}`);
    console.log(`  Fetches:   ${s.fetches}`);
    console.log(`  Hit Rate:  ${s.hitRate}`);
    return;
  }

  if (flag('list')) {
    const entries = cache.list();
    console.log('\n=== Cached URLs ===');
    for (const e of entries) {
      const status = e.stale ? C.R + 'STALE' : C.G + 'FRESH';
      console.log(`  ${status}${C.X} ${e.id} (age=${e.age}, ttl=${e.ttl})`);
      console.log(`    url:  ${e.url}`);
      console.log(`    hash: ${e.sha256.substring(0, 16)}...`);
    }
    if (entries.length === 0) console.log('  (empty)');
    return;
  }

  if (flag('invalidate')) {
    const target = opt('invalidate');
    if (target) {
      cache.invalidate(target);
    } else {
      cache.invalidateAll();
    }
    return;
  }

  if (opt('fetch')) {
    const sourceId = opt('fetch');
    const url = opt('url');
    if (!url) {
      console.error('Usage: --fetch=<id> --url=<url>');
      process.exit(1);
    }
    const result = await cache.fetchOrGet(sourceId, url, { force: true });
    console.log(`Fetched ${sourceId}: sha256=${result.sha256.substring(0, 16)}... size=${result.data.length}`);
    return;
  }

  // Default: warm all known URLs
  console.log('No specific command. Use --stats, --list, --invalidate, or --fetch=<id> --url=<url>');
  console.log('Use --verbose for detailed output.');
}

// ── Export & run ──────────────────────────────────────────────────────────────
module.exports = UrlCacheManager;

if (require.main === module) {
  cli().catch((err) => {
    console.error(`[URL-CACHE] Fatal: ${err.message}`);
    process.exit(1);
  });
}
