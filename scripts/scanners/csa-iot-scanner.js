#!/usr/bin/env node
/**
 * CSA-IoT Scanner
 * Fetches certified product data from CSA-IoT (Connectivity Standards Alliance).
 * Extracts manufacturer names, certification data, and validates existing fingerprints.
 *
 * Run: node scripts/scanners/csa-iot-scanner.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/scanners');
const OUTPUT_FILE = path.join(DATA_DIR, 'csa-iot-results.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('./scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'csa-iot';

// P53: per-URL blob cache (persisted across GHA runs)
let DiffCache;
try { DiffCache = require('./diff-cache').DiffCache; } catch { /* fallback */ }
let diffCache;

// P53: bounded parallel fetcher
let fetchAll;
try { fetchAll = require('./concurrent-fetch').fetchAll; } catch { /* fallback */ }

const CSA_API = 'https://api.csa-iot.org';
const CSA_SEARCH = 'https://csa-iot.org/csa-iot/connected-things/';

// CSA-IoT API endpoints
const CSA_ENDPOINTS = {
  search: '/api/v1/certifiedproducts/search',
  products: '/api/v1/certifiedproducts',
};

// ── GitHub API authentication ────────────────────────────────────────────
const GH_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GH_HEADERS = {
  'User-Agent': 'HomeyTuyaScanner/1.0',
  'Accept': 'application/vnd.github.v3+json',
  ...(GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {}),
};

// ── HTTP helpers ─────────────────────────────────────────────────────────
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'HomeyTuyaScanner/1.0',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: 30000,
    };
    https.get(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
      });
    }).on('error', reject);
  });
}

function fetchRaw(url) {
  if (diffCache) {
    return diffCache.fetchIfChanged(url, { timeout: 30000 })
      .then(r => r.body.toString('utf8'))
      .catch(() => fetchRawPlain(url));
  }
  return fetchRawPlain(url);
}

function fetchRawPlain(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'HomeyTuyaScanner/1.0' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRawPlain(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function githubGet(urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: GH_HEADERS,
      timeout: 30000,
    };
    https.get(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve([]); }
      });
    }).on('error', reject);
  });
}

// ── Parse CSA-IoT product data ──────────────────────────────────────────
function parseCsaProduct(product) {
  return {
    companyName: product.companyName || product.company || null,
    productName: product.productName || product.product || null,
    modelId: product.modelId || product.model || null,
    certificationId: product.certificationId || product.certId || null,
    zigbeeProfile: product.zigbeeProfile || product.profile || null,
    clusterIds: product.clusterIds || product.clusters || [],
    manufacturerCode: product.manufacturerCode || product.mfgCode || null,
    platform: product.platform || null,
    appVersion: product.appVersion || null,
    hwVersion: product.hwVersion || null,
    dateCertified: product.dateCertified || product.certDate || null,
  };
}

