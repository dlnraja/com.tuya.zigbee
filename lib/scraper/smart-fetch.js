#!/usr/bin/env node
/**
 * SMART FETCH — P55 unified smart scraper lib
 * ==========================================================================
 * One entry point for ALL scrapers, crawlers, dumpers, and fetchers in the
 * project. Combines:
 *
 *   1. Concurrent (bounded-parallel) fetch — from concurrent-fetch.js
 *   2. Per-URL diff cache (ETag/If-None-Match → HTTP 304) — from diff-cache.js
 *   3. ADAPTIVE rate limiting — auto-detects 429/503 → exponential backoff
 *   4. Auto-retry with jitter — handles transient network errors
 *   5. Per-host metrics — learns slow/fast hosts across runs
 *   6. Persistent metrics — .cache/scraper-metrics.json (cross-run learning)
 *
 * Design goals (user requirement: "soit smart, sans surfacturation, sans
 * blocage"):
 *   - No oversubscription: respects per-host limits learned from past 429s
 *   - No blocking: parallel within safe bounds, sequential only when needed
 *   - Self-throttling: if upstream says "slow down", we slow down
 *
 * Usage:
 *   const { smartFetch, smartFetchAll, SmartFetcher } = require('./smart-fetch');
 *
 *   // Single URL
 *   const body = await smartFetch('https://...', { source: 'forum-topic-140352' });
 *
 *   // Bounded-parallel batch
 *   const results = await smartFetchAll(urls, {
 *     source: 'z2m-devices',
 *     concurrency: 8,        // default = per-host learned limit
 *     timeout: 30000,
 *     onProgress: (d, t) => log(`${d}/${t}`),
 *   });
 *
 *   // Custom config per source
 *   const fetcher = new SmartFetcher({
 *     source: 'gmail-imap',
 *     maxRetries: 5,
 *     baseBackoffMs: 2000,
 *     persistMetrics: true,
 *   });
 *   const r = await fetcher.fetch(url);
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const REPO_ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'scraper-cache');
const METRICS_FILE = path.join(CACHE_DIR, '_metrics.json');

const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};
const log = (c, ...a) => console.log(`${c}[SMART]${C.X} ${a.join(' ')}`);

// ── Default per-source configuration ─────────────────────────────────────
// Sources NOT in this map get conservative defaults (concurrency 5, retry 3).
// Add a new entry when you onboard a new scraper.
const SOURCE_DEFAULTS = {
  // Mega-crawl timeout scanners (P53.6 — concurrency 50, no perHost)
  'tuya-local': { concurrency: 50, maxRetries: 2, baseBackoffMs: 1000 },
  'openhab': { concurrency: 30, maxRetries: 2, baseBackoffMs: 500 },
  'xiaomi-miot': { concurrency: 50, maxRetries: 2, baseBackoffMs: 500 },
  'csa-iot': { concurrency: 30, maxRetries: 2, baseBackoffMs: 500 },

  // GitHub (JohanBendz issues, comments, PRs) — 5000 req/hr authenticated
  'github': { concurrency: 10, maxRetries: 3, baseBackoffMs: 2000 },

  // Z2M zigbee-herdsman-converters (raw GitHub)
  'z2m': { concurrency: 20, maxRetries: 3, baseBackoffMs: 500 },

  // Blakadder (z2m whitelabel)
  'blakadder': { concurrency: 5, maxRetries: 3, baseBackoffMs: 1000 },

  // Homey community forum (Discourse)
  // Their public API is rate-limited aggressively. Use browser UA + small batches.
  'forum': { concurrency: 4, maxRetries: 2, baseBackoffMs: 3000, defaultDelay: 250 },
  'forum-topic': { concurrency: 2, maxRetries: 2, baseBackoffMs: 5000, defaultDelay: 400 },
  'forum-search': { concurrency: 2, maxRetries: 2, baseBackoffMs: 5000, defaultDelay: 400 },
  'forum-posts': { concurrency: 4, maxRetries: 2, baseBackoffMs: 3000, defaultDelay: 250 },

  // Gmail IMAP — not HTTP, handled separately
  'gmail-imap': { concurrency: 1, maxRetries: 3, baseBackoffMs: 5000 },

  // Crash / diag dumps (Homey) — typically JSON from local files
  'homey-crash': { concurrency: 1, maxRetries: 1, baseBackoffMs: 500 },
  'homey-diag': { concurrency: 1, maxRetries: 1, baseBackoffMs: 500 },
};

// ── Metrics (persistent across runs) ──────────────────────────────────────
// .cache/scraper-cache/_metrics.json
// {
//   "forum-topic": {
//     "consecutiveSuccess": 12, "consecutive429": 0, "avgDurationMs": 234,
//     "suggestedConcurrency": 2, "suggestedDelay": 400, "totalRequests": 87
//   },
//   ...
// }
function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      return JSON.parse(fs.readFileSync(METRICS_FILE));
    }
  } catch { /* ignore */ }
  return {};
}

function saveMetrics(m) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(METRICS_FILE, JSON.stringify(m, null, 2));
  } catch (e) { /* ignore */ }
}

function recordMetric(source, updates) {
  const metrics = loadMetrics();
  if (!metrics[source]) {
    metrics[source] = {
      totalRequests: 0, totalSuccess: 0, totalErrors: 0, total429: 0,
      consecutiveSuccess: 0, consecutive429: 0, consecutiveErrors: 0,
      avgDurationMs: 0, totalDurationMs: 0,
      suggestedConcurrency: null, suggestedDelay: null,
      lastUpdated: null,
    };
  }
  const m = metrics[source];
  m.totalRequests = (m.totalRequests || 0) + 1;
  m.lastUpdated = new Date().toISOString();
  if (updates.success) {
    m.totalSuccess = (m.totalSuccess || 0) + 1;
    m.consecutiveSuccess = (m.consecutiveSuccess || 0) + 1;
    m.consecutive429 = 0;
    m.consecutiveErrors = 0;
  }
  if (updates.error) {
    m.totalErrors = (m.totalErrors || 0) + 1;
    m.consecutiveErrors = (m.consecutiveErrors || 0) + 1;
    m.consecutiveSuccess = 0;
  }
  if (updates.rateLimited) {
    m.total429 = (m.total429 || 0) + 1;
    m.consecutive429 = (m.consecutive429 || 0) + 1;
    m.consecutiveSuccess = 0;
  }
  if (typeof updates.durationMs === 'number') {
    m.totalDurationMs = (m.totalDurationMs || 0) + updates.durationMs;
    m.avgDurationMs = Math.round(m.totalDurationMs / m.totalRequests);
  }
  saveMetrics(metrics);
  return m;
}

function getMetric(source) {
  return loadMetrics()[source] || null;
}

// ── Cache (similar to diff-cache.js but per-source) ───────────────────────
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function hashKey(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function contentHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

class ResponseCache {
  constructor(source) {
    this.source = source;
    this.dir = path.join(CACHE_DIR, source);
    ensureDir(this.dir);
    this.indexFile = path.join(this.dir, '_index.json');
    this.index = this._loadIndex();
  }

  _loadIndex() {
    try {
      if (fs.existsSync(this.indexFile)) {
        return JSON.parse(fs.readFileSync(this.indexFile));
      }
    } catch { /* ignore */ }
    return { entries: {}, totalBytes: 0 };
  }

  _saveIndex() {
    fs.writeFileSync(this.indexFile, JSON.stringify(this.index, null, 2));
  }

  _entryPath(url) {
    return path.join(this.dir, hashKey(this.source + '\0' + url));
  }

  has(url) {
    return fs.existsSync(this._entryPath(url));
  }

  get(url) {
    const p = this._entryPath(url);
    if (!fs.existsSync(p)) return null;
    const metaP = p + '.meta.json';
    let meta = null;
    try {
      meta = JSON.parse(fs.readFileSync(metaP));
    } catch { return null; }
    return { body: fs.readFileSync(p), meta };
  }

  store(url, body, { etag, lastModified } = {}) {
    const p = this._entryPath(url);
    const metaP = p + '.meta.json';
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const hash = contentHash(buf);
    fs.writeFileSync(p, buf);
    const meta = {
      url, etag: etag || null, lastModified: lastModified || null,
      contentHash: hash, fetchedAt: new Date().toISOString(), size: buf.length,
    };
    fs.writeFileSync(metaP, JSON.stringify(meta, null, 2));
    this.index.entries[url] = {
      contentHash: hash, size: buf.length, fetchedAt: meta.fetchedAt,
      etag: etag || null, lastModified: lastModified || null,
    };
    this.index.totalBytes = Object.values(this.index.entries)
      .reduce((s, e) => s + (e.size || 0), 0);
    this._saveIndex();
  }

  getStats() {
    return {
      source: this.source, entries: Object.keys(this.index.entries).length,
      totalBytes: this.index.totalBytes,
    };
  }

  clear() {
    if (fs.existsSync(this.dir)) {
      for (const f of fs.readdirSync(this.dir)) {
        fs.unlinkSync(path.join(this.dir, f));
      }
    }
    this.index = { entries: {}, totalBytes: 0 };
    this._saveIndex();
  }
}

// ── Low-level HTTP with timeout, redirect, retries ────────────────────────
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
        'User-Agent': 'Mavis-SmartFetcher/1.0',
        'Accept': 'application/json, text/plain, */*',
        ...(options.headers || {}),
      },
      timeout: options.timeout || 30000,
    };
    const req = lib.request(reqOpts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        if (!res.headers.location) return reject(new Error('Redirect without Location'));
        return rawRequest(new URL(res.headers.location, url).toString(), options)
          .then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('Timeout ' + (options.timeout || 30000) + 'ms: ' + url)));
    req.on('error', reject);
    req.end();
  });
}

