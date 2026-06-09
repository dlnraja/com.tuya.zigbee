#!/usr/bin/env node
/**
 * Blakadder Zigbee Device Database Crawler
 * Fetches zigbee.blakadder.com/all.json — comprehensive Zigbee DB
 * Extracts all Tuya fingerprints with rich metadata
 * Run: node scripts/sync/crawl-blakadder.js
 */
const { fetchJSON } = require("./lib/fetch");
const fs = require("fs");
const path = require("path");

const URL = "https://zigbee.blakadder.com/all.json";
const OUT = path.join(__dirname, "data");

const TUYA_MFR = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/;

async function crawlBlakadder() {
  console.log("[BLAKADDER] Fetching all.json...");
  const data = await fetchJSON(URL);
  // data is array of device objects or object keyed by model
  const devices = Array.isArray(data) ? data : Object.values(data);
  console.log("[BLAKADDER] " + devices.length + " total devices in DB");

  const fps = new Map();
  for (const dev of devices) {
    // Blakadder fields: manufacturerName, modelID, manufacturer, model, description, category
    const mfr = dev.manufacturerName || dev.zigbeeManufacturer || dev.tuya_id || null;
    const pid = dev.modelID || dev.zigbeeModel || null;
    if (!mfr || !TUYA_MFR.test(mfr)) continue;
    const k = mfr.toLowerCase();
    if (fps.has(k)) continue;
    fps.set(k, {
      mfr,
      productId: pid,
      model: dev.model || dev.name || null,
      description: dev.description || dev.category || null,
      vendor: dev.manufacturer || dev.brand || null,
      category: dev.category || null,
      z2m: dev.z2m === true || dev.z2m === "true",
      zha: dev.zha === true || dev.zha === "true",
      deconz: dev.deconz === true || dev.deconz === "true",
      source: "blakadder",
    });
  }

  const result = {
    date: new Date().toISOString(),
    source: "zigbee.blakadder.com/all.json",
    totalDevices: devices.length,
    uniqueFingerprints: fps.size,
    fingerprints: [...fps.values()],
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "blakadder.json"), JSON.stringify(result, null, 2));
  console.log("[BLAKADDER] " + fps.size + " unique Tuya fingerprints");
  return result;
}

module.exports = crawlBlakadder;
if (require.main === module) crawlBlakadder().catch(e => { console.error("[BLAKADDER] Error:", e.message); process.exit(1); });