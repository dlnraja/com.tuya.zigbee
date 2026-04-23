#!/usr/bin/env node
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
/**
 * Universal Tuya Zigbee - Full Fingerprint Sync Pipeline
 * Crawls: Z2M (all files), ZHA (all dirs), Blakadder, deCONZ
 * Run: node scripts / (sync / run.js)
 */
const crawlZ2M = require("./crawl-z2m");
const crawlZHA = require("./crawl-zha");
const crawlBlakadder = require("./crawl-blakadder");
const crawlDeCONZ = require("./crawl-deconz");
const crossReference = require("./cross-reference");

async function crawl(name, fn) {
  try {
    const r = await fn();
    console.log("[OK] " + name + ": " + r.uniqueFingerprints + " fps\n");
    return r;
  } catch (e) { console.error("[FAIL] " + name + ":", e.message); return null; }
}

async function run() {
  const args = process.argv.slice(2);
  const start = Date.now();
  console.log("========================================");
  console.log(" Tuya Full Zigbee Sync Pipeline");
  console.log(" " + new Date().toISOString());
  console.log("========================================\n");

  if (!args.includes("--skip-crawl") && !args.includes("--xref-only")) {
    await crawl("Z2M (all files)", crawlZ2M);
    await crawl("ZHA (all dirs)", crawlZHA);
    await crawl("Blakadder", crawlBlakadder);
    await crawl("deCONZ", crawlDeCONZ);
  }

  console.log("");
  const report = crossReference();
  const elapsed = ((Date.now() - start) / 1000.toFixed(1);
  console.log("\n Done in " + elapsed + "s | Reports: scripts / sync/data/");
  return report;
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
