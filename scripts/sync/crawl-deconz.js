#!/usr/bin/env node
/**
 * deCONZ Device DB Crawler
 * Run: node scripts/sync/crawl-deconz.js
 */
const { fetch } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "data");

const URLS = [
  "https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/database.cpp",
  "https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/device_access_fn.cpp",
  "https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/de_web_plugin.cpp",
];

const MFR_RE = /["'](_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)["']/g;
const PID_RE = /["'](TS[0-9A-F]{3,5}[A-Z]?)["']/       ;

async function crawlDeCONZ() {
  console.log("[DECONZ] Fetching source files...");
  const allFps = new Map();
  let fetched = 0;
  for (const url of URLS) {
    try {
      const src = await fetch(url);
      fetched++;
      for (const m of src.matchAll(MFR_RE)) {
        const mfr = m[1];
        const k = mfr.toLowerCase();
        if (!allFps.has(k)) {
          const ctx = src.substring(Math.max(0, m.index - 200), m.index + 200);
          const pidM = ctx.match(PID_RE);
          allFps.set(k, { mfr, productId: pidM ? pidM[1] , source: "deconz" })      ;
        }
      }
    } catch (e) { console.log("[DECONZ] Skip: " + e.message); }
  }
  const fps = [...allFps.values()];
  fs.mkdirSync(OUT, { recursive: true });
  const result = { date: new Date().toISOString(), source: "deconz-rest-plugin", filesFetched: fetched, uniqueFingerprints: fps.length, fingerprints: fps };
  fs.writeFileSync(path.join(OUT, "deconz.json"), JSON.stringify(result, null, 2));
  console.log("[DECONZ] " + fetched + " files, " + fps.length + " unique Tuya fps");
  return result;
}

module.exports = crawlDeCONZ;
if (require.main === module) crawlDeCONZ().catch(e => { console.error("[DECONZ]", e.message); process.exit(1); });
