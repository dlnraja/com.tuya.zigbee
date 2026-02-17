#!/usr/bin/env node
/**
 * Live Z2M Tuya Fingerprint Crawler
 * Fetches tuya.ts from zigbee-herdsman-converters
 * Handles: tuya.fingerprint(), manufacturerName blocks, tuya.whitelabel()
 * Run: node scripts/sync/crawl-z2m.js
 */
const { fetch } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const URL = "https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts";
const OUT = path.join(__dirname, "data");

function parseZ2M(src) {
  const fps = new Map(); // mfr.lower -> {mfr, productId, model, desc, vendor}
  const lines = src.split("\n");

  // Context tracking for device blocks
  let currentModel = null, currentDesc = null, currentVendor = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track model/desc/vendor context
    const mm = line.match(/^\s+model:\s*['"]([^'"]+)['"]/);
    if (mm) currentModel = mm[1];
    const dm = line.match(/description:\s*['"]([^'"]+)['"]/);
    if (dm) currentDesc = dm[1];
    const vm = line.match(/vendor:\s*['"]([^'"]+)['"]/);
    if (vm) currentVendor = vm[1];

    // Pattern 1: tuya.fingerprint("PID", ["mfr1", "mfr2"])
    const fpMatch = line.match(/tuya\.fingerprint\s*\(\s*['"]([^'"]+)['"]\s*,\s*\[([^\]]+)\]/);
    if (fpMatch) {
      const pid = fpMatch[1];
      const mfrs = [...fpMatch[2].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const mfr of mfrs) {
        const key = mfr.toLowerCase();
        if (!fps.has(key)) fps.set(key, { mfr, productId: pid, model: currentModel, description: currentDesc, vendor: currentVendor, source: "z2m" });
      }
      continue;
    }

    // Pattern 2: manufacturerName: "xxx" inside fingerprint blocks
    const mfrMatch = line.match(/manufacturerName:\s*['"]([^'"]+)['"]/);
    if (mfrMatch) {
      const mfr = mfrMatch[1];
      const modelIdMatch = lines.slice(Math.max(0,i-3), i+3).join(" ").match(/modelID:\s*['"]([^'"]+)['"]/);
      const key = mfr.toLowerCase();
      if (!fps.has(key)) fps.set(key, { mfr, productId: modelIdMatch ? modelIdMatch[1] : null, model: currentModel, description: currentDesc, vendor: currentVendor, source: "z2m" });
      continue;
    }

    // Pattern 3: tuya.whitelabel("Vendor", "Model", "Desc", ["mfr1", "mfr2"])
    const wlMatch = line.match(/tuya\.whitelabel\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*\[([^\]]+)\]/);
    if (wlMatch) {
      const wVendor = wlMatch[1], wModel = wlMatch[2], wDesc = wlMatch[3];
      const mfrs = [...wlMatch[4].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const mfr of mfrs) {
        const key = mfr.toLowerCase();
        if (!fps.has(key)) fps.set(key, { mfr, productId: currentModel, model: wModel, description: wDesc, vendor: wVendor, source: "z2m" });
      }
    }

    // Pattern 4: standalone _TZ/_TZE in array literals like ["_TZ3000_xxx"]
    const arrayMfrs = [...line.matchAll(/['"](_T[A-Z][A-Z0-9]{1,5}_[a-zA-Z0-9]+)['"]/g)];
    for (const m of arrayMfrs) {
      const mfr = m[1];
      const key = mfr.toLowerCase();
      if (!fps.has(key)) fps.set(key, { mfr, productId: null, model: currentModel, description: currentDesc, vendor: currentVendor, source: "z2m" });
    }
  }
  return [...fps.values()];
}

async function crawlZ2M() {
  console.log("[Z2M] Fetching tuya.ts...");
  const src = await fetch(URL);
  console.log("[Z2M] Parsing (" + src.length + " bytes, " + src.split("\n").length + " lines)...");
  const fps = parseZ2M(src);
  fs.mkdirSync(OUT, { recursive: true });
  const result = { date: new Date().toISOString(), source: "zigbee-herdsman-converters/tuya.ts", uniqueFingerprints: fps.length, fingerprints: fps };
  fs.writeFileSync(path.join(OUT, "z2m.json"), JSON.stringify(result, null, 2));
  console.log("[Z2M] " + fps.length + " unique fingerprints extracted");
  return result;
}

module.exports = crawlZ2M;
if (require.main === module) crawlZ2M().catch(e => { console.error("[Z2M] Error:", e.message); process.exit(1); });