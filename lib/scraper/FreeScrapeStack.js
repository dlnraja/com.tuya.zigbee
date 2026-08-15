'use strict';

/**
 * FREE SCRAPE STACK — keyless-first multi-reader orchestrator
 * ==========================================================================
 * Philosophy: burn $0 by default. Paid APIs only as last-resort budgets.
 *
 * Free / freemium chain (first success wins):
 *   1. Direct HTTP        — Discourse/GitHub JSON APIs (already work with UA)
 *   2. Jina Reader        — https://r.jina.ai/<url>          (keyless)
 *   3. Microlink          — https://api.microlink.io         (free tier, no key)
 *   4. AllOrigins         — https://api.allorigins.win/raw   (keyless CORS proxy)
 *   5. Wayback CDX        — archive.org closest snapshot     (keyless)
 *   6. Crawl4AI self-host — POST $CRAWL4AI_URL/crawl         (optional Docker)
 *   7. Firecrawl API      — only if FIRECRAWL_API_KEY + daily budget
 *   8. Playwright/Puppeteer local — only if installed (optional)
 *
 * ScrapeGraphAI / browser-use equivalents without paid SaaS:
 *   - structuredExtract() — heuristic JSON extraction from markdown (free)
 *   - browserNavigate()   — puppeteer/playwright when present
 *
 * Env knobs:
 *   SMART_FETCH_READER_FALLBACK=0  disable all readers
 *   FREE_SCRAPE_SKIP=jina,microlink  skip named tiers
 *   CRAWL4AI_URL=http://localhost:11235
 *   FIRECRAWL_API_KEY=...  FIRECRAWL_DAILY_MAX=5
 *   FREE_SCRAPE_BROWSER=1  allow puppeteer/playwright
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const { readerFetch } = require('./reader-fallback');

const ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, '.cache', 'scraper-cache', 'free-stack');
const DEFAULT_TIMEOUT_MS = 45000;

const SKIP = new Set(
  String(process.env.FREE_SCRAPE_SKIP || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

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
        'User-Agent': 'Mozilla/5.0 (compatible; HomeyFreeScrape/1.0; +https://github.com/dlnraja/com.tuya.zigbee)',
        Accept: 'text/plain, text/markdown, application/json, text/html, */*',
        'Accept-Encoding': 'identity',
        ...(options.headers || {}),
      },
      timeout: options.timeout || DEFAULT_TIMEOUT_MS,
    };
    const req = lib.request(reqOpts, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return request(new URL(res.headers.location, targetUrl).toString(), options)
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
    req.on('timeout', () => req.destroy(new Error(`timeout ${reqOpts.timeout}ms`)));
    req.on('error', reject);
    if (options.body) {req.write(options.body);}
    req.end();
  });
}

function cacheKey(url) {
  return require('crypto').createHash('sha1').update(String(url)).digest('hex');
}

function readCache(url) {
  try {
    const f = path.join(CACHE_DIR, `${cacheKey(url)}.json`);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - (j.at || 0) < 6 * 60 * 60 * 1000) {return j;}
  } catch (_e) { /* miss */ }
  return null;
}

function writeCache(url, payload) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(CACHE_DIR, `${cacheKey(url)}.json`),
      JSON.stringify({ at: Date.now(), url, ...payload })
    );
  } catch (_e) { /* best-effort */ }
}

async function viaDirect(url, opts = {}) {
  const res = await request(url, {
    timeout: opts.timeout,
    headers: {
      Referer: 'https://community.homey.app/',
      ...(opts.headers || {}),
    },
  });
  if (res.statusCode >= 200 && res.statusCode < 300 && res.body.length > 40) {
    return { text: res.body.toString('utf8'), via: 'direct' };
  }
  throw new Error(`direct HTTP ${res.statusCode}`);
}

