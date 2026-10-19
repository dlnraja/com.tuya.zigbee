#!/usr/bin/env node
/**
 * ZHA Full Quirks Crawler - bypasses GitHub API rate limits
 * Uses raw.githubusercontent.com + known directory index
 * Run: node scripts/sync/crawl-zha.js
 */
const fs = require("fs");
const path = require("path");

// ── Intelligent Cache Integration ────────────────────────────────────────
let ScannerCache;
try {
  ScannerCache = require('../scanners/scanner-cache').ScannerCache;
} catch { /* fallback: no caching */ }
const CACHE_ID = 'zha';

const RAW = "https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/";
const OUT = path.join(__dirname, "data");
const TUYA_MFR = /(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)/;

// Known ZHA tuya quirk subdirs + files (maintained list)
const TUYA_FILES = [
  "tuya/__init__.py","tuya/air.py","tuya/builder/__init__.py",
  "tuya/mcu/__init__.py","tuya/ts0041.py","tuya/ts0042.py",
  "tuya/ts0043.py","tuya/ts0044.py","tuya/ts0045.py","tuya/ts0046.py",
  "tuya/ts0601_trv.py","tuya/ts0601_motion.py","tuya/ts0601_dimmer.py",
  "tuya/ts0601_cover.py","tuya/ts0601_siren.py","tuya/ts0601_switch.py",
  "tuya/ts0601_electric_heating.py","tuya/ts0601_thermostat.py",
  "tuya/ts0601_garage.py","tuya/ts0601_rcbo.py",
  "tuya/ts011f.py","tuya/ts0121.py","tuya/ts0222.py",
  "tuya/ts0501.py","tuya/ts0502.py","tuya/ts0504.py","tuya/ts0505.py",
  "tuya/ts110e.py","tuya/ts130f.py","tuya/ts1201.py",
  "tuya/valve.py","tuya/smoke.py","tuya/water.py",
];
// Also scan other brand dirs that may contain Tuya devices
const OTHER_FILES = [
  "moes/__init__.py","moes/thermostat.py","moes/motion.py",
  "zemismart/__init__.py","zemismart/ts110e.py","zemismart/ts0002.py",
  "lonsonho/__init__.py","lonsonho/ts130f.py",
  "neo/__init__.py","neo/nas_pd07.py",
  "lidl/__init__.py","lidl/ts011f.py",
  "blitzwolf/__init__.py","siterwell/__init__.py",
  "giex/__init__.py","saswell/__init__.py",
  "frankever/__init__.py","nous/__init__.py",
  "heiman/__init__.py","heiman/e_sensor.py",
  "ewelink/__init__.py","sonoff/__init__.py",
];
const ALL_FILES = [...TUYA_FILES, ...OTHER_FILES];
const TREE_URL = "https://api.github.com/repos/zigpy/zha-device-handlers/git/trees/dev?recursive=1";
const WANTED_DIRS = new Set(["tuya", ...OTHER_FILES.map((f) => f.split("/")[0])]);
// WHY(P2881, 2026-10-19): 34 of the 55 hard-coded paths are gone upstream (404). Each 404 went through 3 attempts
// with back-off, one file at a time, so the light sync in gmail-diagnostics hit its 150 s timeout every run.
// Now: list the real files once (git tree, one call), never retry a 4xx, fetch a few files in parallel, and stop
// at a deadline with a partial result instead of being killed.
const FILE_TIMEOUT_MS = Number(process.env.ZHA_FILE_TIMEOUT_MS || 15000);
const CONCURRENCY = Math.max(1, Number(process.env.ZHA_CONCURRENCY || 6));
const DEADLINE_MS = Number(process.env.ZHA_DEADLINE_MS || 110000);

async function getText(url, { timeout = FILE_TIMEOUT_MS, retries = 2, headers = {} } = {}) {
  let lastErr;
  for (let n = 1; n <= retries; n++) {
    try {
      const r = await globalThis.fetch(url, { headers: { "user-agent": "TuyaUnifiedSync/1.0", ...headers }, signal: AbortSignal.timeout(timeout) });
      if (r.ok) { return await r.text(); }
      lastErr = new Error(`HTTP ${r.status} for ${url}`);
      if (r.status >= 400 && r.status < 500 && r.status !== 429) { throw Object.assign(lastErr, { permanent: true }); }
    } catch (e) {
      if (e && e.permanent) { throw e; }
      lastErr = e;
    }
    if (n < retries) { await new Promise((res) => setTimeout(res, 1000 * n)); }
  }
  throw lastErr;
}

