#!/usr/bin/env node
/**
 * Live ZHA Tuya Quirks Crawler
 * Fetches ALL Tuya quirk files from zhaquirks/tuya/ on GitHub
 * Extracts manufacturerName fingerprints from class-based quirks
 * Run: node scripts/sync/crawl-zha.js
 */
const { fetch, fetchJSON } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const API = "https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks/tuya";
const RAW = "https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/";
const OUT = path.join(__dirname, "data");

// Parse Python quirks file for manufacturer fingerprints
function parseQuirksFile(src, filename) {
  const fps = [];
  // Pattern 1: MODELS_INFO = [("mfr", "pid"), ...]
  const modelsInfo = [...src.matchAll(/\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g)];
  for (const m of modelsInfo) {
    const mfr = m[1], pid = m[2];
    if (mfr.startsWith("_T") || mfr.startsWith("TUYATEC")) {
      fps.push({ mfr, productId: pid, file: filename, source: "zha" });
    }
  }
  // Pattern 2: manufacturer = "xxx" / model = "xxx"
  const mfrLines = [...src.matchAll(/manufacturer\s*[:=]\s*["']([^"']+)["']/g)];
  const modelLines = [...src.matchAll(/model\s*[:=]\s*["']([^"']+)["']/g)];
  for (const m of mfrLines) {
    if (m[1].startsWith("_T") || m[1].startsWith("TUYATEC")) {
      const existing = fps.find(f => f.mfr === m[1]);
      if (!existing) fps.push({ mfr: m[1], productId: null, file: filename, source: "zha" });
    }
  }
  // Pattern 3: QuirkBuilder style .applies_to("mfr", "pid")
  const applies = [...src.matchAll(/\.applies_to\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g)];
  for (const m of applies) {
    if (m[1].startsWith("_T") || m[1].startsWith("TUYATEC")) {
      fps.push({ mfr: m[1], productId: m[2], file: filename, source: "zha" });
    }
  }
  return fps;
}

async function crawlZHA() {
  console.log("[ZHA] Listing quirk files...");
  let files;
  try {
    files = await fetchJSON(API + "?ref=dev");
  } catch (e) {
    // Fallback: fetch known files list
    console.log("[ZHA] API failed, using known file list...");
    files = [];
  }
  const pyFiles = files.filter(f => f.name.endsWith(".py") && f.name !== "__init__.py");
  // Also check subdirectories
  const dirs = files.filter(f => f.type === "dir");
  for (const dir of dirs) {
    try {
      const subFiles = await fetchJSON(dir.url + "?ref=dev");
      pyFiles.push(...subFiles.filter(f => f.name.endsWith(".py") && f.name !== "__init__.py"));
    } catch (e) { /* skip */ }
  }
  console.log("[ZHA] Found " + pyFiles.length + " quirk files, fetching...");
  const allFps = [];
  let fetched = 0;
  for (const f of pyFiles) {
    try {
      const rawUrl = f.download_url || (RAW + f.name);
      const src = await fetch(rawUrl);
      const fps = parseQuirksFile(src, f.name);
      allFps.push(...fps);
      fetched++;
      if (fetched % 10 === 0) console.log("[ZHA]   " + fetched + "/" + pyFiles.length + " files...");
    } catch (e) { console.log("[ZHA]   Skip " + f.name + ": " + e.message); }
  }
  // Dedupe by mfr (lowercase)
  const seen = new Set();
  const unique = allFps.filter(fp => {
    const key = fp.mfr.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  fs.mkdirSync(OUT, { recursive: true });
  const result = {
    date: new Date().toISOString(),
    source: "zha-device-handlers/zhaquirks/tuya",
    filesFetched: fetched,
    totalRaw: allFps.length,
    uniqueFingerprints: unique.length,
    fingerprints: unique,
  };
  fs.writeFileSync(path.join(OUT, "zha.json"), JSON.stringify(result, null, 2));
  console.log("[ZHA] " + fetched + " files, " + unique.length + " unique fingerprints");
  return result;
}

module.exports = crawlZHA;
if (require.main === module) crawlZHA().catch(e => { console.error("[ZHA] Error:", e.message); process.exit(1); });