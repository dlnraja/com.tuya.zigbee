#!/usr/bin/env node
/**
 * Live Z2M FULL Zigbee Fingerprint Crawler
 * Scans ALL 366 device files in zigbee-herdsman-converters
 * Extracts every Tuya fingerprint (_TZ*, _TZE*, _TYST11*, TUYATEC*)
 * Run: node scripts/sync/crawl-z2m.js
 */
const { fetch, fetchJSON } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const API = "https://api.github.com/repos/Koenkk/zigbee-herdsman-converters/contents/src/devices";
const RAW = "https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/";
const OUT = path.join(__dirname, "data");

const TUYA_MFR = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/;

function parseFile(src, filename) {
  const fps = new Map();
  const lines = src.split("\n");
  let model = null, desc = null, vendor = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mm = line.match(/^\s+model:\s*['"]([^'"]+)['"]/);
    if (mm) model = mm[1];
    const dm = line.match(/description:\s*['"]([^'"]+)['"]/);
    if (dm) desc = dm[1];
    const vm = line.match(/vendor:\s*['"]([^'"]+)['"]/);
    if (vm) vendor = vm[1];

    // P1: tuya.fingerprint("PID", ["mfr1", ...])
    const fp1 = line.match(/tuya\.fingerprint\s*\(\s*['"]([^'"]+)['"]\s*,\s*\[([^\]]+)\]/);
    if (fp1) {
      const pid = fp1[1];
      const mfrs = [...fp1[2].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const mfr of mfrs) {
        if (TUYA_MFR.test(mfr)) {
          const k = mfr.toLowerCase();
          if (!fps.has(k)) fps.set(k, { mfr, productId: pid, model, description: desc, vendor, file: filename, source: "z2m" });
        }
      }
      continue;
    }

    // P2: manufacturerName: "xxx" in fingerprint blocks
    const fp2 = line.match(/manufacturerName:\s*['"]([^'"]+)['"]/);
    if (fp2 && TUYA_MFR.test(fp2[1])) {
      const mfr = fp2[1];
      const ctx = lines.slice(Math.max(0,i-3), i+3).join(" ");
      const pidM = ctx.match(/modelID:\s*['"]([^'"]+)['"]/);
      const k = mfr.toLowerCase();
      if (!fps.has(k)) fps.set(k, { mfr, productId: pidM?pidM[1]:null, model, description: desc, vendor, file: filename, source: "z2m" });
      continue;
    }

    // P3: tuya.whitelabel("V","M","D",["mfr",...])
    const fp3 = line.match(/tuya\.whitelabel\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*\[([^\]]+)\]/);
    if (fp3) {
      const mfrs = [...fp3[4].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const mfr of mfrs) {
        if (TUYA_MFR.test(mfr)) {
          const k = mfr.toLowerCase();
          if (!fps.has(k)) fps.set(k, { mfr, productId: model, model: fp3[2], description: fp3[3], vendor: fp3[1], file: filename, source: "z2m" });
        }
      }
      continue;
    }

    // P4: zigbeeModel: ["xxx"] or fingerprint with Tuya mfr
    const allMfrs = [...line.matchAll(/['"](_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]+)['"]/g)];
    for (const m of allMfrs) {
      const k = m[1].toLowerCase();
      if (!fps.has(k)) fps.set(k, { mfr: m[1], productId: null, model, description: desc, vendor, file: filename, source: "z2m" });
    }
  }
  return fps;
}

async function crawlZ2M() {
  console.log("[Z2M] Listing ALL device files...");
  let fileList;
  try {
    fileList = await fetchJSON(API);
  } catch (e) {
    console.log("[Z2M] API failed, falling back to tuya.ts only");
    fileList = [{ name: "tuya.ts", download_url: RAW + "tuya.ts" }];
  }
  const tsFiles = fileList.filter(f => f.name.endsWith(".ts") && f.name !== "index.ts");
  console.log("[Z2M] " + tsFiles.length + " device files to scan");

  const allFps = new Map();
  let scanned = 0, errors = 0;
  // Process in batches of 5
  for (let i = 0; i < tsFiles.length; i += 5) {
    const batch = tsFiles.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(async f => {
      const url = f.download_url || (RAW + f.name);
      const src = await fetch(url);
      return { name: f.name, fps: parseFile(src, f.name) };
    }));
    for (const r of results) {
      if (r.status === "fulfilled") {
        scanned++;
        for (const [k, v] of r.value.fps) {
          if (!allFps.has(k)) allFps.set(k, v);
        }
      } else { errors++; }
    }
    if ((i + 5) % 50 === 0 || i + 5 >= tsFiles.length) {
      console.log("[Z2M]   " + Math.min(i+5, tsFiles.length) + "/" + tsFiles.length + " files, " + allFps.size + " fps so far");
    }
  }

  const fps = [...allFps.values()];
  fs.mkdirSync(OUT, { recursive: true });
  const result = { date: new Date().toISOString(), source: "zigbee-herdsman-converters (ALL files)", filesScanned: scanned, errors, uniqueFingerprints: fps.length, fingerprints: fps };
  fs.writeFileSync(path.join(OUT, "z2m.json"), JSON.stringify(result, null, 2));
  console.log("[Z2M] " + scanned + " files scanned, " + fps.length + " unique Tuya fingerprints");
  return result;
}

module.exports = crawlZ2M;
if (require.main === module) crawlZ2M().catch(e => { console.error("[Z2M] Error:", e.message); process.exit(1); });