async function listQuirkFiles() {
  try {
    const tok = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
    const headers = { accept: "application/vnd.github+json" };
    if (tok) { headers.authorization = `Bearer ${tok}`; }
    const tree = JSON.parse(await getText(TREE_URL, { headers, timeout: 20000 }));
    const files = (tree.tree || [])
      .filter((t) => t.type === "blob" && /^zhaquirks\/[^/]+\/.+\.py$/.test(t.path) && WANTED_DIRS.has(t.path.split("/")[1]))
      .map((t) => t.path.slice("zhaquirks/".length));
    if (files.length) { return { files, from: "git-tree" }; }
  } catch (e) { console.log("[ZHA] tree listing failed, using the known list:", e.message); }
  return { files: ALL_FILES, from: "known-list" };
}

async function fetchAll(files, deadlineAt) {
  const out = [];
  let next = 0, fetched = 0, skipped = 0, partial = false;
  async function worker() {
    while (next < files.length) {
      if (Date.now() > deadlineAt) { partial = true; return; }
      const f = files[next++];
      try { out.push(...parseQuirks(await getText(RAW + f), f)); fetched++; } catch (_e) { skipped++; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  return { fps: out, fetched, skipped, partial };
}

function parseQuirks(src, filepath) {
  const fps = [];
  const seen = new Set();
  // P1: MODELS_INFO tuples
  for (const m of src.matchAll(/\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g)) {
    if (TUYA_MFR.test(m[1]) && !seen.has(m[1])) { seen.add(m[1]); fps.push({ mfr: m[1], productId: m[2], file: filepath, source: "zha" }); }
  }
  // P2: manufacturer = / model =
  for (const m of src.matchAll(/manufacturer\s*[:=]\s*["']([^"']+)["']/g)) {
    if (TUYA_MFR.test(m[1]) && !seen.has(m[1])) { seen.add(m[1]); fps.push({ mfr: m[1], productId: null, file: filepath, source: "zha" }); }
  }
  // P3: .applies_to("mfr", "pid")
  for (const m of src.matchAll(/\.applies_to\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g)) {
    if (TUYA_MFR.test(m[1]) && !seen.has(m[1])) { seen.add(m[1]); fps.push({ mfr: m[1], productId: m[2], file: filepath, source: "zha" }); }
  }
  // P4: standalone Tuya mfr strings
  for (const m of src.matchAll(/["'](_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)["']/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); fps.push({ mfr: m[1], productId: null, file: filepath, source: "zha" }); }
  }
  return fps;
}

async function crawlZHA() {
  const startedAt = Date.now();

  // Check cache first
  let cache;
  if (ScannerCache) {
    cache = new ScannerCache(CACHE_ID);
    if (cache.isValid()) {
      console.log(`[ZHA] Cache HIT (${cache.getAge()} old)`);
      const cached = cache.load();
      if (cached) return cached;
    }
  }
  const { files, from } = await listQuirkFiles();
  console.log("[ZHA] Fetching " + files.length + " quirk files (" + from + ", " + CONCURRENCY + " in parallel)...");
  const { fps: allFps, fetched, skipped, partial } = await fetchAll(files, startedAt + DEADLINE_MS);
  console.log("[ZHA] Fetched: " + fetched + ", skipped: " + skipped + (partial ? " (deadline reached, partial)" : ""));
  const seen = new Set();
  const unique = allFps.filter(fp => { const k = fp.mfr.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  fs.mkdirSync(OUT, { recursive: true });
  const result = { date: new Date().toISOString(), source: "zha-device-handlers (raw)", listing: from, partial, filesFetched: fetched, totalRaw: allFps.length, uniqueFingerprints: unique.length, fingerprints: unique };
  fs.writeFileSync(path.join(OUT, "zha.json"), JSON.stringify(result, null, 2));
  console.log("[ZHA] " + unique.length + " unique Tuya fingerprints");

  // Save to cache (a partial crawl is written but never cached, so the next run retries the full set)
  if (cache && !partial) {
    cache.save(result);
    console.log("[ZHA] Cache SAVED");
  }

  return result;
}

module.exports = crawlZHA;
module.exports.parseQuirks = parseQuirks;
module.exports.listQuirkFiles = listQuirkFiles;
module.exports.getText = getText;
module.exports.fetchAll = fetchAll;
if (require.main === module) crawlZHA().catch(e => { console.error("[ZHA] Error:", e.message); process.exit(1); });