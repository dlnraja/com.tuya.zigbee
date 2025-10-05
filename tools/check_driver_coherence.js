"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){
  const i = process.argv.indexOf(name);
  if (i >= 0 && i+1 < process.argv.length) return process.argv[i+1];
  return def;
}

const rel = arg("--path");
if (!rel){
  console.error("Usage: node tools/check_driver_coherence.js --path ./drivers/<driver>");
  process.exit(2);
}
const ROOT = process.cwd();
const driverDir = path.resolve(ROOT, rel);
const composeFile = path.join(driverDir, "driver.compose.json");

try {
  const j = JSON.parse(fs.readFileSync(composeFile, "utf8"));
  const report = { driver: path.basename(driverDir), ok: true, notes: [] };
  // class/capabilities sanity
  const cls = j.class;
  const caps = Array.isArray(j.capabilities) ? j.capabilities : [];
  if (cls === 'light'){
    if (!(caps.includes('onoff') && caps.includes('dim'))){
      report.ok = false; report.notes.push('Expected onoff+dim for light dimmer');
    }
  }
  // productId
  const pids = (j.zigbee && Array.isArray(j.zigbee.productId)) ? j.zigbee.productId : [];
  const hasTS0601 = pids.includes('TS0601');
  const hasTS110E = pids.includes('TS110E');
  if (!hasTS0601 && !hasTS110E){
    report.ok = false; report.notes.push('Expected TS0601 or TS110E in productId');
  }
  // clusters
  const ep1 = j.zigbee && j.zigbee.endpoints && j.zigbee.endpoints["1"] || {};
  const clusters = Array.isArray(ep1.clusters) ? ep1.clusters : [];
  if (!clusters.includes(6) || !clusters.includes(8)){
    report.ok = false; report.notes.push('Missing cluster 6 and/or 8 for dimmer');
  }
  if (hasTS0601 && !clusters.includes(61184)){
    report.ok = false; report.notes.push('TS0601 should include EF00 (61184)');
  }
  console.log(JSON.stringify(report, null, 2));
} catch (e){
  console.error("Failed:", e.message);
  process.exit(1);
}