// ── Fetch CSA certified products (web scraping fallback) ─────────────────
async function fetchCsaProducts() {
  const products = [];

  // Try the CSA-IoT API first
  try {
    console.log('Attempting CSA-IoT API...');
    const result = await httpGet(`${CSA_API}${CSA_ENDPOINTS.search}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (result && Array.isArray(result.products)) {
      return result.products.map(parseCsaProduct);
    }
    if (result && Array.isArray(result.data)) {
      return result.data.map(parseCsaProduct);
    }
  } catch (e) {
    console.log(`  API not available: ${e.message}`);
  }

  // Fallback: scrape from GitHub mirrors of CSA data
  console.log('Falling back to GitHub CSA-IoT data mirrors...');
  const csaRepos = [
    { owner: 'csa-iot', repo: 'connected-things-data' },
    { owner: 'project-chip', repo: 'connectedhomeip' },
  ];

  for (const repo of csaRepos) {
    try {
      const tree = await githubGet(`/repos/${repo.owner}/${repo.repo}/git/trees/main?recursive=1`);
      const jsonFiles = (tree.tree || []).filter((f) =>
        f.path && f.path.endsWith('.json') && (
          f.path.includes('certified') ||
          f.path.includes('product') ||
          f.path.includes('device')
        )
      );

      console.log(`  Found ${jsonFiles.length} relevant files in ${repo.owner}/${repo.repo}`);

      // P53: parallel fetch of json files (10x speedup) with diff-cache
      const filesToFetch = jsonFiles.slice(0, 20);
      const urls = filesToFetch.map(file => `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/main/${file.path}`);

      let fetched = [];
      if (fetchAll && urls.length > 0) {
        fetched = await fetchAll(urls, {
          concurrency: 10,
          timeout: 30000,
          perHost: { 'raw.githubusercontent.com': 20 },
          onProgress: (d, t) => process.stdout.write(`\r    fetching ${d}/${t}...`),
        });
        process.stdout.write('\n');
      } else {
        for (const url of urls) {
          try { fetched.push({ url, body: Buffer.from(await fetchRaw(url)) }); }
          catch (e) { fetched.push({ url, error: e.message }); }
        }
      }

      for (const r of fetched) {
        if (r.error) continue;
        try {
          const content = r.body.toString('utf8');
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            for (const item of data) {
              products.push(parseCsaProduct(item));
            }
          } else if (data.products && Array.isArray(data.products)) {
            for (const item of data.products) {
              products.push(parseCsaProduct(item));
            }
          }
        } catch (e) {
          // Skip unparseable files
        }
      }
    } catch (e) {
      console.error(`  Error scanning ${repo.owner}/${repo.repo}: ${e.message}`);
    }
  }

  return products;
}

// ── Extract manufacturer info from GitHub CSA repos ──────────────────────
async function scanCsaGitHub() {
  const results = [];

  // Search for Zigbee certified products on GitHub
  const queries = [
    'Zigbee certified manufacturer CSA language:JSON',
    'zigbee cluster library manufacturer',
  ];

  for (const query of queries) {
    try {
      const searchResult = await githubGet(`/search/code?q=${encodeURIComponent(query)}&per_page=20`);
      const items = searchResult.items || [];

      // Filter to .json files only
      const candidates = items.filter(item => {
        if (!item.path || !item.path.endsWith('.json')) return false;
        if (!item.repository?.full_name) return false;
        return true;
      });

      // P53: parallel fetch
      const fetchTasks = candidates.map(item => {
        const repoFullName = item.repository.full_name;
        const mainUrl = `https://raw.githubusercontent.com/${repoFullName}/main/${item.path}`;
        return fetchRaw(mainUrl)
          .then(content => ({ item, content }))
          .catch(e => ({ item, error: e.message }));
      });
      const fetched = fetchAll ? await Promise.all(fetchTasks) : await (async () => {
        const out = [];
        for (const t of fetchTasks) out.push(await t);
        return out;
      })();

      for (const r of fetched) {
        if (r.error || !r.content) continue;
        try {
          const data = JSON.parse(r.content);
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item.manufacturer || item.companyName || item.mfgCode) {
                results.push(parseCsaProduct(item));
              }
            }
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (e) {
      console.error(`  Search error: ${e.message}`);
    }
  }

  return results;
}

// ── Load local fingerprints ──────────────────────────────────────────────
function getLocalFingerprints() {
  const mfrs = new Set();
  const driverMap = new Map();
  if (!fs.existsSync(DRIVERS_DIR)) return { mfrs, driverMap };
  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf));
      for (const m of (data.zigbee?.manufacturerName || [])) {
        mfrs.add(m);
        if (!driverMap.has(m)) driverMap.set(m, []);
        driverMap.get(m).push(d);
      }
    } catch (e) { /* skip */ }
  }
  return { mfrs, driverMap };
}

