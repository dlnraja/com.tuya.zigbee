'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const fs = require('fs'), path = require('path');
const CACHE_DIR = path.join(process.cwd(), '.cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// v5.12.4  Robust rate-limit handling for Discourse + GitHub APIs
// Features: throttled queue, exponential backoff, CSRF auto-refresh,
// Discourse DELETE spacing, GitHub X-RateLimit header parsing

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ===== THROTTLE: Global request spacing =====
const _queues = {}; // named queues for different APIs

function getQueue(name = 'default') {
  if (!_queues[name]) _queues[name] = { lastRequest: 0, minSpacing: 1000 };
  return _queues[name];
}

// Configure minimum spacing between requests for a named queue
function setThrottle(name, minSpacingMs) {
  const q = getQueue(name);
  q.minSpacing = minSpacingMs;
}

// Wait until it's safe to make a request on this queue
async function throttle(name = 'default') {
  const q = getQueue(name);
  const now = Date.now();
  const elapsed = now - q.lastRequest;
  if (elapsed < q.minSpacing) {
    await sleep(q.minSpacing - elapsed);
  }
  q.lastRequest = Date.now();
}

// ===== DISCOURSE RATE LIMITS =====
// Discourse limits: DELETE ~2/min, POST ~4/min, GET ~200/min
// 429 response includes Retry-After header or body with wait_seconds
const DISCOURSE_SPACING = {
  GET: 500,       // 0.5s between reads
  POST: 3000,     // 3s between posts
  PUT: 3000,      // 3s between edits
  DELETE: 90000,  // 90s between deletes (Discourse rate-limits aggressively)
};

// ===== GITHUB RATE LIMITS =====
// Authenticated: 5000/h, Unauthenticated: 60/h
// Headers: X-RateLimit-Remaining, X-RateLimit-Reset
const GITHUB_SPACING = 200; // 0.2s between requests

// ===== ENHANCED fetchWithRetry =====
async function fetchWithRetry(url, opts = {}, ro = {}) {
  const {
    retries = 4,
    baseDelay = 2000,
    maxDelay = 120000,
    timeout = 30000,
    label = '',
    queue = null,       // named throttle queue
    csrfRefresh = null, // async function to refresh CSRF (returns new auth)
    authRef = null,     // { auth } reference object for CSRF updates
    useCache = true,    // v5.13.20: Use cache on 5xx errors
  } = ro;

  // Auto-detect queue from URL if not specified
  const qName = queue || (url.includes('community.homey') ? 'discourse' : 
                          url.includes('api.github') ? 'github' : 'default');

  // Auto-set spacing for Discourse by HTTP method
  if (qName === 'discourse') {
    const method = (opts.method || 'GET').toUpperCase();
    const spacing = DISCOURSE_SPACING[method] || DISCOURSE_SPACING.GET;
    const q = getQueue('discourse');
    if (q.minSpacing < spacing) q.minSpacing = spacing;
  } else if (qName === 'github') {
    const q = getQueue('github');
    if (q.minSpacing < GITHUB_SPACING) q.minSpacing = GITHUB_SPACING;
  }

  for (let i = 0; i <= retries; i++) {
    try {
      // Throttle before request
      await throttle(qName);

      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeout);
      const r = await fetch(url, { ...opts, signal: ac.signal });
      clearTimeout(t);

      // Success or client error (not retryable)
      if (r.ok) {
        if (useCache && opts.method === 'GET' || !opts.method) {
          const cacheKey = Buffer.from(url).toString('hex').substring(0, 64);
          try {
            const body = await r.clone().text();
            fs.writeFileSync(path.join(CACHE_DIR, cacheKey), body);
          } catch(e) {}
        }
        return r;
      }
      if (r.status === 404 || r.status === 422) return r;

      // === 403: BAD CSRF or permission denied ===
      if (r.status === 403) {
        const body = await r.text().catch(() => '');
        // Discourse BAD CSRF  refresh and retry
        if (body.includes('BAD CSRF') && csrfRefresh && authRef && i < retries) {
          console.log('  [' + (label || 'retry') + '] BAD CSRF  refreshing token...');
          authRef.auth = await csrfRefresh(authRef.auth);
          // Update headers with new CSRF
          if (opts.headers && authRef.auth.csrf) {
            opts.headers['X-CSRF-Token'] = authRef.auth.csrf;
          }
          await sleep(1000);
          continue;
        }
        // GitHub rate limit (403 with rate limit message)
        const retryAfter = r.headers.get('retry-after');
        if (retryAfter && i < retries) {
          const w = Math.min((parseInt(retryAfter, 10) || 60) * 1000, maxDelay);
          console.log('  [' + (label || 'retry') + '] 403 rate-limit, wait ' + Math.round(w/1000) + 's');
          await sleep(w);
          continue;
        }
        return r;
      }

      // === 429: Rate Limited ===
      if (r.status === 429 || r.status === 409) {
        if (i >= retries) return r;
        // Parse wait time from headers or body
        let waitMs = 0;
        const retryAfter = r.headers.get('retry-after');
        if (retryAfter) {
          waitMs = parseInt(retryAfter, 10) * 1000;
        } else {
          // Discourse sends {extras:{wait_seconds:N}} or "too many" in body
          try {
            const j = await r.json();
            const ws = j.extras?.wait_seconds || j.wait_seconds;
            if (ws) waitMs = ws * 1000;
            else if (JSON.stringify(j).toLowerCase().includes('too many')) waitMs = 120000;
            else waitMs = 60000;
          } catch { waitMs = 90000; }
        }
        // Add jitter + ensure minimum 60s
        waitMs = Math.max(waitMs, 60000) + Math.random() * 10000;
        waitMs = Math.min(waitMs, maxDelay);
        console.log('  [' + (label || 'retry') + '] 429 rate-limited, wait ' + Math.round(waitMs/1000) + 's (' + (i + 1) + '/' + retries + ')');
        // Also increase spacing for this queue to avoid hitting limit again
        const q = getQueue(qName);
        q.minSpacing = Math.max(q.minSpacing, safeParse(waitMs, 2));
        await sleep(waitMs);
        // Refresh CSRF if Discourse (token may expire during long waits)
        if (qName === 'discourse' && csrfRefresh && authRef) {
          authRef.auth = await csrfRefresh(authRef.auth);
          if (opts.headers && authRef.auth.csrf) {
            opts.headers['X-CSRF-Token'] = authRef.auth.csrf;
          }
        }
        continue;
      }

      // === 5xx: Server error ===
      if (r.status >= 500 && i < retries) {
        const d = Math.min(baseDelay * 2 ** i + Math.random() * 1000, maxDelay);
        console.log('  [' + (label || 'retry') + '] HTTP ' + r.status + ', wait ' + Math.round(d/1000) + 's (' + (i + 1) + '/' + retries + ')');
        await sleep(d);
        continue;
      }

      // v5.13.20: Fallback to cache on final 5xx error
      if (r.status >= 500 && useCache) {
        const cacheKey = Buffer.from(url).toString('hex').substring(0, 64);
        const cachePath = path.join(CACHE_DIR, cacheKey);
        if (fs.existsSync(cachePath)) {
          console.log('  [' + (label || 'cache') + '] HTTP ' + r.status + ' - Falling back to cached data');
          const body = fs.readFileSync(cachePath, 'utf8');
          // Mock a Fetch response object
          return {
            ok: true,
            status: 200,
            text: async () => body,
            json: async () => JSON.parse(body),
            headers: new Map(),
            clone: function() { return this; }
          };
        }
      }

      // === GitHub: Parse X-RateLimit headers ===
      if (qName === 'github') {
        const remaining = parseInt(r.headers.get('x-ratelimit-remaining') || '999', 10);
        const reset = parseInt(r.headers.get('x-ratelimit-reset') || '0', 10);
        if (remaining <= 5 && reset > 0) {
          const waitMs = Math.max(0, reset * 1000 - Date.now()) + 1000;
          if (waitMs < 300000) { // max 5 min wait
            console.log('  [' + (label || 'github') + '] Only ' + remaining + ' requests left, wait ' + Math.round(waitMs/1000) + 's for reset');
            await sleep(waitMs);
          }
        }
      }

      return r;
    } catch (e) {
      if (i < retries) {
        const d = Math.min(baseDelay * 2 ** i + Math.random() * 1000, maxDelay);
        console.log('  [' + (label || 'retry') + '] ' + e.name + ': ' + (e.message || '').substring(0, 80) + ', wait ' + Math.round(d/1000) + 's (' + (i + 1) + '/' + retries + ')');
        await sleep(d);
      } else throw e;
    }
  }
}

