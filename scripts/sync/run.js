#!/usr/bin/env node
/**
 * Universal Tuya Zigbee - Fingerprint Sync Pipeline
 * Master orchestrator: crawl all sources, cross-reference, report
 * Run: node scripts/sync/run.js
 * Options: --z2m-only  --zha-only  --xref-only  --skip-crawl
 */
const crawlZ2M = require("./crawl-z2m");
const crawlZHA = require("./crawl-zha");
const crawlBlakadder = require("./crawl-blakadder");
const crawlDeCONZ = require("./crawl-deconz");
const crossReference = require("./cross-reference");

async function run() {
  const args = process.argv.slice(2);
  const start = Date.now();
  console.log("========================================");
  console.log(" Tuya Fingerprint Sync Pipeline");
  console.log(" " + new Date().toISOString());
  console.log("========================================\n");

  const skipCrawl = args.includes("--skip-crawl");
  const z2mOnly = args.includes("--z2m-only");
  const zhaOnly = args.includes("--zha-only");
  const xrefOnly = args.includes("--xref-only");

  if (!skipCrawl && !xrefOnly) {
    // Crawl Z2M
    if (!zhaOnly) {
      try {
        const z2m = await crawlZ2M();
        console.log("[OK] Z2M: " + z2m.uniqueFingerprints + " fingerprints\n");
      } catch (e) {
        console.error("[FAIL] Z2M:", e.message);
      }
    }

    // Crawl ZHA
    if (!z2mOnly) {
      try {
        const zha = await crawlZHA();
        console.log("[OK] ZHA: " + zha.uniqueFingerprints + " fingerprints\n");
      } catch (e) {
        console.error("[FAIL] ZHA:", e.message);
      }
    }
  }

  // Cross-reference
  console.log("");
  const report = crossReference();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("\n========================================");
  console.log(" Done in " + elapsed + "s");
  console.log(" Reports saved to scripts/sync/data/");
  console.log("========================================");
  return report;
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });