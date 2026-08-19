'use strict';

/**
 * NetworkResilience — shared local-first network guard for Homey Pro (~64MB budget).
 *
 * Pattern: circuit breaker + local/stale cache + memory caps + bounded downloads.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const CircuitBreaker = require('./CircuitBreaker');

const DEFAULT_RSS_LIMIT = 55 * 1024 * 1024;
const DEFAULT_HEAP_LIMIT = 40 * 1024 * 1024;
const DEFAULT_HTTP_MAX_BYTES = 2 * 1024 * 1024;
const NETWORK_FAILURE_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN']);

function isMemoryPressure(opts = {}) {
  const rssLimit = opts.rssLimit || DEFAULT_RSS_LIMIT;
  const heapLimit = opts.heapLimit || DEFAULT_HEAP_LIMIT;
  try {
    const mem = process.memoryUsage();
    return (mem.rss || 0) > rssLimit || (mem.heapUsed || 0) > heapLimit;
  } catch {
    return false;
  }
}

function createNetworkBreaker(name, opts = {}) {
  return new CircuitBreaker({
    name,
    failureThreshold: opts.failureThreshold ?? 3,
    resetTimeout: opts.resetTimeout ?? 60000,
    successThreshold: opts.successThreshold ?? 1,
    maxBackoff: opts.maxBackoff ?? 600000,
    isFailure: opts.isFailure || ((err) => {
      if (!err) return false;
      if (err.code && NETWORK_FAILURE_CODES.has(err.code)) return true;
      if (typeof err.message === 'string' && /HTTP [45]\d\d|timeout|ECONN/i.test(err.message)) return true;
      return true;
    }),
    log: opts.log || (() => {}),
  });
}

function createLocalCache(maxEntries = 50) {
  const map = new Map();
  return {
    get(key) { return map.get(key); },
    has(key) { return map.has(key); },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      trimMapCache(map, maxEntries);
    },
    clear() { map.clear(); },
    get size() { return map.size; },
  };
}

function trimMapCache(map, maxEntries) {
  if (!map || typeof map.size !== 'number' || map.size <= maxEntries) return;
  const drop = map.size - maxEntries;
  let i = 0;
  for (const key of map.keys()) {
    map.delete(key);
    i += 1;
    if (i >= drop) break;
  }
}

function boundedHttpRequest(targetUrl, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_HTTP_MAX_BYTES;
  const timeoutMs = options.timeout ?? options.timeoutMs ?? 60000;
  const maxRedirects = options.maxRedirects ?? 4;
  const redirects = options._redirects ?? 0;

  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(targetUrl);
    } catch (err) {
      reject(err);
      return;
    }

    const lib = u.protocol === 'http:' ? http : https;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      reject(new Error(`Unsupported protocol: ${u.protocol}`));
      return;
    }

    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (lib === https ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: timeoutMs,
    };

    const req = lib.request(reqOpts, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirects >= maxRedirects) {
          reject(new Error(`Too many redirects (${maxRedirects})`));
          return;
        }
        boundedHttpRequest(new URL(res.headers.location, targetUrl).toString(), {
          ...options,
          _redirects: redirects + 1,
        }).then(resolve, reject);
        return;
      }

      const contentLength = parseInt(res.headers['content-length'] || '0', 10);
      if (contentLength > maxBytes) {
        res.resume();
        reject(new Error(`Response too large (${contentLength} > ${maxBytes})`));
        return;
      }

      const chunks = [];
      let received = 0;
      res.on('data', (chunk) => {
        received += chunk.length;
        if (received > maxBytes) {
          res.destroy();
          reject(new Error(`Download exceeded max size (${maxBytes} bytes)`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function boundedHttpsTextGet(url, options = {}) {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 60000;
  const requireHttps = options.requireHttps !== false;

  if (requireHttps && (!url || !String(url).startsWith('https://'))) {
    return Promise.reject(new Error(`Refusing non-HTTPS URL: ${String(url || '').substring(0, 80)}`));
  }

  return boundedHttpRequest(url, { maxBytes, timeoutMs, headers: options.headers })
    .then((res) => {
      if (res.statusCode !== 200) {
        throw new Error(`HTTP ${res.statusCode}`);
      }
      return res.body.toString('utf8');
    });
}

module.exports = {
  DEFAULT_RSS_LIMIT,
  DEFAULT_HEAP_LIMIT,
  DEFAULT_HTTP_MAX_BYTES,
  NETWORK_FAILURE_CODES,
  isMemoryPressure,
  createNetworkBreaker,
  createLocalCache,
  trimMapCache,
  boundedHttpRequest,
  boundedHttpsTextGet,
};
