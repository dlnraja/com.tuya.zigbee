#!/usr/bin/env node
/**
 * Blakadder Zigbee Device Database Crawler v2 — P53
 *
 * Source: https://zigbee.blakadder.com/assets/js/database.js (window.database = {...})
 * Total: ~2693 devices across all categories
 *
 * Extracts:
 *   - All Tuya fingerprints (mfr like _TZE200_xxx, _TYZB01_xxx, _TZ3000_xxx, etc.)
 *   - All TSxxxx product IDs
 *   - Vendor / model / category / compatibility metadata
 *   - Cross-source confidence (Blakadder alone vs Blakadder+others)
 *
 * Output: scripts/sync/data/blakadder.json
 *
 * Run: node scripts/sync/crawl-blakadder.js
 */

const { fetch } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('../scanners/scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'blakadder';

// Note: zigbee.blakadder.com does NOT expose all.json (404s to homepage).
// The actual full DB lives in /assets/js/database.js wrapped as window.database = {...}
const URL_JS = "https://zigbee.blakadder.com/assets/js/database.js";
const OUT = path.join(__dirname, "data");

// Tuya mfr signature (covers _TZ and _TYST)
const TUYA_MFR = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/;
// Generic Zigbee mfr (for non-Tuya cross-reference)
const GENERIC_MFR = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYZB[0-9]+_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/;
// TS product IDs
const TS_PID = /^TS\d{4}[A-Z]?$/;

function safeArr(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter(x => x != null && String(x).trim() !== '');
  return [String(v)].filter(x => x.trim() !== '');
}

function parseBlakadderJs(jsText) {
  // Strip the "window.database = " prefix and trailing semicolon
  const m = jsText.trim().match(/^window\.database\s*=\s*([\s\S]+?)\s*;?\s*$/);
  if (!m) throw new Error('Could not locate window.database = {...} payload');
  // Wrap in parens and JSON.parse — keys are already quoted strings
  return JSON.parse('(' + m[1] + ')');
}

async function crawlBlakadder() {
  console.log('[BLAKADDER] Fetching database.js (~920KB expected)...');

  // Check cache first
  let cache;
  if (ScannerCache) {
    cache = new ScannerCache(CACHE_ID);
    if (cache.isValid()) {
      console.log(`[BLAKADDER] Cache HIT (${cache.getAge()} old)`);
      const cached = cache.load();
      if (cached) return cached;
    }
  }

  const jsText = await fetch(URL_JS, { headers: { 'User-Agent': 'Mavis-Blakadder/2.0' } });
  console.log('[BLAKADDER] Got ' + (jsText.length / 1024).toFixed(1) + ' KB');

  const raw = parseBlakadderJs(jsText);
  const slugs = Object.keys(raw);
  console.log('[BLAKADDER] ' + slugs.length + ' total devices in DB');

  // ── Index by category and vendor ─────────────────────────────────────
  const catCount = {};
  const vendorCount = {};
  for (const slug of slugs) {
    const e = raw[slug];
    catCount[e.category] = (catCount[e.category] || 0) + 1;
    vendorCount[e.vendor] = (vendorCount[e.vendor] || 0) + 1;
  }

  // ── Extract Tuya fingerprints ────────────────────────────────────────
  const fps = new Map();
  const tsPids = new Set();
  const genericMfrs = new Map();
  let tuyaFps = 0;
  let genericFps = 0;

  for (const slug of slugs) {
    const dev = raw[slug];
    const zModels = safeArr(dev.zigbeemodel);
    const compatibility = safeArr(dev.compatible);

    // Build the haystack of all zigbeemodel values
    for (const zm of zModels) {
      const zmStr = String(zm).trim();
      if (!zmStr) continue;

      // Tuya fingerprint (e.g. _TZE200_xxxx, _TYZB01_xxxx)
      if (TUYA_MFR.test(zmStr)) {
        const k = zmStr.toLowerCase();
        if (!fps.has(k)) {
          fps.set(k, {
            mfr: zmStr.toUpperCase(),
            productId: null,
            model: dev.model || dev.title || null,
            description: dev.title || null,
            vendor: dev.vendor || null,
            category: dev.category || null,
            blakadderSlug: slug,
            compatibility,
            source: 'blakadder',
          });
          tuyaFps++;
        }
        continue;
      }

      // Generic mfr (non-Tuya) — keep for cross-source
      if (GENERIC_MFR.test(zmStr)) {
        const k = zmStr.toLowerCase();
        if (!genericMfrs.has(k)) {
          genericMfrs.set(k, {
            mfr: zmStr.toUpperCase(),
            vendor: dev.vendor || null,
            model: dev.model || dev.title || null,
            category: dev.category || null,
            blakadderSlug: slug,
            source: 'blakadder',
          });
          genericFps++;
        }
      }

      // TS product ID
      if (TS_PID.test(zmStr)) {
        tsPids.add(zmStr);
        // If we have a Tuya mfr for the same device, pair them
        // (The model field "TS0601" is typical of Tuya — pair with any mfr on the same entry)
        // For now, store TS separately and pair in cross-ref stage
      }
    }

    // Also check the title/description for embedded fingerprints
    const textHay = (dev.title || '') + ' ' + (dev.model || '');
    const mfrsInText = textHay.match(/_T[YZ](?:E200|E2[E2]8[0-9]|ZB\d{2}|Z3000|Z3210)[_-][A-Za-z0-9]+/g) || [];
    for (const m of mfrsInText) {
      const k = m.toLowerCase();
      if (TUYA_MFR.test(k.toUpperCase()) && !fps.has(k)) {
        fps.set(k, {
          mfr: m.toUpperCase(),
          productId: null,
          model: dev.model || dev.title || null,
          description: dev.title || null,
          vendor: dev.vendor || null,
          category: dev.category || null,
          blakadderSlug: slug,
          compatibility,
          source: 'blakadder',
        });
        tuyaFps++;
      }
    }
  }

  // Pair each TS pid with each Tuya mfr within the same device entry
  // (a single device entry can have both)
  for (const slug of slugs) {
    const dev = raw[slug];
    const zModels = safeArr(dev.zigbeemodel);
    const localMfrs = zModels.filter(z => TUYA_MFR.test(z));
    const localPids = zModels.filter(z => TS_PID.test(z));
    for (const m of localMfrs) {
      for (const p of localPids) {
        const k = m.toLowerCase();
        if (fps.has(k)) {
          const e = fps.get(k);
          if (!e.productId) e.productId = p;
        }
      }
    }
  }

  // ── Build output ────────────────────────────────────────────────────
  const result = {
    date: new Date().toISOString(),
    version: 2,
    source: 'zigbee.blakadder.com/assets/js/database.js',
    totalDevices: slugs.length,
    totalTuyaFingerprints: fps.size,
    totalGenericFingerprints: genericMfrs.size,
    totalTsProductIds: tsPids.size,
    categories: catCount,
    topVendors: Object.entries(vendorCount).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([v, c]) => ({ vendor: v, count: c })),
    fingerprints: [...fps.values()],
    genericMfrs: [...genericMfrs.values()],
    tsProductIds: [...tsPids].sort(),
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "blakadder.json"), JSON.stringify(result, null, 2));
  console.log('[BLAKADDER] Saved ' + fps.size + ' Tuya fingerprints, ' + genericMfrs.size + ' generic mfrs, ' + tsPids.size + ' TS pids');
  console.log('[BLAKADDER] Categories:', JSON.stringify(catCount));

  // Save to cache
  if (cache) {
    cache.save(result);
    console.log('[BLAKADDER] Cache SAVED');
  }

  return result;
}

module.exports = crawlBlakadder;
if (require.main === module) crawlBlakadder().catch(e => { console.error('[BLAKADDER] Error:', e.stack || e.message); process.exit(1); });
