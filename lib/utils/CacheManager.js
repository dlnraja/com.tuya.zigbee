'use strict';

/**
 * CacheManager - SHA-256 based HTTP cache for MFS Aggregator
 *
 * Stores ETag / Last-Modified headers and content hashes per source URL.
 * Only re-fetches when the remote content has actually changed.
 *
 * Cache files live in .cache/sources/<sourceId>.json
 *
 * Usage:
 *   const CacheManager = require('../../lib/utils/CacheManager');
 *   const cache = new CacheManager('.cache/sources');
 *   const result = await cache.fetchOrGet('z2m-tuya', 'https://...');
 *   // result.data   -> the response body (string)
 *   // result.cached -> true if served from cache
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

class CacheManager {
  /**
   * @param {string} cacheDir - directory to store cache metadata
   * @param {object} [opts]
   * @param {number} [opts.timeout=30000] - request timeout in ms
   * @param {number} [opts.retries=3] - max retries on failure
   * @param {string} [opts.userAgent='TuyaUnifiedMFS/1.0']
   */
  constructor(cacheDir, opts = {}) {
    this.cacheDir = path.resolve(cacheDir);
    this.timeout = opts.timeout || 30000;
    this.retries = opts.retries || 3;
    this.userAgent = opts.userAgent || 'TuyaUnifiedMFS/1.0';

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetch a URL. Returns cached data when the content has not changed.
   *
   * @param {string} sourceId  - unique key for this source (e.g. "z2m-tuya")
   * @param {string} url       - URL to fetch
   * @param {object} [opts]
   * @param {object} [opts.headers] - extra request headers
   * @param {number} [opts.timeout] - override default timeout
   * @returns {Promise<{data: string, cached: boolean, sha256: string, sourceId: string}>}
   */
  async fetchOrGet(sourceId, url, opts = {}) {
    const cachePath = this._cachePath(sourceId);
    const cached = this._readCache(cachePath);

    const headers = {
      'User-Agent': this.userAgent,
      ...(opts.headers || {}),
    };
    if (cached) {
      if (cached.etag) headers['If-None-Match'] = cached.etag;
      if (cached.lastModified) headers['If-Modified-Since'] = cached.lastModified;
    }

    try {
      const res = await this._httpGet(url, {
        headers,
        timeout: opts.timeout || this.timeout,
      });

      if (res.statusCode === 304 && cached) {
        // Not modified -- serve from cache
        return {
          data: cached.data,
          cached: true,
          sha256: cached.sha256,
          sourceId,
        };
      }

      if (res.statusCode !== 200) {
        // Server returned an error; if we have stale cache, still return it
        if (cached && cached.data) {
          return { data: cached.data, cached: true, stale: true, sha256: cached.sha256, sourceId };
        }
        throw new Error(`HTTP ${res.statusCode} for ${url}`);
      }

      const data = res.body;
      const sha256 = crypto.createHash('sha256').update(data).digest('hex');

      // Only write cache if content actually changed
      if (!cached || cached.sha256 !== sha256) {
        this._writeCache(cachePath, {
          url,
          etag: res.etag || null,
          lastModified: res.lastModified || null,
          sha256,
          data,
          fetchedAt: new Date().toISOString(),
        });
      }

      return { data, cached: false, sha256, sourceId };
    } catch (err) {
      // Network failure -- return stale cache if available
      if (cached && cached.data) {
        return { data: cached.data, cached: true, stale: true, sha256: cached.sha256, sourceId };
      }
      throw err;
    }
  }

  /**
   * Force-invalidate the cache for a given source.
   */
  invalidate(sourceId) {
    const cachePath = this._cachePath(sourceId);
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  }

  /**
   * Clear the entire cache directory.
   */
  clearAll() {
    if (!fs.existsSync(this.cacheDir)) return;
    const files = fs.readdirSync(this.cacheDir);
    for (const f of files) {
      if (f.endsWith('.json')) fs.unlinkSync(path.join(this.cacheDir, f));
    }
  }

  /**
   * Return stats about the cache.
   */
  stats() {
    if (!fs.existsSync(this.cacheDir)) return { entries: 0, totalBytes: 0 };
    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
    let totalBytes = 0;
    const entries = [];
    for (const f of files) {
      const fp = path.join(this.cacheDir, f);
      const stat = fs.statSync(fp);
      totalBytes += stat.size;
      try {
        const c = JSON.parse(fs.readFileSync(fp));
        entries.push({
          sourceId: path.basename(f, '.json'),
          sha256: c.sha256 ? c.sha256.slice(0, 12) + '...' : 'n/a',
          fetchedAt: c.fetchedAt || 'unknown',
          bytes: stat.size,
        });
      } catch { /* skip malformed */ }
    }
    return { entries: entries.length, totalBytes, details: entries };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  _cachePath(sourceId) {
    // Sanitize sourceId to prevent path traversal
    const safe = sourceId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    return path.join(this.cacheDir, `${safe}.json`);
  }

  _readCache(cachePath) {
    try {
      if (!fs.existsSync(cachePath)) return null;
      return JSON.parse(fs.readFileSync(cachePath));
    } catch {
      return null;
    }
  }

  _writeCache(cachePath, obj) {
    try {
      fs.writeFileSync(cachePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch {
      // Non-fatal: cache write failure is silently ignored
    }
  }

  /**
   * Low-level HTTP GET with redirect following, retries, and timeout.
   * Parses ETag / Last-Modified from response headers.
   */
  _httpGet(url, opts = {}) {
    const { headers = {}, timeout = this.timeout, maxRedirects = 5 } = opts;

    return new Promise((resolve, reject) => {
      const attempt = (targetUrl, remainingRedirects) => {
        const mod = targetUrl.startsWith('https') ? https : http;
        const req = mod.get(targetUrl, { headers, timeout }, (res) => {
          // Follow redirects
          if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
            && res.headers.location && remainingRedirects > 0) {
            return attempt(res.headers.location, remainingRedirects - 1);
          }

          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              body,
              etag: res.headers['etag'] || null,
              lastModified: res.headers['last-modified'] || null,
              headers: res.headers,
            });
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Timeout fetching ${targetUrl}`));
        });
      };

      attempt(url, maxRedirects);
    });
  }
}

module.exports = CacheManager;
