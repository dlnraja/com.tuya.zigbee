#!/usr/bin/env node
/**
 * Live ZHA FULL Quirks Crawler
 * Scans ALL quirks directories (not just tuya/) for Tuya fingerprints
 * Run: node scripts/sync/crawl-zha.js
 */
const { fetch, fetchJSON } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks";
const RAW_BASE = "https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/";
const OUT = path.join(__dirname, "data");

const TUYA_MFR = /(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)/;

function parseQuirksFile(src, filepath) {
  const fps = [];
  // P1: MODELS_INFO tuples ("mfr", "pid")
  const tuples = [...src.matchAll(/\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g)];
  for (const m of tuples) {
    if (TUYA_MFR.test(m[1])) fps.push({ mfr: m[1], productId: m[2], file: filepath, source: "zha" });
  }
  // P2: manufacturer = / model =
  const mfrLines = [...src.matchAll(/manufacturer\s*[:=]\s*["']([^"']+)["']/g)];
  for (const m of mfrLines) {
    if (TUYA_MFR.test(m[1]) && !fps.find(f => f.mfr === m[1])) {
      fps.push({ mfr: m[1], productId: null, file: filepath, source: "zha" });
    }
  }
  // P3: .applies_to("mfr", "pid")
  const applies = [...src.matchAll(/\.applies_to\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g)];
  for (const m of applies) {
    if (TUYA_MFR.test(m[1])) fps.push({ mfr: m[1], productId: m[2], file: filepath, source: "zha" });
  }
  // P4: standalone Tuya mfr strings
  const standalone = [...src.matchAll(/["'](_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)["']/g)];
  for (const m of standalone) {
    if (!fps.find(f => f.mfr === m[1])) fps.push({ mfr: m[1], productId: null, file: filepath, source: "zha" });
  }
  return fps;
}

async function listAllPyFiles() {
  console.log("[ZHA] Listing ALL quirk directories...");
  let topDirs;
  try {
    topDirs = await fetchJSON(API_BASE + "?ref=dev");
  } catch (e) {
    console.log("[ZHA] API failed:", e.message);
    return [];
  }
  const dirs = topDirs.filter(f => f.type === "dir");
  const pyFiles = [];
  // Also get top-level .py files
  pyFiles.push(...topDirs.filter(f => f.name.endsWith(".py") && f.name !== "__init__.py"));
  console.log("[ZHA] " + dirs.length + " subdirectories to scan...");
  for (const dir of dirs) {
    try {
      const contents = await fetchJSON(dir.url + "?ref=dev");
      const pys = contents.filter(f => f.name.endsWith(".py") && f.name !== "__init__.py");
      for (const p of pys) { p._dir = dir.name; }
      pyFiles.push(...pys);
    } catch (e) { /* skip */ }
  }
  return pyFiles;
}

async function crawlZHA() {
  const pyFiles = await listAllPyFiles();
  console.log("[ZHA] " + pyFiles.length + " quirk files to scan");
  const allFps = [];
  let fetched = 0;
  for (let i = 0; i < pyFiles.length; i += 5) {
    const batch = pyFiles.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(async f => {
      const dirPart = f._dir ? (f._dir + "/") : "";
      const url = f.download_url || (RAW_BASE + dirPart + f.name);
      const src = await fetch(url);
      return parseQuirksFile(src, dirPart + f.name);
    }));
    for (const r of results) {
      if (r.status === "fulfilled") { allFps.push(...r.value); fetched++; }
    }
    if ((i + 5) % 50 === 0 || i + 5 >= pyFiles.length) {
      console.log("[ZHA]   " + Math.min(i+5, pyFiles.length) + "/" + pyFiles.length + " files...");
    }
  }
  // Dedupe
  const seen = new Set();
  const unique = allFps.filter(fp => {
    const k = fp.mfr.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  fs.mkdirSync(OUT, { recursive: true });
  const result = { date: new Date().toISOString(), source: "zha-device-handlers (ALL dirs)", filesFetched: fetched, totalRaw: allFps.length, uniqueFingerprints: unique.length, fingerprints: unique };
  fs.writeFileSync(path.join(OUT, "zha.json"), JSON.stringify(result, null, 2));
  console.log("[ZHA] " + fetched + " files, " + unique.length + " unique Tuya fingerprints");
  return result;
}

module.exports = crawlZHA;
if (require.main === module) crawlZHA().catch(e => { console.error("[ZHA] Error:", e.message); process.exit(1); });