// ── Main scanner ─────────────────────────────────────────────────────────
async function scan() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('=== CSA-IoT Scanner ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Check cache first
  let cache;
  if (ScannerCache) {
    cache = new ScannerCache(CACHE_ID);
    if (cache.isValid()) {
      console.log(`Cache HIT (${cache.getAge()} old, TTL: ${cache.getRemainingTTL()}ms remaining)`);
      const cached = cache.load();
      if (cached) return cached;
    } else {
      console.log('Cache EXPIRED or MISSING - fetching fresh data');
    }
  }

  // P53: per-URL diff cache
  if (DiffCache) {
    diffCache = new DiffCache(CACHE_ID);
    console.log(`Diff cache: ${diffCache.listEntries().length} URLs already cached`);
  }

  const { mfrs: localMfrs, driverMap } = getLocalFingerprints();
  console.log(`Loaded ${localMfrs.size} local manufacturer fingerprints`);

  // Fetch CSA-IoT certified products
  let products = [];
  try {
    products = await fetchCsaProducts();
    console.log(`Fetched ${products.length} products from CSA-IoT sources`);
  } catch (e) {
    console.error(`Error fetching CSA products: ${e.message}`);
  }

  // Also scan GitHub for additional data
  try {
    const ghProducts = await scanCsaGitHub();
    console.log(`Fetched ${ghProducts.length} additional products from GitHub`);
    products = [...products, ...ghProducts];
  } catch (e) {
    console.error(`Error scanning GitHub: ${e.message}`);
  }

  // Deduplicate by companyName + productName
  const uniqueProducts = new Map();
  for (const p of products) {
    const key = `${p.companyName || 'unknown'}|${p.productName || 'unknown'}|${p.modelId || 'unknown'}`;
    if (!uniqueProducts.has(key)) {
      uniqueProducts.set(key, p);
    }
  }
  const deduped = [...uniqueProducts.values()];
  console.log(`Deduplicated to ${deduped.length} unique products`);

  // Cross-reference with local fingerprints
  const validationResults = [];
  const newManufacturers = [];

  for (const product of deduped) {
    const companyName = (product.companyName || '').toLowerCase();
    const matchedMfrs = [];

    for (const localMfr of localMfrs) {
      if (localMfr.toLowerCase().includes(companyName) || companyName.includes(localMfr.toLowerCase())) {
        matchedMfrs.push(localMfr);
      }
    }

    if (matchedMfrs.length > 0) {
      validationResults.push({
        product: product.productName,
        company: product.companyName,
        matchedFingerprints: matchedMfrs,
        drivers: matchedMfrs.flatMap((m) => driverMap.get(m) || []),
        status: 'validated',
      });
    } else if (companyName && companyName.length > 2) {
      newManufacturers.push({
        company: product.companyName,
        product: product.productName,
        modelId: product.modelId,
        certificationId: product.certificationId,
      });
    }
  }

  // Summaries
  const uniqueNewMfrs = [...new Set(newManufacturers.map((n) => n.company))].filter(Boolean);

  const output = {
    timestamp: new Date().toISOString(),
    source: 'csa-iot',
    summary: {
      totalProducts: deduped.length,
      validatedFingerprints: validationResults.length,
      newManufacturers: uniqueNewMfrs.length,
      uniqueCompanies: [...new Set(deduped.map((p) => p.companyName).filter(Boolean))].length,
    },
    validationResults: validationResults.slice(0, 200),
    newManufacturers: newManufacturers.slice(0, 200),
    products: deduped.slice(0, 500),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  console.log(`Products: ${deduped.length}, Validated: ${validationResults.length}, New manufacturers: ${uniqueNewMfrs.length}`);

  // Save to cache
  if (cache) {
    cache.save(output);
    console.log(`Cache SAVED (TTL: 7d)`);
  }

  // P53: log diff cache stats
  if (diffCache) {
    const s = diffCache.getStats();
    console.log(`Diff cache stats: ${s.hits} hits, ${s.misses} misses, ${s.notModified} 304s, ${(s.bytesFetched/1024).toFixed(1)}KB fetched, ${(s.bytesCached/1024).toFixed(1)}KB cached`);
  }

  return output;
}

// ── Run if executed directly ─────────────────────────────────────────────
if (require.main === module) {
  scan().catch((e) => {
    console.error('CSA-IoT Scanner failed:', e.message);
    process.exit(1);
  });
}

module.exports = { scan, parseCsaProduct };