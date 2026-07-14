#!/usr/bin/env node
/**
 * Diff Cache for Scanner HTTP Responses — P53
 * ==========================================================================
 * Caches individual HTTP responses per URL, keyed by content hash.
 * On re-run, only re-fetches URLs whose ETag or content hash changed.
 *
 * Storage layout (.cache/scanner-blobs/):
 *   {sha256(url)}/
 *     meta.json   — { url, etag, lastModified, contentHash, fetchedAt, size }
 *     body        — raw response body
 *
 * Why this is the fix for the 4 timeout scanners (tuya-local, openhab,
 * xiaomi-miot, csa-iot):
 *   - Each scanner does 200+ sequential API calls (~500ms each) = 100+ seconds
 *   - Many of those URLs (file lists, individual YAML/XML) are stable day-to-day
 *   - Persisted cache across GHA runs (via artifact) means: day 2 onwards,
 *     only modified files get re-fetched → scanner finishes in seconds
 *
 * Usage:
 *   const { DiffCache } = require('./diff-cache');
 *   const cache = new DiffCache('tuya-local');
 *
 *   // 1. Conditional fetch (uses ETag/If-Modified-Since if available)
 *   const body = await cache.fetchIfChanged(url);
 *
 *   // 2. Or just store a fetched response
 *   cache.store(url, body, { etag, lastModified });
 *
 *   // 3. Or get cached body without fetching
 *   const cached = cache.getIfFresh(url);
 *
 * Persisting across GHA runs:
 *   - The mega-crawl.yml workflow uploads .cache/scanner-blobs/ as artifact
 *   - Next run downloads it back, so the cache survives
 *
 * CLI:
 *   node diff-cache.js --status          # show cache stats per scanner
 *   node diff-cache.js --clear=<id>      # clear one scanner's blob cache
 *   node diff-cache.js --clear-all       # clear all blob caches
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const REPO_ROOT = path.resolve(__dirname, '../..');
const BLOB_DIR = path.join(REPO_ROOT, '.cache', 'scanner-blobs');
const BLOB_INDEX = path.join(BLOB_DIR, '_blob-index.json');

const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};
const log = (c, ...a) => console.log(`${c}[DIFF-CACHE]${C.X} ${a.join(' ')}`);

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function hashKey(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function contentHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ── Index management ─────────────────────────────────────────────────────
function loadIndex() {
  try {
    if (fs.existsSync(BLOB_INDEX)) {
      return JSON.parse(fs.readFileSync(BLOB_INDEX));
    }
  } catch { /* ignore */ }
  return {};
}

function saveIndex(index) {
  ensureDir(BLOB_DIR);
  fs.writeFileSync(BLOB_INDEX, JSON.stringify(index, null, 2));
}

// ── Low-level HTTP (with ETag / If-Modified-Since / redirect support) ────
function rawRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (lib === https ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'HomeyTuyaScanner/2.0 (DiffCache)',
        ...(options.headers || {}),
      },
      timeout: options.timeout || 30000,
    };
    const req = lib.request(reqOpts, (res) => {
      // Follow redirects (1 level)
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        if (!res.headers.location) return reject(new Error('Redirect without Location'));
        return rawRequest(new URL(res.headers.location, url).toString(), options)
          .then(resolve, reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('timeout', () => { req.destroy(new Error(`Timeout fetching ${url}`)); });
    req.on('error', reject);
    req.end();
  });
}

// ── DiffCache class ──────────────────────────────────────────────────────
class DiffCache {
  /**
   * @param {string} scannerId - Used as a namespace; multiple scanners can
   *                             coexist in the same blob directory.
   */
  constructor(scannerId) {
    this.scannerId = scannerId;
    this.dir = path.join(BLOB_DIR, scannerId);
    ensureDir(this.dir);
    this.stats = { hits: 0, misses: 0, notModified: 0, errors: 0, bytesFetched: 0, bytesCached: 0 };
  }

  _urlKey(url) {
    // Namespace: scannerId + url
    return hashKey(this.scannerId + '\0' + url);
  }

  _entryPath(url) {
    return path.join(this.dir, this._urlKey(url));
  }

  _loadEntry(url) {
    const p = this._entryPath(url);
    const metaP = p + '.meta.json';
    if (!fs.existsSync(p) || !fs.existsSync(metaP)) return null;
    try {
      const meta = JSON.parse(fs.readFileSync(metaP));
      return { meta, bodyPath: p };
    } catch {
      return null;
    }
  }

  _storeEntry(url, body, etag, lastModified) {
    const p = this._entryPath(url);
    const metaP = p + '.meta.json';
    const hash = contentHash(body);
    fs.writeFileSync(p, body);
    const meta = {
      url,
      etag: etag || null,
      lastModified: lastModified || null,
      contentHash: hash,
      fetchedAt: new Date().toISOString(),
      size: body.length,
    };
    fs.writeFileSync(metaP, JSON.stringify(meta, null, 2));

    // Update global index
    const idx = loadIndex();
    if (!idx[this.scannerId]) idx[this.scannerId] = { blobs: {}, totalBytes: 0 };
    idx[this.scannerId].blobs[this._urlKey(url)] = {
      url, contentHash: hash, size: body.length, fetchedAt: meta.fetchedAt,
    };
    idx[this.scannerId].totalBytes = Object.values(idx[this.scannerId].blobs)
      .reduce((s, b) => s + (b.size || 0), 0);
    saveIndex(idx);
  }

  /**
   * Get cached body for a URL.
   * @param {string} url
   * @returns {Buffer|null}
   */
  get(url) {
    const entry = this._loadEntry(url);
    if (!entry) return null;
    this.stats.hits++;
    this.stats.bytesCached += entry.meta.size || 0;
    return fs.readFileSync(entry.bodyPath);
  }

