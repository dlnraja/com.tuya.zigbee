#!/usr/bin/env node
/**
 * blakadder-fetch.js — Fetch + parse the Blakadder Zigbee compatibility database
 *
 * Source: https://zigbee.blakadder.com/assets/js/database.js
 * Format: window.database = { "<slug>": { model, vendor, title, zigbeemodel, category, compatible } }
 *
 * Output:
 *   - .github/state/blakadder/database-raw.json  (parsed full DB, as JSON)
 *   - .github/state/blakadder/devices.json       (normalized list)
 *   - .github/state/blakadder/mfr-pid.json       (mfr+pid pairs extracted)
 *   - .github/state/blakadder/state.json         (last fetch metadata)
 *
 * Usage:
 *   node tools/ci/blakadder-fetch.js
 *
 * @author Mavis P53 — Blakadder source integration
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { smartFetch, SmartFetcher } = require(path.join(ROOT, 'lib/scraper/smart-fetch'));

const STATE_DIR = path.join(ROOT, '.github', 'state', 'blakadder');
const DATA_DIR = path.join(ROOT, 'data', 'blakadder');

const SOURCE_URL = 'https://zigbee.blakadder.com/assets/js/database.js';
const USER_AGENT = 'Mavis-Blakadder/1.0 (https://zigbee.blakadder.com)';

// ── Mfr/PID regex (matches both _TZxxxx_ and TSxxxx patterns) ───────────────
const MFR_REGEX = /_T[YZ](?:E200|E2[E2]8[0-9]|ZB\d{2}|Z3000|Z3210)[_-][A-Za-z0-9]+/g;
const PID_REGEX = /\bTS\d{4}[A-Z]?\b/g;
// Blakadder "zigbeemodel" entries are often internal pids like "lumi.sensor_magnet.aq2",
// "ZB-SW01", "ptvo.switch", "TS0601", "_TZE200_...". We extract all of these.

function parseBlakadderJs(jsText) {
  // Strip the "window.database = " prefix and the trailing ";"
  let s = jsText.trim();
  const m = s.match(/^window\.database\s*=\s*([\s\S]+?)\s*;?\s*$/);
  if (!m) throw new Error('Could not locate window.database = {...} payload');
  // Convert JS object literal → valid JSON: handle trailing commas, comments,
  // unquoted keys. Blakadder occasionally has these in their DB.
  let jsonText = m[1];
  // Remove single-line comments
  jsonText = jsonText.replace(/\/\/[^\n]*/g, '');
  // Remove block comments
  jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
  // Quote unquoted keys: `key: value` → `"key": value`
  jsonText = jsonText.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  // Remove trailing commas in objects/arrays
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
  // JSON.parse (no paren-wrap: that breaks the parse)
  return JSON.parse(jsonText);
}

function safeArr(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter(x => x != null && String(x).trim() !== '');
  return [v].filter(x => x != null && String(x).trim() !== '');
}

function normalizeDevice(slug, entry) {
  const models = safeArr(entry.zigbeemodel);
  return {
    slug,
    vendor: entry.vendor || '',
    model: entry.model || '',
    title: entry.title || '',
    category: entry.category || '',
    url: entry.url || entry.href || '',
    zigbeeModels: models,
    compatible: safeArr(entry.compatible),
  };
}

function extractSacredCouples(device) {
  // A "Sacred Couple" is (mfr, pid) where:
  //   - mfr is a _TZxxxx_... or _TYZBxx_... signature
  //   - pid is a TSxxxx or vendor-specific product id
  // We extract these from zigbeeModels and title
  const couples = [];
  const haystack = (device.zigbeeModels.join(' ') + ' ' + device.title + ' ' + device.model);
  const mfrs = [...new Set((haystack.match(MFR_REGEX) || []).map(s => s.toUpperCase()))];
  const pids = [...new Set([
    ...(haystack.match(PID_REGEX) || []),
    ...device.zigbeeModels.filter(m => /^(?!_T[YZ])/.test(m) && !/^TS\d{4}/.test(m)),
  ])];
  for (const mfr of mfrs) {
    for (const pid of pids) {
      couples.push({ mfr, pid, vendor: device.vendor, model: device.model, category: device.category });
    }
  }
  return couples;
}

function categoryToDriverHint(category) {
  // Map Blakadder categories → our driver families
  const map = {
    bulb: 'bulb',
    light: 'light',
    dimmer: 'dimmer',
    switch: 'switch',
    plug: 'plug',
    sensor: 'sensor',
    remote: 'button',
    hvac: 'climate',
    cover: 'cover',
    lock: 'lock',
    router: 'router',
    coordinator: 'coordinator',
  };
  return map[category] || category;
}

async function main() {
  console.log('=== Blakadder fetch + parse ===');
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('  GET', SOURCE_URL);
  const t0 = Date.now();
  // P55 — use smart-fetch (cache + retry + adaptive rate limit)
  const blakFetcher = new SmartFetcher({
    source: 'blakadder',
    userAgent: USER_AGENT,
    headers: { 'Accept': '*/*' },
    maxRetries: 3,
    baseBackoffMs: 1000,
  });
  const r = await blakFetcher.fetch(SOURCE_URL);
  const jsText = r.body.toString('utf8');
  console.log('  Received ' + (jsText.length / 1024).toFixed(1) + ' KB in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's' + (r.fromCache ? ' (CACHED ' + (r.notModified ? '304' : 'stale') + ')' : ' (FRESH)'));
  const stats = blakFetcher.getStats();
  if (stats.metrics) console.log('  Stats: avgDur=' + stats.metrics.avgDurationMs + 'ms, 429s=' + stats.metrics.total429 + ', consecutiveSuccess=' + stats.metrics.consecutiveSuccess);

  console.log('  Parsing...');
  const raw = parseBlakadderJs(jsText);
  const slugs = Object.keys(raw);
  console.log('  Devices: ' + slugs.length);

  console.log('  Normalizing...');
  const devices = slugs.map(s => normalizeDevice(s, raw[s]));

  console.log('  Extracting sacred couples (mfr+pid)...');
  const couples = [];
  for (const d of devices) {
    const cs = extractSacredCouples(d);
    for (const c of cs) couples.push(c);
  }
  // Dedup
  const coupleMap = new Map();
  for (const c of couples) {
    const key = c.mfr + '|' + c.pid;
    if (!coupleMap.has(key)) {
      coupleMap.set(key, { mfr: c.mfr, pid: c.pid, vendors: new Set(), models: new Set(), categories: new Set(), count: 0 });
    }
    const e = coupleMap.get(key);
    e.vendors.add(c.vendor);
    e.models.add(c.model);
    e.categories.add(c.category);
    e.count++;
  }
  const coupleList = [...coupleMap.values()].map(e => ({
    mfr: e.mfr,
    pid: e.pid,
    vendors: [...e.vendors],
    models: [...e.models].filter(Boolean),
    categories: [...e.categories],
    count: e.count,
  }));

  // Category breakdown
  const catCount = {};
  for (const d of devices) catCount[d.category] = (catCount[d.category] || 0) + 1;
  const compatCount = {};
  for (const d of devices) for (const c of d.compatible) compatCount[c] = (compatCount[c] || 0) + 1;

  // Vendor breakdown
  const vendorCount = {};
  for (const d of devices) vendorCount[d.vendor] = (vendorCount[d.vendor] || 0) + 1;

  // Save
  fs.writeFileSync(path.join(STATE_DIR, 'database-raw.json'), JSON.stringify(raw, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'devices.json'), JSON.stringify(devices, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'mfr-pid.json'), JSON.stringify(coupleList, null, 2));

  // Symlink to data/blakadder for easy reference
  fs.writeFileSync(path.join(DATA_DIR, 'mfr-pid.json'), JSON.stringify(coupleList, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'devices.json'), JSON.stringify(devices, null, 2));

  const state = {
    lastRun: new Date().toISOString(),
    source: SOURCE_URL,
    totalDevices: devices.length,
    totalSacredCouples: coupleList.length,
    categories: catCount,
    compatibility: compatCount,
    topVendors: Object.entries(vendorCount).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([v, c]) => ({ vendor: v, count: c })),
    durationMs: Date.now() - t0,
  };
  fs.writeFileSync(path.join(STATE_DIR, 'state.json'), JSON.stringify(state, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('Total devices : ' + state.totalDevices);
  console.log('Sacred couples: ' + state.totalSacredCouples);
  console.log('Categories    :');
  for (const [k, v] of Object.entries(catCount).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + k.padEnd(12) + ' ' + v);
  }
  console.log('Top vendors   :');
  for (const v of state.topVendors.slice(0, 10)) {
    console.log('  ' + v.vendor.padEnd(28) + ' ' + v.count);
  }
  console.log('Compatibility :');
  for (const [k, v] of Object.entries(compatCount).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + k.padEnd(12) + ' ' + v);
  }
  console.log('\nOutput: ' + STATE_DIR);
  console.log('Next  : run blakadder-cross-ref.js to compare with mfs_db + Johan + Gmail');
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