// ── SmartFetcher: one instance per source ────────────────────────────────
class SmartFetcher {
  /**
   * @param {object} opts
   * @param {string} opts.source - Source identifier (e.g. 'forum-topic-140352')
   * @param {number} [opts.concurrency] - Max parallel requests (default from metrics or SOURCE_DEFAULTS)
   * @param {number} [opts.maxRetries] - Max retries on 429/5xx (default 3)
   * @param {number} [opts.baseBackoffMs] - Base backoff in ms (default 1000)
   * @param {number} [opts.defaultDelay] - Per-request delay after success (default 0)
   * @param {number} [opts.timeout] - Per-request timeout (default 30000)
   * @param {boolean} [opts.useCache=true] - Enable ETag/If-None-Match cache
   * @param {boolean} [opts.persistMetrics=true] - Save metrics to .cache/scraper-cache/_metrics.json
   * @param {string} [opts.userAgent] - Override User-Agent
   * @param {object} [opts.headers] - Extra headers (e.g. Authorization, Accept-Language)
   */
  constructor(opts = {}) {
    this.source = opts.source || 'default';
    this.maxRetries = opts.maxRetries ?? SOURCE_DEFAULTS[this.source]?.maxRetries ?? 3;
    this.baseBackoffMs = opts.baseBackoffMs ?? SOURCE_DEFAULTS[this.source]?.baseBackoffMs ?? 1000;
    this.defaultDelay = opts.defaultDelay ?? SOURCE_DEFAULTS[this.source]?.defaultDelay ?? 0;
    this.timeout = opts.timeout || 30000;
    this.useCache = opts.useCache !== false;
    this.persistMetrics = opts.persistMetrics !== false;
    this.userAgent = opts.userAgent;
    this.extraHeaders = opts.headers || {};
    this.cache = this.useCache ? new ResponseCache(this.source) : null;

    // Determine initial concurrency: from metrics > explicit > defaults
    const metric = this.persistMetrics ? getMetric(this.source) : null;
    if (opts.concurrency) {
      this.concurrency = opts.concurrency;
    } else if (metric && metric.suggestedConcurrency) {
      this.concurrency = metric.suggestedConcurrency;
    } else {
      this.concurrency = SOURCE_DEFAULTS[this.source]?.concurrency ?? 5;
    }
  }