// ===== retryAsync: Generic async retry with backoff =====
async function retryAsync(fn, ro = {}) {
  const { retries = 3, baseDelay = 1000, maxDelay = 60000, label = '' } = ro;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) {
      if (i < retries) {
        const d = Math.min(baseDelay * 2 ** i + Math.random() * 500, maxDelay);
        console.log('  [' + (label || 'retry') + '] ' + (e.message || e) + ', wait ' + Math.round(d/1000) + 's');
        await sleep(d);
      } else throw e;
    }
  }
}

// ===== processBatch: Process items with automatic spacing =====
// Handles 429 by pausing all processing and retrying
async function processBatch(items, handler, opts = {}) {
  const {
    spacing = 3000,   // ms between items
    label = 'batch',
    maxRetries = 2,   // retries per item
    onError = null,   // (item, error) => void
    rateLimitPause = 60000, // pause on 429
  } = opts;

  let ok = 0, fail = 0, skip = 0;
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    let success = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await handler(item, idx);
        if (result === 'skip') { skip++; }
        else if (result === 'rate_limited') {
          console.log(`  [${label}] Rate limited at item ${idx + 1}/${items.length}, pausing ${rateLimitPause/1000}s...`);
          await sleep(rateLimitPause);
          // Increase pause for next hit
          rateLimitPause = Math.min(rateLimitPause * 1.5, 300000);
          continue; // retry same item
        }
        else { ok++; }
        success = true;
        break;
      } catch (e) {
        if (attempt < maxRetries) {
          const d = 5000 * (attempt + 1);
          console.log(`  [${label}] Error on item ${idx + 1}, retry in ${d/1000}s: ${e.message}`);
          await sleep(d);
        } else {
          fail++;
          if (onError) onError(item, e);
          else console.log(`  [${label}] Failed item ${idx + 1}: ${e.message}`);
        }
      }
    }
    // Spacing between items (skip if last item)
    if (idx < items.length - 1) await sleep(spacing);
  }
  console.log(`  [${label}] Done: ${ok} ok, ${fail} fail, ${skip} skip`);
  return { ok, fail, skip };
}

module.exports = { fetchWithRetry, retryAsync, sleep, throttle, setThrottle, processBatch, DISCOURSE_SPACING };