async function viaMicrolink(url, opts = {}) {
  if (SKIP.has('microlink')) {throw new Error('skipped');}
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false&data.maxRedirects=2`;
  const res = await request(endpoint, { timeout: opts.timeout });
  if (res.statusCode !== 200) {throw new Error(`microlink HTTP ${res.statusCode}`);}
  const j = JSON.parse(res.body.toString('utf8'));
  const html = j?.data?.html || j?.data?.content || j?.data?.description;
  if (!html) {throw new Error('microlink empty');}
  return { text: String(html), via: 'microlink' };
}

async function viaAllOrigins(url, opts = {}) {
  if (SKIP.has('allorigins')) {throw new Error('skipped');}
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await request(endpoint, { timeout: opts.timeout });
  if (res.statusCode !== 200 || res.body.length < 40) {
    throw new Error(`allorigins HTTP ${res.statusCode}`);
  }
  return { text: res.body.toString('utf8'), via: 'allorigins' };
}

async function viaWayback(url, opts = {}) {
  if (SKIP.has('wayback')) {throw new Error('skipped');}
  const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=1&fl=timestamp,original&filter=statuscode:200`;
  const idx = await request(cdx, { timeout: opts.timeout || 20000 });
  if (idx.statusCode !== 200) {throw new Error(`cdx HTTP ${idx.statusCode}`);}
  const rows = JSON.parse(idx.body.toString('utf8'));
  if (!Array.isArray(rows) || rows.length < 2) {throw new Error('wayback no snapshot');}
  const [, ts] = rows[1];
  const snap = `https://web.archive.org/web/${ts}id_/${url}`;
  const res = await request(snap, { timeout: opts.timeout });
  if (res.statusCode !== 200) {throw new Error(`wayback HTTP ${res.statusCode}`);}
  return { text: res.body.toString('utf8'), via: 'wayback' };
}

async function viaCrawl4ai(url, opts = {}) {
  if (SKIP.has('crawl4ai')) {throw new Error('skipped');}
  const base = process.env.CRAWL4AI_URL || process.env.CRAWL4AI_BASE_URL;
  if (!base) {throw new Error('CRAWL4AI_URL unset');}
  const endpoint = `${String(base).replace(/\/$/, '')}/crawl`;
  const res = await request(endpoint, {
    method: 'POST',
    timeout: opts.timeout || 90000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: [url],
      priority: 10,
      crawler_params: { page_timeout: 30000 },
    }),
  });
  if (res.statusCode !== 200) {throw new Error(`crawl4ai HTTP ${res.statusCode}`);}
  const j = JSON.parse(res.body.toString('utf8'));
  const md = j?.results?.[0]?.markdown || j?.markdown || j?.data?.[0]?.markdown;
  if (!md) {throw new Error('crawl4ai empty');}
  return { text: String(md), via: 'crawl4ai' };
}

async function viaJina(url, opts = {}) {
  if (SKIP.has('jina')) {throw new Error('skipped');}
  const { body, via } = await readerFetch(url, opts);
  // readerFetch already tries jina then firecrawl — if firecrawl, still OK
  return { text: body.toString('utf8'), via: via || 'jina-reader' };
}

async function viaBrowser(url, opts = {}) {
  if (SKIP.has('browser') || process.env.FREE_SCRAPE_BROWSER !== '1') {
    throw new Error('browser disabled (set FREE_SCRAPE_BROWSER=1)');
  }
  let launcher = null;
  let kind = null;
  try {
    launcher = require('playwright');
    kind = 'playwright';
  } catch (_e) {
    try {
      launcher = require('puppeteer');
      kind = 'puppeteer';
    } catch (_e2) {
      throw new Error('neither playwright nor puppeteer installed');
    }
  }
  if (kind === 'playwright') {
    const browser = await launcher.chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 45000 });
      const text = await page.evaluate(() => document.body?.innerText || '');
      return { text: String(text), via: 'playwright' };
    } finally {
      await browser.close().catch(() => {});
    }
  }
  const browser = await launcher.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 45000 });
    const text = await page.evaluate(() => document.body?.innerText || '');
    return { text: String(text), via: 'puppeteer' };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * ScrapeGraphAI-style free structured extract from text/markdown.
 * Heuristic only — no LLM cost.
 */
