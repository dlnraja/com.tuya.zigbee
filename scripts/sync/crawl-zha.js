#!/usr/bin/env node
/**
 * ZHA Full Quirks Crawler - bypasses GitHub API rate limits
 * Uses raw.githubusercontent.com + known directory index
 * Run: node scripts/sync/crawl-zha.js
 */
const { fetch } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

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
  console.log("[ZHA] Fetching " + ALL_FILES.length + " known quirk files (raw URLs)...");
  const allFps = [];
  let fetched = 0, skipped = 0;
  for (const f of ALL_FILES) {
    try {
      const src = await fetch(RAW + f);
      const fps = parseQuirks(src, f);
      allFps.push(...fps);
      fetched++;
    } catch (e) { skipped++; }
  }
  console.log("[ZHA] Fetched: " + fetched + ", skipped: " + skipped);
  const seen = new Set();
  const unique = allFps.filter(fp => { const k = fp.mfr.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  fs.mkdirSync(OUT, { recursive: true });
  const result = { date: new Date().toISOString(), source: "zha-device-handlers (raw)", filesFetched: fetched, totalRaw: allFps.length, uniqueFingerprints: unique.length, fingerprints: unique };
  fs.writeFileSync(path.join(OUT, "zha.json"), JSON.stringify(result, null, 2));
  console.log("[ZHA] " + unique.length + " unique Tuya fingerprints");
  return result;
}

module.exports = crawlZHA;
if (require.main === module) crawlZHA().catch(e => { console.error("[ZHA] Error:", e.message); process.exit(1); });
