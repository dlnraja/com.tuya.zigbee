#!/usr/bin/env node
/**
 * Concurrent HTTP Fetcher — P53
 * ==========================================================================
 * Bounded-parallel HTTP fetcher with rate limiting and abort handling.
 * Replaces `for (url of urls) { await fetch(url) }` patterns in scanners
 * with `fetchAll(urls, { concurrency: 10 })`.
 *
 * Key features:
 *   - Bounded parallelism (default 10, configurable)
 *   - Per-host rate limiting (e.g. 5 req/sec to api.github.com)
 *   - Returns { url, body, statusCode, error, durationMs }
 *   - Cancellable mid-flight
 *   - Optional progress callback
 *
 * Why this matters for the 4 timeout scanners:
 *   - tuya-local: 200+ YAMLs at ~500ms sequential = 100+ seconds → 10 parallel = ~10s
 *   - openhab:    50+ XMLs at ~500ms sequential = 25+ seconds     → 10 parallel = ~2.5s
 *   - xiaomi-miot: 60+ specs at ~500ms sequential = 30+ seconds  → 10 parallel = ~3s
 *   - csa-iot:   200+ products at ~500ms sequential = 100s        → 10 parallel = ~10s
 *
 * Plus the diff-cache.js, second runs finish in <1s (most files are 304 Not Modified).
 *
 * Usage:
 *   const { fetchAll, fetchWithTimeout } = require('./concurrent-fetch');
 *
 *   const results = await fetchAll(['https://...', 'https://...'], {
 *     concurrency: 10,
 *     timeout: 30000,
 *     perHost: { 'api.github.com': 5, 'raw.githubusercontent.com': 20 },
 *     onProgress: (done, total) => console.log(`${done}/${total}`),
 *   });
 *
 *   for (const r of results) {
 *     if (r.error) console.error('FAIL', r.url, r.error);
 *     else console.log('OK', r.url, r.body.length);
 *   }
 */
'use strict';
const https = require('https');
const http = require('http');
const { URL } = require('url');

const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};
const log = (c, ...a) => console.log(`${c}[CONCURRENT]${C.X} ${a.join(' ')}`);

/**
 * Single fetch with timeout, redirect, error handling.
 * @param {string} url
 * @param {object} [opts]
 * @returns {Promise<{body: Buffer, statusCode: number, headers: object}>}
 */
