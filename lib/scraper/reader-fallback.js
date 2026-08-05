#!/usr/bin/env node
'use strict';

/**
 * READER FALLBACK — free web-reader chain for fetches blocked by the origin.
 * ==========================================================================
 * Inspired by two open-source approaches:
 *
 *   - Agent Reach (github.com/Panniantong/agent-reach): "read any web page"
 *     channel routed through Jina Reader — free, no API key, no login.
 *   - firecrawl-mcp-server (github.com/firecrawl/firecrawl-mcp-server):
 *     scrape endpoint used when FIRECRAWL_API_KEY is configured (free tier).
 *
 * Chain order (first success wins):
 *   1. Jina Reader  — https://r.jina.ai/<url>  (free, keyless, renders JS)
 *   2. Firecrawl    — POST api.firecrawl.dev/v2/scrape (only when
 *                     FIRECRAWL_API_KEY is set in the environment)
 *
 * FREE-TIER PROTECTION: Firecrawl's free plan is a small one-time credit
 * pack, so tier 2 is hard-capped at FIRECRAWL_DAILY_MAX scrapes/day
 * (default 5), persisted in .cache/scraper-cache/_firecrawl-budget.json
 * (restored across CI runs via the scraper cache). Jina Reader (tier 1) is
 * the workhorse; Firecrawl only fires when Jina fails AND budget remains.
 *
 * Design rules (same as smart-fetch: "smart, no oversubscription, no block"):
 *   - Fallback only fires AFTER the direct fetch has genuinely failed
 *     (all retries exhausted, no stale cache) — readers are a last resort,
 *     not a default path, so their free-tier quotas are preserved.
 *   - One attempt per reader, no retry storms.
 *   - Results are stored in the same ResponseCache as direct fetches, so a
 *     fallback hit is served from cache on subsequent runs.
 *
 * Usage:
 *   const { readerFetch } = require('./reader-fallback');
 *   const { body, via } = await readerFetch('https://example.com/page');
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const JINA_PREFIX = 'https://r.jina.ai/';
const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v2/scrape';
const DEFAULT_TIMEOUT_MS = 45000; // readers render server-side — slower than raw fetch

// ── Firecrawl free-tier budget ─────────────────────────────────────────────
// The free plan is a small one-time credit pack, so Firecrawl must stay a
// RARE last resort. A persistent daily cap (shared with the smart-fetch
// cache dir, which CI restores across runs) guarantees we never burn the
// free tier: default 5 scrapes/day, tune via FIRECRAWL_DAILY_MAX.
const BUDGET_FILE = path.join(__dirname, '..', '..', '.cache', 'scraper-cache', '_firecrawl-budget.json');
const DAILY_MAX = Number(process.env.FIRECRAWL_DAILY_MAX || 5);

function firecrawlBudgetLeft() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const state = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
    if (state.date !== today) {return DAILY_MAX;}
    return Math.max(0, DAILY_MAX - (state.used || 0));
  } catch (_e) {
    return DAILY_MAX; // no state yet — full budget
  }
}

function firecrawlBudgetConsume() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    let state = { date: today, used: 0 };
    try {
      const prev = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
      if (prev.date === today) {state = prev;}
    } catch (_e) { /* fresh day */ }
    state.used += 1;
    fs.mkdirSync(path.dirname(BUDGET_FILE), { recursive: true });
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(state));
  } catch (_e) { /* budget persistence is best-effort */ }
}

function request(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === 'http:' ? http : https;
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (lib === https ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mavis-SmartFetcher/1.0',
        'Accept': 'text/plain, text/markdown, application/json, */*',
        ...options.headers || {},
      },
      timeout: options.timeout || DEFAULT_TIMEOUT_MS,
    };
    const req = lib.request(reqOpts, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        res.resume();
        return request(new URL(res.headers.location, targetUrl).toString(), options)
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
    req.on('timeout', () => req.destroy(new Error(`Timeout ${reqOpts.timeout}ms: ${targetUrl}`)));
    req.on('error', reject);
    if (options.body) {req.write(options.body);}
    req.end();
  });
}

/**
 * Jina Reader — free, no key. Prefix any URL with https://r.jina.ai/ and get
 * back clean markdown (JS-rendered). Used as-is by Agent Reach's web channel.
 */
async function viaJina(url, { timeout } = {}) {
  const res = await request(JINA_PREFIX + url, {
    timeout,
    headers: { 'X-Return-Format': 'markdown' },
  });
  if (res.statusCode === 200 && res.body.length > 0) {return res.body;}
  throw new Error(`jina-reader HTTP ${res.statusCode}`);
}

/**
 * Firecrawl scrape API — only attempted when FIRECRAWL_API_KEY is set
 * (free tier available at firecrawl.dev). Returns markdown by default.
 */
async function viaFirecrawl(url, { timeout, apiKey } = {}) {
  const res = await request(FIRECRAWL_ENDPOINT, {
    method: 'POST',
    timeout,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (res.statusCode === 200) {
    let parsed;
    try { parsed = JSON.parse(res.body.toString('utf8')); } catch (_e) { parsed = null; }
    const markdown = parsed && parsed.data && (parsed.data.markdown || parsed.data.html);
    if (markdown) {return Buffer.from(String(markdown), 'utf8');}
    throw new Error('firecrawl: 200 but no markdown in response');
  }
  throw new Error(`firecrawl HTTP ${res.statusCode}`);
}

/**
 * Try each free reader in order. Throws an aggregate error when all fail.
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.timeout] - Per-reader timeout (default 45000)
 * @returns {Promise<{body: Buffer, via: string}>}
 */
async function readerFetch(url, opts = {}) {
  const errors = [];

  try {
    return { body: await viaJina(url, opts), via: 'jina-reader' };
  } catch (e) {
    errors.push(`jina-reader: ${e.message}`);
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    const budget = firecrawlBudgetLeft();
    if (budget <= 0) {
      errors.push(`firecrawl: daily free-tier budget exhausted (${DAILY_MAX}/day, FIRECRAWL_DAILY_MAX)`);
    } else {
      try {
        const body = await viaFirecrawl(url, { ...opts, apiKey });
        firecrawlBudgetConsume();
        return { body, via: 'firecrawl' };
      } catch (e) {
        errors.push(`firecrawl: ${e.message}`);
      }
    }
  }

  throw new Error(`reader fallback exhausted for ${url} (${errors.join(' | ') || 'no reader configured'})`);
}

module.exports = { readerFetch };
