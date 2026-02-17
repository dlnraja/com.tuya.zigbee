#!/usr/bin/env node
/**
 * deCONZ Device Database Crawler
 * Fetches device definitions from dresden-elektronik/deconz-rest-plugin
 * Extracts Tuya fingerprints from JSON device descriptions
 * Run: node scripts/sync/crawl-deconz.js
 */
const { fetch, fetchJSON } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const API = "https://api.github.com/repos/dresden-elektronik/deconz-rest-plugin/contents/devices/tuya";
const RAW = "https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices/";
const OUT = path.join(__dirname, "data");

const TUYA_MFR = /(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)/;

function parseDeviceFile(src, filename) {
  const fps = [];
  try {
    const json = JSON.parse(src);
    // deCONZ JSON format: { "schema":"devcap1.schema.json", "manufacturername":"xxx", "modelid":"yyy", ... }
    const mfr = json.manufacturername || null;
    const pid = json.modelid || null;
    const product = json.product || null;
    const vendor = json.vendor || null;
    if (mfr && TUYA_MFR.test(mfr)) {
      fps.push({ mfr, productId: pid, model: product, description: product, vendor, file: filename, source: "deconz" });
    }
    // Also check subdevices array
    if (json.subdevices) {
      for (const sd of json.subdevices) {
        const sdMfr = sd.manufacturername || mfr;
        const sdPid = sd.modelid || pid;
        if (sdMfr && TUYA_MFR.test(sdMfr) && !fps.find(f => f.mfr === sdMfr)) {
          fps.push({ mfr: sdMfr, productId: sdPid, model: product, description: product, vendor, file: filename, source: "deconz" });
        }
      }
    }
  } catch (e) {
    // Not JSON — try regex on raw text
    const mfrs = [...src.matchAll(/["'](_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)["']/g)];
    for (const m of mfrs) {
      if (!fps.find(f => f.mfr === m[1])) fps.push({ mfr: m[1], productId: null, file: filename, source: "deconz" });
    }
  }
  return fps;
}

async function crawlDeCONZ() {
  console.log("[DECONZ] Listing device files...");
  let files = [];
  // Scan tuya/ directory
  try {
    const tuyaFiles = await fetchJSON(API + "?ref=master");
    files.push(...tuyaFiles.filter(f => f.name.endsWith(".json")));
    console.log("[DECONZ] Found " + files.length + " Tuya device files");
  } catch (e) {
    console.log("[DECONZ] Tuya dir:", e.message);
  }
  // Also check generic dirs that might have Tuya
  for (const dir of ["generic", "xiaomi", "ikea"]) {
    try {
      const dirUrl = API.replace("/tuya", "/" + dir);
      const dirFiles = await fetchJSON(dirUrl + "?ref=master");
      files.push(...dirFiles.filter(f => f.name.endsWith(".json")));
    } catch (e) { /* skip */ }
  }

  console.log("[DECONZ] " + files.length + " total JSON files to scan");
  const allFps = [];
  let fetched = 0;
  for (const f of files) {
    try {
      const url = f.download_url || (RAW + "tuya/" + f.name);
      const src = await fetch(url);
      const fps = parseDeviceFile(src, f.name);
      allFps.push(...fps);
      fetched++;
    } catch (e) { /* skip */ }
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
  const result = { date: new Date().toISOString(), source: "deconz-rest-plugin", filesFetched: fetched, uniqueFingerprints: unique.length, fingerprints: unique };
  fs.writeFileSync(path.join(OUT, "deconz.json"), JSON.stringify(result, null, 2));
  console.log("[DECONZ] " + fetched + " files, " + unique.length + " unique Tuya fingerprints");
  return result;
}

module.exports = crawlDeCONZ;
if (require.main === module) crawlDeCONZ().catch(e => { console.error("[DECONZ] Error:", e.message); process.exit(1); });