  /**
   * Check if URL is cached.
   * @param {string} url
   * @returns {boolean}
   */
  has(url) {
    return this._loadEntry(url) !== null;
  }

  /**
   * Get cached content hash without reading the body.
   * @param {string} url
   * @returns {string|null}
   */
  getHash(url) {
    const e = this._loadEntry(url);
    return e ? e.meta.contentHash : null;
  }

  /**
   * Store a fetched response.
   * @param {string} url
   * @param {Buffer|string} body
   * @param {object} [opts]
   * @param {string} [opts.etag]
   * @param {string} [opts.lastModified]
   */
  store(url, body, { etag, lastModified } = {}) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    this._storeEntry(url, buf, etag, lastModified);
  }

  /**
   * Conditional fetch: only downloads the body if ETag/Last-Modified changed
   * (HTTP 304) OR if the URL is not in cache.
   *
   * @param {string} url
   * @param {object} [opts]
   * @param {number} [opts.timeout] - per-request timeout in ms
   * @returns {Promise<{body: Buffer, fromCache: boolean, notModified: boolean}>}
   */
  async fetchIfChanged(url, opts = {}) {
    const entry = this._loadEntry(url);
    const headers = {};
    if (entry) {
      if (entry.meta.etag) headers['If-None-Match'] = entry.meta.etag;
      if (entry.meta.lastModified) headers['If-Modified-Since'] = entry.meta.lastModified;
    }

    try {
      const res = await rawRequest(url, { headers, timeout: opts.timeout || 30000 });

      if (res.statusCode === 304 && entry) {
        // Not modified — body unchanged
        this.stats.notModified++;
        const body = fs.readFileSync(entry.bodyPath);
        this.stats.bytesCached += body.length;
        return { body, fromCache: true, notModified: true };
      }

      if (res.statusCode !== 200) {
        this.stats.errors++;
        // On error, fall back to cached if we have it
        if (entry) {
          const body = fs.readFileSync(entry.bodyPath);
          return { body, fromCache: true, notModified: false, stale: true };
        }
        throw new Error(`HTTP ${res.statusCode} for ${url}`);
      }

      // Fresh content
      this.stats.misses++;
      this.stats.bytesFetched += res.body.length;
      this._storeEntry(url, res.body, res.headers.etag, res.headers['last-modified']);
      return { body: res.body, fromCache: false, notModified: false };
    } catch (e) {
      this.stats.errors++;
      // Network error — fall back to stale cache
      if (entry) {
        log(C.Y, `Network error, using stale cache for ${url}`);
        return { body: fs.readFileSync(entry.bodyPath), fromCache: true, notModified: false, stale: true };
      }
      throw e;
    }
  }

  /**
   * Get current cache stats.
   * @returns {object}
   */
  getStats() {
    return { ...this.stats, scannerId: this.scannerId };
  }

  /**
   * Clear this scanner's blob cache.
   */
  clear() {
    if (fs.existsSync(this.dir)) {
      const files = fs.readdirSync(this.dir);
      for (const f of files) fs.unlinkSync(path.join(this.dir, f));
    }
    const idx = loadIndex();
    delete idx[this.scannerId];
    saveIndex(idx);
  }

  /**
   * Get all entries (for debugging / status).
   */
  listEntries() {
    if (!fs.existsSync(this.dir)) return [];
    return fs.readdirSync(this.dir)
      .filter(f => f.endsWith('.meta.json'))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(this.dir, f))); }
        catch { return null; }
      })
      .filter(Boolean);
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (n) => ARGS.some(a => a === `--${n}`);
const OPT = (n) => { const a = ARGS.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null; };

function showStatus() {
  const idx = loadIndex();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  DIFF-CACHE STATUS`);
  console.log(`${'='.repeat(70)}\n`);

  const scanners = Object.keys(idx);
  if (scanners.length === 0) {
    console.log('  (no scanners cached yet)\n');
    return;
  }

  for (const sid of scanners) {
    const entries = Object.values(idx[sid].blobs);
    const totalBytes = idx[sid].totalBytes || 0;
    const totalKB = (totalBytes / 1024).toFixed(1);
    console.log(`  ${C.B}${sid}${C.X}  ${entries.length} entries, ${totalKB}KB`);
  }
  console.log('');
}

function clearAll() {
  if (fs.existsSync(BLOB_DIR)) {
    const scanners = fs.readdirSync(BLOB_DIR);
    for (const s of scanners) {
      const p = path.join(BLOB_DIR, s);
      if (fs.statSync(p).isDirectory()) {
        for (const f of fs.readdirSync(p)) fs.unlinkSync(path.join(p, f));
      } else {
        fs.unlinkSync(p);
      }
    }
  }
  log(C.Y, 'All diff caches cleared.');
}

function cli() {
  if (FLAG('status')) return showStatus();
  if (FLAG('clear-all')) return clearAll();
  const t = OPT('clear');
  if (t) {
    const c = new DiffCache(t);
    c.clear();
    log(C.Y, `Cleared diff cache for: ${t}`);
    return;
  }
  showStatus();
  console.log('Usage:');
  console.log('  diff-cache.js --status           Show blob cache stats');
  console.log('  diff-cache.js --clear=<id>       Clear one scanner\'s blob cache');
  console.log('  diff-cache.js --clear-all        Clear all blob caches');
}

module.exports = {
  DiffCache,
  rawRequest,
  hashKey,
  contentHash,
  BLOB_DIR,
};

if (require.main === module) cli();