  /**
   * Smart fetch a single URL.
   * - Uses cache if available (ETag/If-None-Match)
   * - Retries on 429/5xx with exponential backoff + jitter
   * - Updates per-source metrics
   * @param {string} url
   * @param {object} [opts]
   * @param {object} [opts.headers] - Per-request extra headers
   * @returns {Promise<{body: Buffer, fromCache: boolean, statusCode?: number, attempts: number, durationMs: number}>}
   */
  async fetch(url, opts = {}) {
    const t0 = Date.now();
    const headers = { ...this.extraHeaders, ...(opts.headers || {}) };
    if (this.userAgent) headers['User-Agent'] = this.userAgent;

    // Try cache first
    if (this.cache) {
      const cached = this.cache.get(url);
      if (cached && headers['If-None-Match'] === undefined && headers['If-Modified-Since'] === undefined) {
        if (cached.meta.etag) headers['If-None-Match'] = cached.meta.etag;
        if (cached.meta.lastModified) headers['If-Modified-Since'] = cached.meta.lastModified;
      }
    }

    let lastErr = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await rawRequest(url, { headers, timeout: this.timeout });
        const dur = Date.now() - t0;

        if (res.statusCode === 304) {
          // Not modified — return cached body
          if (this.cache) {
            const cached = this.cache.get(url);
            if (cached) {
              if (this.persistMetrics) recordMetric(this.source, { success: true, durationMs: dur });
              return { body: cached.body, fromCache: true, notModified: true, statusCode: 304, attempts: attempt + 1, durationMs: dur };
            }
          }
        }

        if (res.statusCode === 200) {
          if (this.cache) {
            this.cache.store(url, res.body, {
              etag: res.headers.etag,
              lastModified: res.headers['last-modified'],
            });
          }
          if (this.persistMetrics) recordMetric(this.source, { success: true, durationMs: dur });
          // native setTimeout: HTTP backoff between requests (no device, no homey)
          if (this.defaultDelay > 0) await new Promise(r => setTimeout(r, this.defaultDelay));
          return { body: res.body, fromCache: false, notModified: false, statusCode: 200, attempts: attempt + 1, durationMs: dur };
        }

        if (res.statusCode === 429 || res.statusCode === 503) {
          // Rate-limited — back off
          if (this.persistMetrics) recordMetric(this.source, { rateLimited: true });
          if (attempt < this.maxRetries) {
            const retryAfter = parseInt(res.headers['retry-after'] || '0', 10) * 1000;
            const backoff = retryAfter || this.baseBackoffMs * Math.pow(2, attempt) + Math.random() * 500;
            log(C.Y, `[${this.source}] 429 on ${url.slice(0, 50)}… attempt ${attempt + 1}/${this.maxRetries}, backoff ${Math.round(backoff)}ms`);
            // native setTimeout: HTTP rate-limit backoff (script utility, no device)
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
          lastErr = new Error(`HTTP ${res.statusCode} for ${url} (rate-limited)`);
          break;
        }

        if (res.statusCode >= 500) {
          // Server error — retry
          if (this.persistMetrics) recordMetric(this.source, { error: true });
          if (attempt < this.maxRetries) {
            const backoff = this.baseBackoffMs * Math.pow(2, attempt) + Math.random() * 500;
            log(C.Y, `[${this.source}] ${res.statusCode} on ${url.slice(0, 50)}… attempt ${attempt + 1}/${this.maxRetries}, backoff ${Math.round(backoff)}ms`);
            // native setTimeout: HTTP 5xx backoff (script utility, no device)
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
          lastErr = new Error(`HTTP ${res.statusCode} for ${url}`);
          break;
        }

        if (res.statusCode >= 400) {
          // Client error — don't retry
          if (this.cache) {
            const cached = this.cache.get(url);
            if (cached) {
              if (this.persistMetrics) recordMetric(this.source, { success: true, durationMs: dur });
              return { body: cached.body, fromCache: true, stale: true, statusCode: res.statusCode, attempts: attempt + 1, durationMs: dur };
            }
          }
          lastErr = new Error(`HTTP ${res.statusCode} for ${url}`);
          break;
        }

        // Success
        if (this.persistMetrics) recordMetric(this.source, { success: true, durationMs: dur });
        return { body: res.body, fromCache: false, statusCode: res.statusCode, attempts: attempt + 1, durationMs: dur };
      } catch (e) {
        lastErr = e;
        if (this.persistMetrics) recordMetric(this.source, { error: true });
        if (attempt < this.maxRetries) {
          const backoff = this.baseBackoffMs * Math.pow(2, attempt) + Math.random() * 500;
          log(C.Y, `[${this.source}] network error: ${e.message} (attempt ${attempt + 1}/${this.maxRetries})`);
          // native setTimeout: HTTP network error backoff (script utility, no device)
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
      }
    }

    // All retries exhausted — try stale cache as last resort
    if (this.cache) {
      const cached = this.cache.get(url);
      if (cached) {
        log(C.Y, `[${this.source}] using stale cache for ${url} (last error: ${lastErr?.message})`);
        return { body: cached.body, fromCache: true, stale: true, error: lastErr?.message, attempts: this.maxRetries + 1, durationMs: Date.now() - t0 };
      }
    }
    throw lastErr || new Error('fetch failed: ' + url);
  }

  /**
   * Bounded-parallel batch fetch.
   * @param {string[]} urls
   * @param {object} [opts]
   * @param {number} [opts.concurrency] - Override instance concurrency
   * @param {function} [opts.onProgress] - (done, total, lastResult)
   * @returns {Promise<Array<{url, body?, statusCode?, fromCache?, error?, durationMs}>>}
   */
  async fetchAll(urls, opts = {}) {
    const concurrency = opts.concurrency || this.concurrency;
    const onProgress = opts.onProgress || (() => {});
    const results = new Array(urls.length);
    let nextIdx = 0;
    let done = 0;

    const worker = async () => {
      while (nextIdx < urls.length) {
        const i = nextIdx++;
        const url = urls[i];
        try {
          const r = await this.fetch(url);
          results[i] = { url, ...r };
        } catch (e) {
          results[i] = { url, error: e.message, durationMs: 0 };
        } finally {
          done++;
          onProgress(done, urls.length, results[i]);
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  getStats() {
    return {
      source: this.source, concurrency: this.concurrency, maxRetries: this.maxRetries,
      baseBackoffMs: this.baseBackoffMs, defaultDelay: this.defaultDelay,
      cache: this.cache?.getStats(),
      metrics: this.persistMetrics ? getMetric(this.source) : null,
    };
  }
}

// ── Module-level convenience ─────────────────────────────────────────────
const _fetcherCache = new Map();
function _getFetcher(source, opts = {}) {
  const key = source + JSON.stringify(opts);
  if (!_fetcherCache.has(key)) _fetcherCache.set(key, new SmartFetcher({ source, ...opts }));
  return _fetcherCache.get(key);
}

/**
 * Single-shot smart fetch (creates a one-time SmartFetcher).
 * @param {string} url
 * @param {object} [opts] - SmartFetcher options
 */
async function smartFetch(url, opts = {}) {
  return _getFetcher(opts.source || 'default', opts).fetch(url, opts);
}

/**
 * Bounded-parallel smart fetch (reuses SmartFetcher per source).
 * @param {string[]} urls
 * @param {object} [opts] - SmartFetcher options + SmartFetcher.fetchAll options
 */
async function smartFetchAll(urls, opts = {}) {
  return _getFetcher(opts.source || 'default', opts).fetchAll(urls, opts);
}

// ── CLI: inspect metrics, clear cache ────────────────────────────────────
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--metrics' || arg === '-m') {
    const m = loadMetrics();
    console.log(JSON.stringify(m, null, 2));
  } else if (arg === '--clear') {
    const source = process.argv[3];
    if (!source) {
      console.log('Usage: smart-fetch.js --clear <source>');
      process.exit(1);
    }
    const c = new ResponseCache(source);
    c.clear();
    console.log('Cleared cache for source:', source);
  } else if (arg === '--status' || arg === '-s') {
    const sources = Object.keys(SOURCE_DEFAULTS);
    console.log('Configured sources:');
    for (const s of sources) {
      const c = new ResponseCache(s);
      const m = getMetric(s);
      console.log('  ' + s.padEnd(20) + ' entries=' + c.getStats().entries + ', avgDur=' + (m?.avgDurationMs || '?') + 'ms, 429s=' + (m?.total429 || 0));
    }
  } else if (arg === '--test') {
    // Quick self-test
    console.log('Self-test: fetching https://api.github.com/zen (concurrency=4)...');
    smartFetch('https://api.github.com/zen', { source: 'test', concurrency: 4, persistMetrics: false })
      .then(r => {
        console.log('OK:', r.body.toString().substring(0, 100), '(' + r.durationMs + 'ms, ' + r.attempts + ' attempts)');
        process.exit(0);
      })
      .catch(e => {
        console.log('FAIL:', e.message);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  smart-fetch.js --status            Show configured sources + metrics');
    console.log('  smart-fetch.js --metrics           Dump full metrics JSON');
    console.log('  smart-fetch.js --clear <source>    Clear cache for one source');
    console.log('  smart-fetch.js --test              Quick self-test against api.github.com');
  }
}

module.exports = { smartFetch, smartFetchAll, SmartFetcher, ResponseCache, SOURCE_DEFAULTS, getMetric };