function structuredExtract(text, schemaHints = {}) {
  const out = {
    manufacturers: [],
    productIds: [],
    diagnosticCodes: [],
    urls: [],
    issues: [],
  };
  const s = String(text || '');
  const mfrRe = /_TZ[E0-9A-Z]{2,6}_[A-Za-z0-9]+|_TYZB\d+_[A-Za-z0-9]+|HOBEIAN|TS\d{4}[A-Z]?/gi;
  const mfrs = s.match(mfrRe) || [];
  out.manufacturers = [...new Set(mfrs.map((m) => m.trim()))].slice(0, 50);
  const pidRe = /\b(TS\d{4}[A-Z]?|ZG-[\w-]+|SNZB-\d+|TS0601|TS0201|TS0203|TS0215A?|TS004[1-4F])\b/gi;
  out.productIds = [...new Set((s.match(pidRe) || []).map((p) => p.toUpperCase()))].slice(0, 40);
  const diagRe = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
  out.diagnosticCodes = [...new Set(s.match(diagRe) || [])].slice(0, 10);
  const urlRe = /https?:\/\/[^\s)"'<>]+/gi;
  out.urls = [...new Set(s.match(urlRe) || [])].slice(0, 40);
  const hints = schemaHints.issues || ['UNSUPPORTED_CLUSTER', 'no battery', 'not trigger', 'alarm', 'IAS', 'zone'];
  for (const h of hints) {
    if (s.toLowerCase().includes(String(h).toLowerCase())) {out.issues.push(h);}
  }
  return out;
}

/**
 * Free scrape with full cascade. Prefer cache.
 * @param {string} url
 * @param {object} [opts]
 * @returns {Promise<{text:string,via:string,extracted:object,cached?:boolean}>}
 */
async function freeScrape(url, opts = {}) {
  if (process.env.SMART_FETCH_READER_FALLBACK === '0' && opts.allowDirect === false) {
    throw new Error('FREE_SCRAPE disabled');
  }
  if (!opts.noCache) {
    const hit = readCache(url);
    if (hit?.text) {
      return {
        text: hit.text,
        via: hit.via || 'cache',
        extracted: hit.extracted || structuredExtract(hit.text, opts.schemaHints),
        cached: true,
      };
    }
  }

  const errors = [];
  const chain = [
    ['direct', () => viaDirect(url, opts)],
    ['jina', () => viaJina(url, opts)],
    ['microlink', () => viaMicrolink(url, opts)],
    ['allorigins', () => viaAllOrigins(url, opts)],
    ['crawl4ai', () => viaCrawl4ai(url, opts)],
    ['wayback', () => viaWayback(url, opts)],
    ['browser', () => viaBrowser(url, opts)],
  ];

  for (const [name, fn] of chain) {
    if (opts.only && !opts.only.includes(name)) {continue;}
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await fn();
      const extracted = structuredExtract(r.text, opts.schemaHints);
      writeCache(url, { text: r.text, via: r.via, extracted });
      return { text: r.text, via: r.via, extracted, cached: false };
    } catch (e) {
      errors.push(`${name}:${e.message}`);
    }
  }
  throw new Error(`freeScrape exhausted for ${url} (${errors.join(' | ')})`);
}

/**
 * Cross-ref multiple URLs in parallel (bounded).
 */
async function freeScrapeMany(urls, opts = {}) {
  const concurrency = Math.max(1, Math.min(opts.concurrency || 3, 6));
  const list = [...urls];
  const out = [];
  async function worker() {
    while (list.length) {
      const u = list.shift();
      try {
        // eslint-disable-next-line no-await-in-loop
        const r = await freeScrape(u, opts);
        out.push({ url: u, ok: true, ...r });
      } catch (e) {
        out.push({ url: u, ok: false, error: e.message });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

/** Known free source templates for Homey/Tuya intelligence */
const SOURCE_TEMPLATES = {
  forumTopic: (id) => `https://community.homey.app/t/${id}.json`,
  forumPost: (topicId, postNumber) => `https://community.homey.app/t/${topicId}/${postNumber}.json`,
  z2mDevice: (slug) => `https://www.zigbee2mqtt.io/devices/${encodeURIComponent(slug)}.html`,
  z2mRawConverters: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
  githubIssue: (owner, repo, n) => `https://api.github.com/repos/${owner}/${repo}/issues/${n}`,
  blakadderSearch: (q) => `https://zigbee.blakadder.com/search.html?s=${encodeURIComponent(q)}`,
  redditSearch: (q) => `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=10`,
};

module.exports = {
  freeScrape,
  freeScrapeMany,
  structuredExtract,
  SOURCE_TEMPLATES,
  viaDirect,
  viaMicrolink,
  viaAllOrigins,
  viaWayback,
  viaCrawl4ai,
  viaBrowser,
};
