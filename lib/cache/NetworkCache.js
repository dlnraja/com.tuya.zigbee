'use strict';

/**
 * NetworkCache.js - HTTP Request Caching Layer
 *
 * Wraps HTTP/HTTPS requests with intelligent caching. Supports ETags for
 * conditional requests (304 Not Modified) and Last-Modified headers for
 * efficient bandwidth usage. Falls back to stale cache on network failure.
 *
 * Usage:
 *   const netCache = new NetworkCache({ defaultTTL: 300000 });
 *   const data = await netCache.fetch('https://example.com/api/data');
 *   const stats = netCache.stats();
 */

const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const SmartCache = require('./SmartCache');

class NetworkCache {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultTTL=300000] - Default cache TTL in ms (5 min)
   * @param {number} [options.staleTTL=86400000] - Max stale cache age for fallback (24h)
   * @param {number} [options.maxConcurrent=5] - Max concurrent requests
   * @param {number} [options.timeout=30000] - Request timeout in ms
   * @param {string} [options.cacheDir='.cache/network'] - Disk cache directory
   * @param {object} [options.logger=null] - Injectable logger
   * @param {object} [options.headers={}] - Default request headers
   */
  constructor(options = {}) {
    this._defaultTTL = options.defaultTTL || 300000; // 5 min
    this._staleTTL = options.staleTTL || 86400000; // 24h
    this._maxConcurrent = options.maxConcurrent || 5;
    this._timeout = options.timeout || 30000;
    this._cacheDir = options.cacheDir || '.cache/network';
    this._logger = options.logger || null;
    this._defaultHeaders = options.headers || {};

    // Active requests queue
    this._activeCount = 0;
    this._queue = [];

    // ETag/Last-Modified metadata storage
    this._meta = {};

    // Use SmartCache for the response body cache
    this._cache = new SmartCache('network-responses', {
      maxSize: 500,
      defaultTTL: this._defaultTTL,
      cacheDir: this._cacheDir,
      persistToDisk: true,
      logger: this._logger,
    });

    // Metadata cache for ETags and Last-Modified
    this._metaCache = new SmartCache('network-meta', {
      maxSize: 500,
      defaultTTL: this._staleTTL,
      cacheDir: this._cacheDir,
      persistToDisk: true,
      logger: this._logger,
    });

    // Statistics
    this._stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      conditionalRequests: 0,
      notModified: 0,
      networkErrors: 0,
      staleFallbacks: 0,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Fetch a URL with caching. Returns cached response if available and fresh.
   * Uses ETags and Last-Modified for conditional requests.
   * Falls back to stale cache on network failure.
   *
   * @param {string} requestUrl - The URL to fetch
   * @param {object} [options]
   * @param {object} [options.headers] - Additional request headers
   * @param {number} [options.ttl] - Override TTL for this request
   * @param {boolean} [options.forceRefresh] - Bypass cache
   * @param {string} [options.encoding='utf8'] - Response encoding
   * @returns {Promise<{data: string, fromCache: boolean, status: number, headers: object}>}
   */
  async fetch(requestUrl, options = {}) {
    const cacheKey = this._cacheKey(requestUrl);
    const headers = { ...this._defaultHeaders, ...options.headers };
    const forceRefresh = options.forceRefresh || false;
    const encoding = options.encoding || 'utf8';

    this._stats.requests++;

    // Check cache unless forced refresh
    if (!forceRefresh) {
      const cached = this._cache.get(cacheKey);
      if (cached !== undefined) {
        this._stats.cacheHits++;
        return { data: cached.body, fromCache: true, status: 200, headers: cached.headers || {} };
      }
    }

    this._stats.cacheMisses++;

    // Throttle concurrent requests
    await this._waitForSlot();

    try {
      const result = await this._doRequest(requestUrl, headers, cacheKey, encoding);

      // Cache successful responses
      if (result.status >= 200 && result.status < 300) {
        const ttl = options.ttl !== undefined ? options.ttl : this._defaultTTL;
        this._cache.set(cacheKey, {
          body: result.data,
          headers: result.headers,
        }, ttl);
      }

      return result;
    } catch (err) {
      this._stats.networkErrors++;

      // Try stale fallback
      const stale = this._cache.get(cacheKey);
      if (stale !== undefined) {
        this._stats.staleFallbacks++;
        this._log(`Network error for ${requestUrl}, serving stale cache: ${err.message}`);
        return { data: stale.body, fromCache: true, status: 200, headers: stale.headers || {}, stale: true };
      }

      throw err;
    } finally {
      this._releaseSlot();
    }
  }

  /**
   * Fetch JSON with automatic parsing.
   * @param {string} requestUrl
   * @param {object} [options] - Same as fetch options
   * @returns {Promise<{data: *, fromCache: boolean, status: number}>}
   */
  async fetchJSON(requestUrl, options = {}) {
    const result = await this.fetch(requestUrl, { ...options, encoding: 'utf8' });
    try {
      result.data = JSON.parse(result.data);
    } catch (_e) {
      // Return raw data if parsing fails
    }
    return result;
  }

  /**
   * Invalidate cached response for a URL.
   * @param {string} requestUrl
   */
  invalidate(requestUrl) {
    const cacheKey = this._cacheKey(requestUrl);
    this._cache.invalidate(cacheKey);
    this._metaCache.invalidate(cacheKey);
  }

  /**
   * Get cache statistics.
   * @returns {object}
   */
  stats() {
    return {
      ...this._stats,
      cacheSize: this._cache.stats().size,
      cacheHitRate: this._cache.stats().hitRate,
      metaSize: this._metaCache.stats().size,
      queueLength: this._queue.length,
      activeCount: this._activeCount,
    };
  }

  /**
   * Flush all caches to disk.
   */
  flush() {
    this._cache.flush();
    this._metaCache.flush();
  }

  /**
   * Destroy caches and clean up.
   */
  destroy() {
    this._cache.destroy();
    this._metaCache.destroy();
    this._queue = [];
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _cacheKey(requestUrl) {
    return `net:${requestUrl}`;
  }

  _log(msg) {
    if (this._logger && typeof this._logger.log === 'function') {
      this._logger.log(msg);
    }
  }

  _error(msg) {
    if (this._logger && typeof this._logger.error === 'function') {
      this._logger.error(msg);
    }
  }

  async _waitForSlot() {
    if (this._activeCount < this._maxConcurrent) {
      this._activeCount++;
      return;
    }

    return new Promise((resolve) => {
      this._queue.push(() => {
        this._activeCount++;
        resolve();
      });
    });
  }

  _releaseSlot() {
    this._activeCount--;
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      next();
    }
  }

  _doRequest(requestUrl, headers, cacheKey, encoding) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(requestUrl);
      const transport = parsed.protocol === 'https:' ? https : http;

      // Add conditional request headers from cached metadata
      const meta = this._metaCache.get(cacheKey);
      if (meta) {
        if (meta.etag) {
          headers['If-None-Match'] = meta.etag;
          this._stats.conditionalRequests++;
        }
        if (meta.lastModified) {
          headers['If-Modified-Since'] = meta.lastModified;
          this._stats.conditionalRequests++;
        }
      }

      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers,
        timeout: this._timeout,
      };

      const req = transport.get(reqOptions, (res) => {
        // Handle 304 Not Modified
        if (res.statusCode === 304) {
          this._stats.notModified++;
          // Refresh TTL of existing cache entry
          const cached = this._cache.get(cacheKey);
          if (cached !== undefined) {
            this._cache.set(cacheKey, cached, this._defaultTTL);
            resolve({ data: cached.body, fromCache: true, status: 304, headers: cached.headers || {} });
          } else {
            resolve({ data: null, fromCache: false, status: 304, headers: {} });
          }
          res.resume();
          return;
        }

        let body = '';
        res.setEncoding(encoding === 'utf8' ? 'utf8' : null);

        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const responseHeaders = {
            etag: res.headers['etag'] || null,
            lastModified: res.headers['last-modified'] || null,
            contentType: res.headers['content-type'] || null,
          };

          // Store ETag/Last-Modified for future conditional requests
          if (responseHeaders.etag || responseHeaders.lastModified) {
            this._metaCache.set(cacheKey, responseHeaders, this._staleTTL);
          }

          resolve({
            data: body,
            fromCache: false,
            status: res.statusCode,
            headers: responseHeaders,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this._timeout}ms: ${requestUrl}`));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = NetworkCache;