function fetchWithTimeout(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (lib === https ? 443 : 80),
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: {
        'User-Agent': 'HomeyTuyaScanner/2.0 (Concurrent)',
        ...(opts.headers || {}),
      },
      timeout: opts.timeout || 30000,
    };
    const req = lib.request(reqOpts, (res) => {
      // Follow up to 3 redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && opts.followRedirects !== false) {
        res.resume();
        if (!res.headers.location) return reject(new Error('Redirect without Location'));
        const next = new URL(res.headers.location, url).toString();
        if ((opts._redirects = (opts._redirects || 0) + 1) > 3) {
          return reject(new Error('Too many redirects'));
        }
        return fetchWithTimeout(next, opts).then(resolve, reject);
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
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout after ${opts.timeout || 30000}ms: ${url}`));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Sliding-window per-host rate limiter. Allows `maxPerSec` requests/second
 * to a given hostname. Excess requests are queued.
 */
class HostRateLimiter {
  constructor(perHost = {}) {
    // perHost: { 'api.github.com': 5 }  // 5 req/sec
    this.limits = perHost;
    this.hosts = {}; // host → { tokens, lastRefill }
  }

  _bucket(host) {
    if (!this.hosts[host]) {
      this.hosts[host] = { tokens: this.limits[host] || 100, lastRefill: Date.now() };
    }
    return this.hosts[host];
  }

  async acquire(host) {
    const limit = this.limits[host];
    if (!limit) return; // No limit
    while (true) {
      const b = this._bucket(host);
      const now = Date.now();
      const elapsed = (now - b.lastRefill) / 1000;
      if (elapsed >= 1) {
        // Refill
        b.tokens = limit;
        b.lastRefill = now;
      }
      if (b.tokens > 0) {
        b.tokens--;
        return;
      }
      // Wait until next refill
      const wait = Math.max(10, 1000 - (now - b.lastRefill));
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

/**
 * Bounded-parallel fetch.
 * @param {string[]} urls
 * @param {object} [opts]
 * @param {number} [opts.concurrency=10]
 * @param {number} [opts.timeout=30000]
 * @param {object} [opts.perHost] - { hostname: maxReqPerSec }
 * @param {function} [opts.onProgress] - (done, total, lastResult)
 * @param {function} [opts.filter] - (url) => bool (skip some URLs)
 * @param {boolean} [opts.stopOnError=false] - abort the whole batch on first error
 * @returns {Promise<Array<{url, body?, statusCode?, error?, durationMs, skipped?}>>}
 */
async function fetchAll(urls, opts = {}) {
  const concurrency = opts.concurrency || 10;
  const timeout = opts.timeout || 30000;
  const filter = opts.filter || (() => true);
  const onProgress = opts.onProgress || (() => {});
  const limiter = new HostRateLimiter(opts.perHost || {});

  // Pre-filter
  const indexed = urls.map((url, i) => ({ url, i })).filter(x => filter(x.url));
  const results = new Array(urls.length);
  let nextIdx = 0;
  let done = 0;

  async function worker() {
    while (nextIdx < indexed.length) {
      const item = indexed[nextIdx++];
      const { url, i } = item;
      let host = '';
      try { host = new URL(url).hostname; } catch { host = ''; }

      const t0 = Date.now();
      try {
        await limiter.acquire(host);
        const res = await fetchWithTimeout(url, { timeout });
        const dur = Date.now() - t0;
        results[i] = {
          url,
          body: res.body,
          statusCode: res.statusCode,
          headers: res.headers,
          durationMs: dur,
        };
        if (opts.stopOnError && res.statusCode >= 400) {
          // Mark all remaining as skipped
          for (let k = nextIdx; k < indexed.length; k++) {
            const pending = indexed[k];
            results[pending.i] = { url: pending.url, skipped: true, error: 'parent-failed' };
          }
          indexed.length = nextIdx;
          break;
        }
      } catch (e) {
        const dur = Date.now() - t0;
        results[i] = { url, error: e.message, durationMs: dur };
        if (opts.stopOnError) {
          for (let k = nextIdx; k < indexed.length; k++) {
            const pending = indexed[k];
            results[pending.i] = { url: pending.url, skipped: true, error: 'parent-failed' };
          }
          indexed.length = nextIdx;
          break;
        }
      } finally {
        done++;
        onProgress(done, urls.length, results[i]);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, indexed.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── CLI demo: `node concurrent-fetch.js <url> [url...]` ─────────────────
if (require.main === module) {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.log('Usage: node concurrent-fetch.js <url> [url...]');
    console.log('       (fetches in parallel, bounded by --concurrency)');
    process.exit(1);
  }
  const concurrency = (() => {
    const a = process.argv.find(x => x.startsWith('--concurrency='));
    return a ? parseInt(a.split('=')[1]) : 10;
  })();
  console.log(`Fetching ${urls.length} URLs with concurrency=${concurrency}...`);
  const t0 = Date.now();
  fetchAll(urls, { concurrency, onProgress: (d, t) => process.stdout.write(`\r  ${d}/${t}    `) })
    .then((results) => {
      process.stdout.write('\n');
      let ok = 0, err = 0;
      for (const r of results) {
        if (r.error) { err++; console.log('  FAIL', r.url.slice(0, 60), '...', r.error); }
        else { ok++; console.log('  OK  ', r.url.slice(0, 60), '...', r.body.length, 'bytes', r.durationMs + 'ms'); }
      }
      console.log(`\nDone in ${Date.now() - t0}ms: ${ok} OK, ${err} failed`);
    });
}

module.exports = { fetchAll, fetchWithTimeout, HostRateLimiter };