#!/usr/bin/env node
/**
 * Cross-Reference: Compare crawled fingerprints against current app drivers
 * Identifies missing fingerprints and suggests target drivers
 * Run: node scripts/sync/cross-reference.js
 */
const { getDriverFingerprints } = require("./lib/drivers");
const { inferDriver } = require("./lib/device-types");
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "data");

function crossReference() {
  console.log("[XREF] Loading current driver fingerprints...");
  const { drivers, mfrSet, pidToDrivers } = getDriverFingerprints();
  const driverCount = Object.keys(drivers).length;
  console.log("[XREF] " + driverCount + " drivers, " + mfrSet.size + " unique mfrs in app");

  // Load crawled data
  const sources = {};
  for (const name of ["z2m", "zha", "blakadder", "deconz"]) {
    const fp = path.join(DATA, name + ".json");
    if (fs.existsSync(fp)) {
      sources[name] = JSON.parse(fs.readFileSync(fp, "utf8"));
      console.log("[XREF] Loaded " + name + ": " + sources[name].uniqueFingerprints + " fps");
    }
  }

  // Find missing fingerprints from each source
  const missing = [];
  const seen = new Set();
  for (const [src, data] of Object.entries(sources)) {
    for (const fp of data.fingerprints) {
      const key = fp.mfr.toLowerCase();
      if (mfrSet.has(key) || seen.has(key)) continue;
      // Skip non-Tuya fingerprints
      if (!fp.mfr.startsWith("_T") && !fp.mfr.startsWith("TUYATEC")) continue;
      seen.add(key);
      const suggestedDriver = inferDriver(fp.productId, fp.mfr, fp.description || "");
      // Check if suggested driver exists in app
      const driverExists = !!drivers[suggestedDriver];
      missing.push({
        mfr: fp.mfr,
        productId: fp.productId || null,
        description: fp.description || null,
        vendor: fp.vendor || null,
        source: src,
        suggestedDriver,
        driverExists,
      });
    }
  }

  // Group by suggested driver
  const byDriver = {};
  for (const fp of missing) {
    if (!byDriver[fp.suggestedDriver]) byDriver[fp.suggestedDriver] = [];
    byDriver[fp.suggestedDriver].push(fp);
  }

  // Generate report
  const report = {
    date: new Date().toISOString(),
    appDrivers: driverCount,
    appMfrs: mfrSet.size,
    sources: Object.fromEntries(Object.entries(sources).map(([k,v]) => [k, v.uniqueFingerprints])),
    totalMissing: missing.length,
    missingByDriver: {},
    actionable: [],
    unmatched: [],
  };

  for (const [drv, fps] of Object.entries(byDriver).sort((a,b) => b[1].length - a[1].length)) {
    report.missingByDriver[drv] = fps.length;
    if (fps[0].driverExists) {
      report.actionable.push(...fps);
    } else {
      report.unmatched.push(...fps);
    }
  }

  // Save reports
  fs.writeFileSync(path.join(DATA, "xref-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(DATA, "xref-actionable.json"), JSON.stringify(report.actionable, null, 2));
  fs.writeFileSync(path.join(DATA, "xref-unmatched.json"), JSON.stringify(report.unmatched, null, 2));

  // Console summary
  console.log("\n=== CROSS-REFERENCE REPORT ===");
  console.log("App: " + driverCount + " drivers, " + mfrSet.size + " mfrs");
  console.log("Missing: " + missing.length + " total");
  console.log("  Actionable (driver exists): " + report.actionable.length);
  console.log("  Unmatched (no driver):      " + report.unmatched.length);
  console.log("\nBy driver:");
  for (const [drv, count] of Object.entries(report.missingByDriver).sort((a,b) => b[1] - a[1])) {
    const exists = drivers[drv] ? "+" : "?"       ;
    console.log("  " + exists + " " + drv + ": " + count);
  }
  if (report.actionable.length > 0) {
    console.log("\nActionable fingerprints:");
    for (const fp of report.actionable) {
      console.log("  " + fp.suggestedDriver + " <- " + fp.mfr + " (" + fp.productId + ") [" + fp.source + "]");
    }
  }
  return report;
}

module.exports = crossReference;
if (require.main === module) crossReference();
