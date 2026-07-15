#!/usr/bin/env node
'use strict';

/**
 * tools/ci/device-investigator.js  v9.0.270
 *
 * P64.10 — Comprehensive per-device deep investigator.
 *
 * For every (mfr+pid) the tool reads the COMPLETE device footprint:
 *
 *   1. mfs_db (top-level + sacredCouples + productNames)               — our authoritative DB
 *   2. driver.compose.json  → capabilities, manufacturerName list      — our driver
 *   3. driver.js + device.js + configs.js → DPs, clusters, flow cards  — our implementation
 *   4. driver.flow.compose.json → triggers / conditions / actions      — our flow surface
 *   5. lib/tuya/fingerprints.json → current driver mapping             — runtime fingerprint
 *   6. data/dp_database.json → every DP seen in any Tuya device        — cross-device reference
 *   7. Z2M cache (data/z2m_cache.json) → vendor/model/description      — local cache
 *   8. Z2M herdsman-converters (raw GitHub) → DEFINITIVE exposes & DPs — source of truth for Z2M
 *   9. Z2M device page (zigbee2mqtt.io) → exposes, clusters, settings  — user-facing doc
 *  10. deconz-rest-plugin (GitHub) → known support + DPs               — alternative impl
 *  11. Hubitat community forum → driver implementation + bugs           — community reality
 *  12. AliExpress search → commercial product description               — user-visible reality
 *  13. DuckDuckGo / Google → bug reports 1 product by 1                — known issues
 *
 * Per device, the tool outputs:
 *   - Vendor, model, all device names across all sources
 *   - ALL clusters (input + output), from every source, even those we do NOT bind
 *   - ALL Tuya DPs (numeric 1..255), from every source, even unused ones
 *   - ALL Z2M exposes (binary, numeric, enum, composite, text, list)
 *   - ALL our capabilities + all our flow cards (triggers/conditions/actions)
 *   - GAP ANALYSIS: what Z2M exposes that we don't, what we have that Z2M doesn't
 *   - FLOW GAP ANALYSIS: which of our capabilities has NO flow card
 *   - Known bugs from web + GH
 *   - Commercial description + AliExpress link
 *
 * Usage:
 *   node tools/ci/device-investigator.js --mfr _TZE200_ka8l86iu --pid TS0601
 *   node tools/ci/device-investigator.js --family ZG-204
 *   node tools/ci/device-investigator.js --mfr _TZE200_ka8l86iu --pid TS0601 --webfetch
 *   node tools/ci/device-investigator.js --matrix --family ZG-204
 *   node tools/ci/device-investigator.js --matrix --all
 *   node tools/ci/device-investigator.js --mfr _TZE200_ka8l86iu --pid TS0601 --bugs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB        = path.join(ROOT, 'data', 'mfs_db.json');
const TUYA_FP       = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const DP_DB         = path.join(ROOT, 'data', 'dp_database.json');
const Z2M_CACHE     = path.join(ROOT, 'data', 'z2m_cache.json');
const DEVICE_MATRIX = path.join(ROOT, 'data', 'device_matrix.json');
const DRIVERS_DIR   = path.join(ROOT, 'drivers');
const STATE_DIR     = path.join(ROOT, '.github', 'state');

const Z2M_HERDSMAN_BASE =
  'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/';
const Z2M_SUPPORTED_URL =
  'https://www.zigbee2mqtt.io/supported-devices';
const Z2M_DEVICE_URL =
  'https://www.zigbee2mqtt.io/devices';
const DECONZ_REPO = 'https://api.github.com/search/code?q=repo:dresden-elektronik/deconz-rest-plugin+';
const HUBITAT_BASE = 'https://community.hubitat.com';
const ALIEXPRESS_BASE = 'https://www.aliexpress.com/wholesale';
const DDG_HTML = 'https://html.duckduckgo.com/html/';

// ─── args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--mfr') opts.mfr = args[++i];
  else if (a === '--pid') opts.pid = args[++i];
  else if (a === '--family') opts.family = args[++i];
  else if (a === '--name') opts.name = args[++i];
  else if (a === '--webfetch') opts.webfetch = true;
  else if (a === '--bugs') opts.bugs = true;
  else if (a === '--matrix') opts.matrix = true;
  else if (a === '--all') opts.all = true;
  else if (a === '--limit') opts.limit = parseInt(args[++i], 10) || 5;
  else if (a === '--out') opts.out = args[++i];
  else if (a === '--json') opts.json = true;
  else if (a === '--no-color') opts.noColor = true;
}
if (!opts.limit) opts.limit = 10;

// ─── colors ────────────────────────────────────────────────────────────────
const c = opts.noColor ? {
  reset:'', bold:'', dim:'', red:'', green:'', yellow:'', blue:'',
  magenta:'', cyan:'', gray:'',
} : {
  reset:'\x1b[0m', bold:'\x1b[1m', dim:'\x1b[2m',
  red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', blue:'\x1b[34m',
  magenta:'\x1b[35m', cyan:'\x1b[36m', gray:'\x1b[90m',
};
const ok  = (s) => `${c.green}✓${c.reset} ${s}`;
const ko  = (s) => `${c.red}✗${c.reset} ${s}`;
const wn  = (s) => `${c.yellow}!${c.reset} ${s}`;
const hd  = (s) => `${c.bold}${c.cyan}${s}${c.reset}`;
const sub = (s) => `${c.dim}${s}${c.reset}`;
const tag = (s, color=c.magenta) => `${color}[${s}]${c.reset}`;

// ─── HTTP fetch ────────────────────────────────────────────────────────────
function fetchUrl(url, { timeout = 12000, headers = {}, maxBytes = 5_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch (e) { return reject(new Error('bad url: ' + url)); }
    const opts2 = {
      method: 'GET',
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      headers: {
        'User-Agent': 'Mavis-Investigator/2.0 (zigbee research; +https://github.com/dlnraja/com.tuya.zigbee)',
        'Accept': 'text/html,application/xhtml+xml,application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers,
      },
    };
    const req = https.request(opts2, res => {
      // follow up to 3 redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        res.resume();
        return resolve(fetchUrl(next, { timeout, headers, maxBytes }));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let len = 0;
      const chunks = [];
      res.on('data', d => {
        len += d.length;
        if (len > maxBytes) {
          req.destroy(new Error('response too large'));
          return;
        }
        chunks.push(d);
      });
      res.on('end', () => resolve({
        status: res.statusCode,
        url,
        text: Buffer.concat(chunks).toString('utf8'),
        contentType: res.headers['content-type'] || '',
      }));
    });
    req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

// ─── JSON helpers ──────────────────────────────────────────────────────────
function loadJson(p, fallback = null) {
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {}
  return fallback;
}
function loadMfsDb()  { return loadJson(MFS_DB, {}); }
function loadFps()    { return loadJson(TUYA_FP, {}); }
function loadDpDb()   { return loadJson(DP_DB, {}); }
function loadZ2MCache() { return loadJson(Z2M_CACHE, {}); }

// ─── our driver analysis ──────────────────────────────────────────────────
function findDriverForMfr(mfr, preferredDriver = null) {
  if (!mfr || !fs.existsSync(DRIVERS_DIR)) return null;
  const mfrLower = mfr.toLowerCase();
  // If we have a preferred driver (from fingerprint, sacredCouples, etc.),
  // try it first. Otherwise return the first driver that contains the mfr.
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  if (preferredDriver && drivers.includes(preferredDriver)) {
    const cf = path.join(DRIVERS_DIR, preferredDriver, 'driver.compose.json');
    if (fs.existsSync(cf)) {
      try {
        const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
        const mfrs = c.zigbee?.manufacturerName || [];
        if (mfrs.some(x => x.toLowerCase() === mfrLower)) {
          return { name: preferredDriver, config: c, compose: cf };
        }
      } catch (_) {}
    }
  }
  for (const name of drivers) {
    const cf = path.join(DRIVERS_DIR, name, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
      const mfrs = c.zigbee?.manufacturerName || [];
      if (mfrs.some(x => x.toLowerCase() === mfrLower)) {
        return { name, config: c, compose: cf };
      }
    } catch (_) {}
  }
  return null;
}

function listAllMfrs() {
  const out = new Set();
  if (!fs.existsSync(DRIVERS_DIR)) return out;
  for (const e of fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const cf = path.join(DRIVERS_DIR, e.name, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const m of c.zigbee?.manufacturerName || []) out.add(m);
    } catch (_) {}
  }
  return out;
}

function analyzeDriver(driverName) {
  const dir = path.join(DRIVERS_DIR, driverName);
  if (!fs.existsSync(dir)) return null;
  const result = {
    name: driverName,
    files: {},
    capabilities: [],
    capabilitiesOptions: {},
    manufacturerNames: [],
    productIds: [],
    clusters: { input: [], output: [] },
    datapoints: [],        // every DP referenced anywhere in driver code
    settings: [],
    flowIds: { triggers: [], conditions: [], actions: [] },
    flowTitleMap: {},
    clusterFromCompose: [],
    mfrs: { inCompose: [], inFingerprint: [] },
  };

  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isFile()) result.files[f] = stat.size;
  }

  // driver.compose.json — source of truth
  const cf = path.join(dir, 'driver.compose.json');
  if (fs.existsSync(cf)) {
    try {
      const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
      result.capabilities = c.capabilities || [];
      result.capabilitiesOptions = c.capabilitiesOptions || {};
      result.manufacturerNames = c.zigbee?.manufacturerName || [];
      result.productIds = c.zigbee?.productId || [];
      result.settings = c.settings || [];
      const eps = c.zigbee?.endpoints || {};
      for (const [epName, ep] of Object.entries(eps)) {
        for (const cl of (ep.clusters || [])) {
          if (typeof cl === 'number') {
            if (!result.clusterFromCompose.includes(cl)) result.clusterFromCompose.push(cl);
          } else if (typeof cl === 'string') {
            const n = parseInt(cl, 10);
            if (!isNaN(n) && !result.clusterFromCompose.includes(n)) result.clusterFromCompose.push(n);
          }
        }
      }
    } catch (_) {}
  }

  // driver.flow.compose.json
  const flowFile = path.join(dir, 'driver.flow.compose.json');
  if (fs.existsSync(flowFile)) {
    try {
      const c = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
      for (const arr of [['triggers', c.triggers], ['conditions', c.conditions], ['actions', c.actions]]) {
        const [kind, list] = arr;
        for (const it of (list || [])) {
          if (it?.id) {
            result.flowIds[kind].push(it.id);
            if (it.title) {
              const en = (typeof it.title === 'object') ? (it.title.en || JSON.stringify(it.title)) : it.title;
              result.flowTitleMap[it.id] = en;
            }
          }
        }
      }
    } catch (_) {}
  }

  // Walk every JS file in the driver dir — extract DPs, clusters, flow IDs
  const jsFiles = [];
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.js')) jsFiles.push(path.join(dir, f));
  }
  // Also include configs.js if present
  const configsFile = path.join(dir, 'configs.js');
  if (fs.existsSync(configsFile)) jsFiles.push(configsFile);

  for (const fp of jsFiles) {
    let txt;
    try { txt = fs.readFileSync(fp, 'utf8'); } catch (_) { continue; }
    // DP references — many forms:
    //   dpMap[1] = ..., [101, 'name'], dp: 1, getDataPoint: 1, tuyaDatapoint: 1
    //   tuyaDp: {1: 'foo'}, 1: {cap: ...}
    //   dpMap: { 1: {cap: 'alarm_motion'}, 12: {cap: 'measure_luminance'} }
    const dpMatches1 = txt.matchAll(/\[(\d{1,3})\s*[,\]]\s*\{?\s*['"`]?cap/g);
    for (const m of dpMatches1) addDp(result, +m[1], 'cap-map');
    const dpMatches2 = txt.matchAll(/datapoint\s*[=:]\s*(\d{1,3})/gi);
    for (const m of dpMatches2) addDp(result, +m[1], 'datapoint');
    const dpMatches3 = txt.matchAll(/tuyaDp\s*[=:]\s*(\d{1,3})/gi);
    for (const m of dpMatches3) addDp(result, +m[1], 'tuyaDp');
    const dpMatches4 = txt.matchAll(/DP\s*\(?\s*(\d{1,3})\s*\)?/g);
    for (const m of dpMatches4) addDp(result, +m[1], 'DP');
    const dpMatches5 = txt.matchAll(/dataPoint\s*[=:]\s*(\d{1,3})/g);
    for (const m of dpMatches5) addDp(result, +m[1], 'dataPoint');
    const dpMatches6 = txt.matchAll(/getDataPoint\s*\(\s*(\d{1,3})\s*\)/g);
    for (const m of dpMatches6) addDp(result, +m[1], 'getDataPoint');
    // dpMap / dpMapping / tuyaDPs object keys: "  12: {...}" inside a dpMap = {} block
    const dpMapBlocks = txt.matchAll(/(?:dpMap|dpMapping|tuyaDPs|tuya_dps)\s*[:=]\s*\{([\s\S]*?)\n\s*\}/g);
    for (const blk of dpMapBlocks) {
      const keyRe = /^\s*(\d{1,3})\s*:/gm;
      let km;
      while ((km = keyRe.exec(blk[1])) !== null) {
        addDp(result, +km[1], 'dpMap-key');
      }
    }
    // cluster[NNN] / clusters: [NNN]
    const cl1 = txt.matchAll(/clusters?\[['"]?(\d{1,5})['"]?\]/g);
    for (const m of cl1) addCluster(result, +m[1], 'code');
    const cl2 = txt.matchAll(/clusters?\s*[=:]\s*\[\s*(\d{1,5})/g);
    for (const m of cl2) addCluster(result, +m[1], 'code');
    const cl3 = txt.matchAll(/cluster\s*=\s*(\d{1,5})/g);
    for (const m of cl3) addCluster(result, +m[1], 'code');
    // flow card IDs registered in code
    for (const kind of ['trigger', 'condition', 'action']) {
      const re = new RegExp(`register(?:RunListener|Card)\\s*\\(\\s*['"\`]([a-z0-9_.\\-]+)['"\`]\\s*,\\s*['"\`]${kind}['"\`]`, 'g');
      const it = txt.matchAll(re);
      for (const m of it) {
        const id = m[1];
        if (!result.flowIds[kind + 's'].includes(id)) result.flowIds[kind + 's'].push(id);
      }
    }
  }
  return result;
}

function addDp(result, id, source) {
  if (!result.datapoints.find(d => d.id === id)) result.datapoints.push({ id, source });
}
function addCluster(result, id, source) {
  if (!result.clusters.input.includes(id)) result.clusters.input.push(id);
  result.clusterFromSource = result.clusterFromSource || {};
  result.clusterFromSource[id] = source;
}

// ─── Z2M cache lookup ──────────────────────────────────────────────────────
function lookupZ2MCache(mfr, pid) {
  const cache = loadZ2MCache();
  if (!cache) return null;
  const mfrLower = (mfr || '').toLowerCase();
  const pidLower = (pid || '').toLowerCase();
  const results = [];
  const visit = (obj, familyKey) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj.manufacturerName) && obj.modelId) {
      const mfrs = obj.manufacturerName.map(x => x.toLowerCase());
      const mfrsNoWild = mfrs.filter(x => !x.includes('*'));
      const mfrsWild = mfrs.filter(x => x.includes('*'));
      const matches = mfrsNoWild.includes(mfrLower) ||
        mfrsWild.some(x => matchWildcard(x, mfrLower));
      if (matches && (obj.modelId.toLowerCase() === pidLower || !pid)) {
        results.push({ ...obj, family: familyKey, matchedMfr: mfr });
      }
    } else if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) visit(v, k);
      }
    }
  };
  visit(cache, null);
  return results.length ? results[0] : null;
}

function matchWildcard(pattern, str) {
  // _TZE204_* matches _TZE204_xyz
  const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return re.test(str);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Z2M herdsman-converters raw fetch ─────────────────────────────────────
// We try the per-vendor file when the cache tells us the vendor. Tuya
// devices (which is the bulk of our mfrs starting with _TZE / _TZ) live
// in tuya.ts. Some vendors like HOBEIAN, ZY-M100 also live in tuya.ts.
async function fetchZ2MHerdsmanDefinition(mfr, pid, vendorHint) {
  const filesToTry = [];
  const v = (vendorHint || '').toLowerCase();
  // Most Tuya-style mfrs (_TZE*, _TZ*) are in tuya.ts. Some vendors have
  // their own file. We try vendor-specific first, then tuya.ts as fallback.
  const vendorFileMap = {
    hobeian: ['hobeian', 'tuya'],
    'zy-m100': ['tuya'],
    mmwave: ['tuya'],
    soil_sensor: ['tuya'],
    aqara: ['xiaomi', 'tuya'],
    xiaomi: ['xiaomi', 'tuya'],
    lidl: ['lidl', 'tuya'],
    ikea: ['tradfri', 'tuya'],
    philips: ['philips', 'tuya'],
    osram: ['osram', 'tuya'],
    legrand: ['legrand', 'tuya'],
    schneider: ['schneider', 'tuya'],
    moes: ['tuya'],
    nous: ['tuya'],
    gledopto: ['gledopto', 'tuya'],
    sengled: ['sengled', 'tuya'],
    dexi: ['tuya'],
  };
  const candidates = vendorFileMap[v] || ['tuya'];
  for (const c of candidates) filesToTry.push(`${Z2M_HERDSMAN_BASE}${c}.ts`);

  for (const url of filesToTry) {
    try {
      const res = await fetchUrl(url, { timeout: 15000, maxBytes: 8_000_000 });
      const found = parseZ2MHerdsmanForMfr(res.text, mfr, pid);
      if (found) return { ...found, sourceFile: url };
    } catch (e) {
      // log first attempt
      if (filesToTry.indexOf(url) === 0) {
        console.log(`   [fetch] ${url} → ${e.message}`);
      }
    }
  }
  return null;
}

function parseZ2MHerdsmanForMfr(text, mfr, pid) {
  // Strategy: find any line that mentions the manufacturer name OR a Tuya
  // fingerprint that lists the manufacturer. Then expand to the enclosing
  // object { ... } and parse out the device definition.
  if (!text) return null;
  const mfrLower = mfr.toLowerCase();
  const mfrs = [mfr.toLowerCase(), mfr.toUpperCase()];
  const lines = text.split(/\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const lLower = l.toLowerCase();
    if (!mfrs.some(m => lLower.includes(m.toLowerCase()))) continue;
    // skip comments
    if (l.trim().startsWith('//') || l.trim().startsWith('*')) continue;
    hits.push(i);
  }
  if (!hits.length) return null;

  // For each hit, expand to enclosing top-level device object { ... }
  const matches = [];
  for (const i of hits) {
    // Walk back to find the start of the device object: a line that begins
    // a top-level "    {" or "    {\n" after another "},\n" or file start.
    let start = i;
    for (let k = i; k > Math.max(0, i - 400); k--) {
      const t = lines[k].trim();
      // Device object always starts with "{" at indent 4 (inside export default [...])
      if (t === '{' && (k === 0 || lines[k - 1].trim() === '},' || lines[k - 1].trim() === '],')) {
        start = k; break;
      }
    }
    // Walk forward until balanced braces close
    let depth = 0, end = start;
    for (let k = start; k < lines.length; k++) {
      for (const ch of lines[k]) {
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } }
      }
      if (end > start) break;
    }
    const block = lines.slice(start, end + 1).join('\n');

    // Check that the mfr is actually IN this block (not just coincidentally
    // nearby) — match tuya.fingerprint or plain manufacturerName.
    // The mfr may appear in any case in the source file.
    const mfrRe = new RegExp(`tuya\\.fingerprint\\s*\\(\\s*['"\`]${escapeRe(mfr)}['"\`]|["'\`]${escapeRe(mfr)}["\`]`, 'i');
    if (!mfrRe.test(block)) continue;

    // Extract zigbeeModel
    const zmMatch = block.match(/zigbeeModel\s*:\s*\[([^\]]+)\]/);
    const zigbeeModels = zmMatch ? zmMatch[1].match(/['"`]([^'"`]+)['"`]/g)?.map(x => x.replace(/['"`]/g, '')) : [];
    // Extract model
    const modelMatch = block.match(/model\s*:\s*['"`]([^'"`]+)['"`]/);
    // Extract vendor
    const vendorMatch = block.match(/vendor\s*:\s*['"`]([^'"`]+)['"`]/);
    // Extract description
    const descMatch = block.match(/description\s*:\s*['"`]([^'"`]+)['"`]/);

    // Extract exposes (block from exposes: [ to matching ])
    let exposes = [];
    const exposesStart = block.indexOf('exposes:');
    if (exposesStart >= 0) {
      // find matching ]
      let depth2 = 0, end2 = exposesStart, started = false;
      for (let k = exposesStart; k < block.length; k++) {
        const ch = block[k];
        if (ch === '[') { depth2++; started = true; }
        else if (ch === ']') { depth2--; if (started && depth2 === 0) { end2 = k; break; } }
      }
      const exposesBlock = block.slice(exposesStart, end2 + 1);
      exposes = parseExposesBlock(exposesBlock);
    }

    // Extract tuyaDatapoints from meta.tuyaDatapoints — these are the DPs
    const dps = [];
    const dpBlock = block.match(/tuyaDatapoints\s*:\s*\[([\s\S]*?)\n\s*\],?\s*\n\s*\}/);
    if (dpBlock) {
      const dpRe = /\[\s*(\d{1,3})\s*,\s*['"`]([^'"`]+)['"`]/g;
      let m;
      while ((m = dpRe.exec(dpBlock[1])) !== null) {
        dps.push({ id: +m[1], name: m[2] });
      }
    }
    // Also catch DPs from fromZigbee converters
    const dpRe2 = /\[\s*(\d{1,3})\s*,\s*['"`]([^'"`]+)['"`]/g;
    let m2;
    while ((m2 = dpRe2.exec(block)) !== null) {
      const id = +m2[1], name = m2[2];
      if (!dps.find(d => d.id === id)) dps.push({ id, name, source: 'fromZigbee' });
    }

    // Clusters referenced
    const clusterRefs = block.matchAll(/clusters?\[['"]?(\d{1,5})['"]?\]/g);
    const clusters = [];
    for (const m of clusterRefs) clusters.push(+m[1]);

    // whiteLabel entries (for cross-vendor variants)
    const whiteLabels = [];
    const wlRe = /whiteLabel\s*:\s*\[([\s\S]*?)\n\s*\]/;
    const wlMatch = block.match(wlRe);
    if (wlMatch) {
      const itemRe = /model\s*:\s*['"`]([^'"`]+)['"`][\s\S]*?vendor\s*:\s*['"`]([^'"`]+)['"`][\s\S]*?description\s*:\s*['"`]([^'"`]+)['"`]/g;
      let wm;
      while ((wm = itemRe.exec(wlMatch[1])) !== null) {
        whiteLabels.push({ model: wm[1], vendor: wm[2], description: wm[3] });
      }
    }

    const result = {
      line: i + 1,
      zigbeeModels,
      model: modelMatch?.[1],
      vendor: vendorMatch?.[1],
      description: descMatch?.[1],
      exposes,
      dps,
      clusters,
      whiteLabels,
      block: block.length > 4000 ? block.slice(0, 4000) + '\n... [truncated]' : block,
    };
    matches.push(result);

    if (pid && result.model && result.model.toLowerCase() === pid.toLowerCase()) {
      return result;
    }
  }
  return matches[0] || null;
}

function parseExposesBlock(text) {
  // Best-effort: extract feature names + custom property names from
  // exposes: [ e.X(...), e.numeric('name',...), e.binary('name',...) ... ]
  const out = [];
  // 1. Built-in exposes: e.presence(), e.battery(), e.switch(), e.lock(),
  //    e.contact(), e.water_leak(), e.smoke(), e.gas(), e.tamper(),
  //    e.action(), e.sos(), e.button(), e.vibration(), e.occupancy(),
  //    e.carbon_monoxide(), e.carbon_dioxide(), e.illuminance(),
  //    e.temperature(), e.humidity(), e.pressure(), e.voc(), e.eco2(),
  //    e.pm25(), e.noise(), e.distance(), e.soil_moisture(), ...
  const re1 = /\be\.([a-z_]+)\s*\(/g;
  let m;
  while ((m = re1.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  // 2. Custom property names: e.numeric("foo",...), e.binary("bar",...),
  //    e.enum("baz",...), e.composite("qux",...), e.text("name",...),
  //    e.list("items",...)
  const re2 = /\be\.(?:numeric|binary|enum|composite|text|list)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  while ((m = re2.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

// ─── Z2M device page fetch (HTML) ──────────────────────────────────────────
async function fetchZ2MDevicePage(model) {
  if (!model) return null;
  const url = `${Z2M_DEVICE_URL}/${encodeURIComponent(model)}.html`;
  try {
    const res = await fetchUrl(url, { timeout: 10000, maxBytes: 2_000_000 });
    return { url, html: res.text };
  } catch (e) {
    return { url, error: e.message };
  }
}

function extractZ2MDevicePageInfo(html) {
  if (!html) return null;
  // Look for expose names + clusters in the HTML
  const exposes = [];
  const re = /"feature"\s*:\s*"([a-z_]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!exposes.includes(m[1])) exposes.push(m[1]);
  }
  // Clusters in the page
  const clusters = [];
  const re2 = /\b(0x[0-9a-fA-F]{4})\b/g;
  while ((m = re2.exec(html)) !== null) {
    const n = parseInt(m[1], 16);
    if (!clusters.includes(n)) clusters.push(n);
  }
  // Pairing + OTA + power info
  const power = (html.match(/(?:Battery|Power|AC|DC|Current)\s*:\s*([0-9.]+\s*(?:V|mA|A|mAh))/) || [])[1];
  return { exposes, clusters, power };
}

// ─── DuckDuckGo / Google bug search ────────────────────────────────────────
async function ddgSearch(query, limit = 10) {
  const url = `${DDG_HTML}?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetchUrl(url, {
      timeout: 10000,
      maxBytes: 2_000_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });
    return parseDDGResults(res.text, limit);
  } catch (e) {
    return [];
  }
}

function parseDDGResults(html, limit) {
  const results = [];
  // DDG HTML lite structure: <a class="result__a" href="...">title</a>
  // <a class="result__snippet">snippet</a>
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (results.length >= limit) break;
    const title = stripHtml(m[2]).trim();
    const snippet = stripHtml(m[3]).trim();
    let url = m[1];
    // DDG wraps with /l/?uddg= — unwrap
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1]);
    results.push({ title, snippet, url });
  }
  return results;
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Hubitat / AliExpress search URLs ──────────────────────────────────────
function buildSearchLinks(mfr, model, pid) {
  const q = `${mfr} ${model || ''} ${pid || ''}`.trim();
  const enc = encodeURIComponent(q);
  return {
    z2m:          `${Z2M_SUPPORTED_URL}/?q=${enc}`,
    z2m_gh:       `https://github.com/Koenkk/zigbee2mqtt/issues?q=${enc}`,
    z2m_repo:     `https://github.com/Koenkk/zigbee-herdsman-converters/search?q=${enc}`,
    deconz_gh:    `https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=${enc}`,
    deconz_src:   `https://github.com/search?q=repo%3Adresden-elektronik%2Fdeconz-rest-plugin+${enc}&type=code`,
    hubitat:      `${HUBITAT_BASE}/search?q=${enc}`,
    hubitat_gh:   `https://github.com/search?q=org%3AHubitatCommunity+${enc}&type=repositories`,
    aliexpress:   `${ALIEXPRESS_BASE}?SearchText=${enc}`,
    taobao:       `https://s.taobao.com/search?q=${enc}`,
    google:       `https://www.google.com/search?q=${enc}+zigbee+homey+issue`,
    ddg:          `https://duckduckgo.com/?q=${enc}+zigbee+homey+issue`,
    forum_homey:  `https://community.homey.app/search?q=${enc}`,
  };
}

// ─── single device report ──────────────────────────────────────────────────
async function reportOne(mfr, pid, { webfetch = false, bugs = false, noColor = false } = {}) {
  const lines = [];
  const l = (s='') => lines.push(s);
  const section = (title) => l(`\n${hd('━'.repeat(60))}\n${hd('  ' + title)}\n${hd('━'.repeat(60))}`);

  l(`${hd('═══════════════════════════════════════════════════════════════════════')}`);
  l(`${hd('  DEVICE DEEP INVESTIGATE  ·  ' + mfr + '  /  ' + (pid || '(any)'))}`);
  l(`${hd('═══════════════════════════════════════════════════════════════════════')}`);

  // ─── 1. mfs_db ─────────────────────────────────────────────────────────
  section('1. mfs_db (our authoritative DB)');
  const mfs = loadMfsDb();
  let sacred = null, top = null, topKey = null;
  if (mfr) {
    if (pid) sacred = mfs.sacredCouples?.[`${mfr.toLowerCase()}|${pid.toLowerCase()}`];
    const candidates = [mfr.toUpperCase(), mfr.toLowerCase(), mfr];
    for (const k of candidates) {
      if (mfs[k]) { top = mfs[k]; topKey = k; break; }
    }
  }
  if (top) {
    l(`  top-level (${topKey}): ${ok(top.driverId || '?')} (${sub(top.source || '?')})`);
    if (top.productNames?.length) l(`  productNames:       ${top.productNames.join(', ')}`);
  } else {
    l('  top-level:           ' + ko('NOT FOUND'));
  }
  if (sacred) {
    l(`  sacredCouples:       ${ok(sacred.driver || '?')} (conf ${sacred.confidence || '?'})`);
    if (sacred.productNames?.length) l(`  productNames:        ${sacred.productNames.join(', ')}`);
  } else {
    l('  sacredCouples:       ' + ko('NOT FOUND for this (mfr, pid)'));
  }

  // ─── 2. driver.compose.json + driver.js + flow ─────────────────────────
  section('2. Our driver: compose + js + flow + configs');
  // Prefer the driver the fingerprint says (runtime truth)
  const fp = loadFps();
  const fpDriverId = fp[mfr]?.driverId || fp[mfr.toLowerCase()]?.driverId;
  const driver = findDriverForMfr(mfr, fpDriverId);
  let analysis = null;
  if (driver) {
    analysis = analyzeDriver(driver.name);
    l(`  driver:              ${ok(driver.name)}`);
    l(`  capabilities (${analysis.capabilities.length}):        ${analysis.capabilities.join(', ') || '-'}`);
    l(`  manufacturerNames (${analysis.manufacturerNames.length}):   ${analysis.manufacturerNames.length} total (first 5: ${analysis.manufacturerNames.slice(0, 5).join(', ')})`);
    l(`  productIds (${analysis.productIds.length}):             ${analysis.productIds.join(', ') || '-'}`);
    l(`  clusters (compose) (${analysis.clusterFromCompose.length}):    ${analysis.clusterFromCompose.join(', ') || '-'}`);
    l(`  clusters (code)    (${analysis.clusters.input.length}):    ${analysis.clusters.input.join(', ') || '-'}`);
    l(`  datapoints (code)   (${analysis.datapoints.length}):    ${analysis.datapoints.slice(0, 25).map(d => `${d.id}(${d.source})`).join(', ')}${analysis.datapoints.length > 25 ? ` … +${analysis.datapoints.length - 25}` : ''}`);
    l(`  flow triggers (${analysis.flowIds.triggers.length}):     ${analysis.flowIds.triggers.join(', ') || '-'}`);
    l(`  flow conditions (${analysis.flowIds.conditions.length}):  ${analysis.flowIds.conditions.join(', ') || '-'}`);
    l(`  flow actions   (${analysis.flowIds.actions.length}):     ${analysis.flowIds.actions.join(', ') || '-'}`);
    l(`  settings (${analysis.settings.length}):         ${analysis.settings.length} settings`);
  } else {
    l('  driver:              ' + ko('NOT FOUND in driver.compose.json'));
  }

  // ─── 3. fingerprints.json ──────────────────────────────────────────────
  section('3. Tuya fingerprints (lib/tuya/fingerprints.json)');
  if (fp[mfr]) {
    l(`  ${mfr} → ${ok(JSON.stringify(fp[mfr]))}`);
  } else if (fp[mfr.toLowerCase()]) {
    l(`  ${mfr.toLowerCase()} → ${ok(JSON.stringify(fp[mfr.toLowerCase()]))}`);
  } else {
    l(`  ${mfr} → ${ko('NOT FOUND in fingerprints.json')}`);
  }

  // ─── 4. Z2M cache ──────────────────────────────────────────────────────
  section('4. Z2M cache (data/z2m_cache.json — local)');
  const z2m = lookupZ2MCache(mfr, pid);
  if (z2m) {
    l(`  family:              ${z2m.family || '?'}`);
    l(`  vendor:              ${z2m.vendor || '?'}`);
    l(`  description:         ${z2m.description || '?'}`);
    l(`  z2m_model:           ${z2m.z2m_model || '?'}`);
    if (z2m.z2m_link) l(`  z2m_link:            ${z2m.z2m_link}`);
    if (z2m.note)     l(`  note:                ${z2m.note}`);
  } else {
    l('  ' + ko('NOT FOUND in local Z2M cache'));
  }

  // ─── 5. Z2M herdsman-converters (authoritative source) ─────────────────
  section('5. Z2M herdsman-converters (raw GitHub) — AUTHORITATIVE Z2M SOURCE');
  let herdsman = null;
  if (webfetch) {
    l('  fetching from ' + sub('github.com/Koenkk/zigbee-herdsman-converters') + ' …');
    herdsman = await fetchZ2MHerdsmanDefinition(mfr, pid, z2m?.vendor);
    if (herdsman) {
      l(`  ✓ found at ${sub(herdsman.sourceFile)} (line ${herdsman.line})`);
      l(`  vendor:              ${herdsman.vendor || '?'}`);
      l(`  model:               ${herdsman.model || '?'}`);
      l(`  description:         ${herdsman.description || '?'}`);
      l(`  exposes (${herdsman.exposes.length}):         ${herdsman.exposes.slice(0, 30).join(', ')}${herdsman.exposes.length > 30 ? ' …' : ''}`);
      l(`  tuya DPs (${herdsman.dps.length}):       ${herdsman.dps.slice(0, 30).map(d => `${d.id}=${d.name}`).join(', ')}${herdsman.dps.length > 30 ? ' …' : ''}`);
      l(`  clusters (${herdsman.clusters.length}):         ${herdsman.clusters.join(', ')}`);
    } else {
      l('  ' + ko('no entry found in herdsman-converters'));
    }
  } else {
    l('  skipped (use ' + sub('--webfetch') + ' to enable)');
  }

  // ─── 6. Z2M device page (zigbee2mqtt.io) ───────────────────────────────
  section('6. Z2M device page (zigbee2mqtt.io)');
  if (webfetch && z2m?.z2m_model) {
    const page = await fetchZ2MDevicePage(z2m.z2m_model);
    if (page?.html && !page.error) {
      const info = extractZ2MDevicePageInfo(page.html);
      if (info) {
        l(`  url:                 ${sub(page.url)}`);
        l(`  exposes (${info.exposes.length}):         ${info.exposes.join(', ') || '-'}`);
        l(`  clusters (${info.clusters.length}):         ${info.clusters.join(', ') || '-'}`);
        if (info.power) l(`  power:               ${info.power}`);
      } else {
        l('  ' + wn('page fetched but no info extracted'));
      }
    } else {
      l('  ' + ko(page?.error || 'page fetch failed'));
    }
  } else {
    l('  skipped (use ' + sub('--webfetch') + ' to enable, needs z2m_model from cache)');
  }

  // ─── 7. Commercial sources ─────────────────────────────────────────────
  section('7. Commercial product description (AliExpress / vendor)');
  const links = buildSearchLinks(mfr, z2m?.z2m_model || sacred?.productNames?.[0], pid);
  l(`  AliExpress:          ${links.aliexpress}`);
  l(`  Taobao:              ${links.taobao}`);
  l(`  (no direct fetch — these sites require JS / bot bypass)`);

  // ─── 8. Bug search ─────────────────────────────────────────────────────
  section('8. Bug search (DuckDuckGo / GitHub issues / Homey forum)');
  if (bugs) {
    l('  searching DuckDuckGo for bugs …');
    const queries = [
      `${mfr} ${pid} homey crash`,
      `${mfr} ${z2m?.z2m_model || ''} problem bug`,
      `${mfr} zigbee2mqtt issue`,
      `site:community.homey.app ${mfr}`,
    ].filter(q => q.trim());
    for (const q of queries.slice(0, 4)) {
      const results = await ddgSearch(q, 5);
      l(`\n  ${tag(q)}`);
      if (results.length === 0) {
        l(`    ${sub('(no results)')}`);
      } else {
        for (const r of results) {
          l(`    ${c.blue}•${c.reset} ${c.bold}${r.title.slice(0, 100)}${c.reset}`);
          l(`      ${sub(r.url)}`);
          if (r.snippet) l(`      ${r.snippet.slice(0, 200)}`);
        }
      }
    }
  } else {
    l('  skipped (use ' + sub('--bugs') + ' to enable)');
    l('  pre-built search links:');
    l(`    z2m issues:     ${links.z2m_gh}`);
    l(`    deconz issues:  ${links.deconz_gh}`);
    l(`    Hubitat forum:  ${links.hubitat}`);
    l(`    Homey forum:    ${links.forum_homey}`);
  }

  // ─── 9. Gap analysis: Z2M exposes vs our capabilities ──────────────────
  section('9. GAP ANALYSIS (Z2M exposes vs our capabilities)');
  if (herdsman && analysis) {
    const ourCapsLower = new Set(analysis.capabilities.map(x => x.toLowerCase()));
    const z2mExposes = herdsman.exposes || [];
    // Map common Z2M expose → likely Homey capability
    const exposeToCap = {
      occupancy: ['alarm_motion', 'alarm_human'],
      presence: ['alarm_motion', 'alarm_human'],
      contact: ['alarm_contact'],
      water_leak: ['alarm_water'],
      smoke: ['alarm_smoke'],
      gas: ['alarm_gas'],
      temperature: ['measure_temperature'],
      humidity: ['measure_humidity'],
      illuminance: ['measure_luminance'],
      battery: ['measure_battery', 'alarm_battery'],
      voltage: ['measure_voltage'],
      current: ['measure_current'],
      power: ['measure_power'],
      energy: ['meter_power', 'measure_power'],
      switch: ['onoff'],
      light: ['onoff', 'dim'],
      brightness: ['dim'],
      lock: ['locked', 'lockstate'],
      tamper: ['alarm_tamper'],
      action: ['alarm_motion'],
      sos: ['alarm_generic', 'alarm_sos'],
      button: ['alarm_motion', 'button'],
      vibration: ['alarm_tamper', 'alarm_vibration'],
      soil_moisture: ['measure_humidity', 'measure_soil_moisture'],
      eco2: ['measure_co2'],
      voc: ['measure_voc'],
      pm25: ['measure_pm25'],
      noise: ['measure_noise'],
      pressure: ['measure_pressure'],
      distance: ['measure_luminance.distance', 'measure_distance'],
    };
    const z2mOnly = [];
    for (const e of z2mExposes) {
      const matches = exposeToCap[e] || [];
      const hit = matches.some(c => ourCapsLower.has(c));
      if (!hit) z2mOnly.push(e);
    }
    if (z2mOnly.length === 0) {
      l(`  ${ok('FULL COVERAGE — every Z2M expose maps to a Homey capability')}`);
    } else {
      l(`  ${wn(z2mOnly.length + ' Z2M expose(s) with NO direct Homey capability:')}`);
      for (const e of z2mOnly) {
        const sugg = exposeToCap[e] ? ` → suggest: ${exposeToCap[e].join(' / ')}` : '';
        l(`    ${c.yellow}•${c.reset} ${e}${sub(sugg)}`);
      }
    }
  } else if (!webfetch) {
    l(`  ${sub('skipped (run with --webfetch to compare against herdsman-converters)')}`);
  } else {
    l(`  ${sub('herdsman data unavailable for this mfr')}`);
  }

  // ─── 10. Flow gap analysis: our caps vs our flow cards ─────────────────
  section('10. FLOW GAP ANALYSIS (our capabilities vs our flow cards)');
  if (analysis) {
    const flowIds = new Set([...analysis.flowIds.triggers, ...analysis.flowIds.conditions, ...analysis.flowIds.actions]);
    const capSubstrings = {
      alarm_motion: ['motion', 'presence', 'movement'],
      alarm_contact: ['contact', 'opened', 'closed'],
      alarm_water: ['water', 'leak'],
      alarm_smoke: ['smoke', 'fire'],
      alarm_gas: ['gas'],
      alarm_tamper: ['tamper', 'vibration'],
      alarm_battery: ['battery'],
      alarm_human: ['human', 'presence', 'motion'],
      measure_temperature: ['temperature', 'temp'],
      measure_humidity: ['humidity', 'humid'],
      measure_luminance: ['luminance', 'lux', 'illuminance', 'light'],
      measure_battery: ['battery'],
      measure_voltage: ['voltage'],
      measure_current: ['current'],
      measure_power: ['power'],
      meter_power: ['energy', 'consumption'],
      onoff: ['switch', 'relay', 'on', 'off'],
      dim: ['dim', 'brightness'],
      locked: ['lock', 'locked'],
      measure_co2: ['co2', 'carbon'],
      measure_soil_moisture: ['soil', 'moisture'],
    };
    const gaps = [];
    for (const cap of analysis.capabilities) {
      const keywords = capSubstrings[cap] || [cap.split('_')[0]];
      const hit = [...flowIds].some(id => keywords.some(k => id.toLowerCase().includes(k)));
      if (!hit) gaps.push(cap);
    }
    if (gaps.length === 0) {
      l(`  ${ok('all capabilities have at least one flow card keyword match')}`);
    } else {
      l(`  ${wn(gaps.length + ' capability(ies) with NO flow card keyword match:')}`);
      for (const c2 of gaps) l(`    ${c.yellow}•${c.reset} ${c2}`);
    }
  } else {
    l('  ' + sub('driver not found'));
  }

  // ─── 11. Summary table ─────────────────────────────────────────────────
  section('11. SUMMARY');
  l(`  ${tag('mfr')}        ${mfr}`);
  l(`  ${tag('pid')}        ${pid || '(none)'}`);
  l(`  ${tag('driver')}     ${analysis ? analysis.name : ko('NONE')}`);
  l(`  ${tag('mfs_db')}     top-level: ${top ? ok(top.driverId) : ko('MISSING')}  sacred: ${sacred ? ok(sacred.driver) : ko('MISSING')}`);
  l(`  ${tag('fp')}         ${fp[mfr]?.driverId || fp[mfr.toLowerCase()]?.driverId || ko('MISSING')}`);
  l(`  ${tag('z2m')}        ${z2m ? ok('in cache') : ko('NOT in cache')}  ${z2m?.z2m_model || ''}`);
  l(`  ${tag('caps')}       ${analysis?.capabilities.length || 0}`);
  l(`  ${tag('flows')}      ${analysis ? analysis.flowIds.triggers.length + '/' + analysis.flowIds.conditions.length + '/' + analysis.flowIds.actions.length : '-'}`);
  l(`  ${tag('DPs(code)')}  ${analysis?.datapoints.length || 0}`);
  l(`  ${tag('DPs(z2m)')}   ${herdsman?.dps.length || '-'}`);
  l(`  ${tag('cl(compose)')} ${analysis?.clusterFromCompose.length || 0}`);
  l(`  ${tag('cl(code)')}   ${analysis?.clusters.input.length || 0}`);
  l(`  ${tag('exposes')}    ${herdsman?.exposes.length || '-'}`);

  // Save
  const result = {
    mfr, pid,
    driver: analysis?.name,
    capabilities: analysis?.capabilities || [],
    clusters: { compose: analysis?.clusterFromCompose || [], code: analysis?.clusters.input || [] },
    datapoints: { code: analysis?.datapoints || [], z2m: herdsman?.dps || [] },
    exposes: herdsman?.exposes || [],
    flows: analysis?.flowIds || { triggers: [], conditions: [], actions: [] },
    z2m_cache: z2m,
    sacred,
    top,
    herdsman_block: herdsman?.block,
    search_links: links,
  };
  if (opts.out) {
    fs.writeFileSync(opts.out, JSON.stringify(result, null, 2));
    l(`\n  ${sub('saved to ' + opts.out)}`);
  }
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  console.log(lines.join('\n'));
  return result;
}

// ─── family / matrix ───────────────────────────────────────────────────────
async function reportFamily(family) {
  const z2m = loadZ2MCache();
  if (!z2m) { console.log('z2m_cache.json not found'); return; }
  const familyKey = Object.keys(z2m).find(k => k.toLowerCase().includes(family.toLowerCase()));
  if (!familyKey) { console.log(`No family block matching "${family}"`); return; }
  const block = z2m[familyKey];
  console.log(hd(`\n═══════════════════════════════════════════════════════════════════════`));
  console.log(hd(`  FAMILY: ${family}  →  ${familyKey}`));
  console.log(hd(`═══════════════════════════════════════════════════════════════════════`));
  for (const [modelName, info] of Object.entries(block)) {
    if (!info.manufacturerName) continue;
    const mfrs = Array.isArray(info.manufacturerName) ? info.manufacturerName : [info.manufacturerName];
    for (const mfr of mfrs) {
      if (mfr.includes('*')) continue; // skip wildcard placeholders
      const pid = info.modelId || 'TS0601';
      await reportOne(mfr, pid, { webfetch: opts.webfetch, bugs: opts.bugs, noColor: opts.noColor });
    }
  }
}

async function buildMatrix(family) {
  const z2m = loadZ2MCache();
  if (!z2m) { console.log('z2m_cache.json not found'); return; }
  let targets;
  if (family) {
    targets = [Object.keys(z2m).find(k => k.toLowerCase().includes(family.toLowerCase()))];
  } else if (opts.all) {
    targets = Object.keys(z2m).filter(k => !k.startsWith('_'));
  } else {
    targets = Object.keys(z2m).filter(k => !k.startsWith('_'));
  }
  const matrix = [];
  for (const familyKey of targets) {
    if (!familyKey || !z2m[familyKey]) continue;
    const block = z2m[familyKey];
    for (const [modelName, info] of Object.entries(block)) {
      if (!info.manufacturerName) continue;
      const mfrs = Array.isArray(info.manufacturerName) ? info.manufacturerName : [info.manufacturerName];
      for (const mfr of mfrs) {
        if (mfr.includes('*')) continue;
        const pid = info.modelId || 'TS0601';
        const driver = findDriverForMfr(mfr);
        const fp = loadFps();
        const sacred = loadMfsDb().sacredCouples?.[`${mfr.toLowerCase()}|${pid.toLowerCase()}`];
        const topU = loadMfsDb()[mfr.toUpperCase()];
        const topL = loadMfsDb()[mfr.toLowerCase()];
        const top = topU || topL;
        matrix.push({
          mfr, pid, model: info.z2m_model || modelName, family: familyKey,
          description: info.description, vendor: info.vendor,
          driver_compose: driver?.name || 'MISSING',
          fingerprint: fp[mfr]?.driverId || fp[mfr.toLowerCase()]?.driverId || 'MISSING',
          mfs_top: top?.driverId || 'MISSING',
          mfs_sacred: sacred?.driver || 'MISSING',
          z2m_link: info.z2m_link,
        });
      }
    }
  }
  // Summary table
  console.log(hd('\n═══ DEVICE MATRIX ═══\n'));
  const cols = [
    ['MFR', 24], ['PID', 10], ['Model', 22], ['Driver', 26], ['Sacred', 24],
  ];
  const fmt = (cells) => cells.map(([v, w]) => String(v).slice(0, w).padEnd(w)).join(' | ');
  console.log(fmt(cols));
  console.log(cols.map(([_, w]) => '-'.repeat(w)).join('-+-'));
  for (const r of matrix) {
    console.log(fmt([
      [r.mfr, 24], [r.pid, 10], [r.model, 22], [r.driver_compose, 26], [r.mfs_sacred, 24],
    ]));
  }
  fs.writeFileSync(DEVICE_MATRIX, JSON.stringify(matrix, null, 2));
  console.log(sub(`\n💾 saved ${matrix.length} entries to data/device_matrix.json`));
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  if (opts.matrix) { await buildMatrix(opts.family); return; }
  if (opts.family) { await reportFamily(opts.family); return; }
  if (opts.mfr) { await reportOne(opts.mfr, opts.pid || 'TS0601', opts); return; }
  console.log(`device-investigator v2 (P64.10)
Usage:
  --mfr <mfr> --pid <pid> [--webfetch] [--bugs]   # investigate one device
  --family <name> [--webfetch] [--bugs]          # investigate a family
  --matrix [--family <name>|--all]                # build device matrix
  --out <file>                                    # save JSON output
  --json                                          # output JSON instead of text
`);
}

main().catch(e => { console.error(e); process.exit(1); });
