"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REF_DIR = path.join(ROOT, "references");
const BDU_OUT = path.join(REF_DIR, "BDU_v37.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeJSON(p,obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uniq(arr){ return Array.from(new Set(arr)); }
function ensureDir(p){ if(!exists(p)) fs.mkdirSync(p, { recursive: true }); }

function listDriverFolders(){
  if(!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => {
    const dp = path.join(DRIVERS_DIR, d);
    return fs.statSync(dp).isDirectory() && exists(path.join(dp, "driver.compose.json"));
  });
}

function removePlaceholders(mfs){
  if(!Array.isArray(mfs)) return mfs;
  return mfs.filter(x => typeof x === "string" && !/_TZ\d+_x{5,}/i.test(x) && !/_TZ\d+_x{8,}/i.test(x) && !/xxxxx/i.test(x));
}

function hasCap(dcj, cap){ return Array.isArray(dcj.capabilities) && dcj.capabilities.includes(cap); }

function addCluster(clusters, id){
  if (!Array.isArray(clusters)) return [id];
  if (!clusters.includes(id)) clusters.push(id);
  return clusters;
}

function inferTS(dcj, driverName){
  const cls = dcj.class || "";
  const caps = Array.isArray(dcj.capabilities) ? dcj.capabilities : [];
  const current = (dcj.zigbee && Array.isArray(dcj.zigbee.productId)) ? dcj.zigbee.productId : [];
  const needInfer = current.length === 0 || current.some(s => /^TS0001$/i.test(s));
  if(!needInfer) return current;

  if (caps.includes("alarm_co")) return ["TS0601"]; // EF00 DP devices
  if (cls === "sensor" && caps.includes("measure_temperature") && caps.includes("measure_humidity")) return ["TS0201"];
  if (cls === "sensor" && (caps.includes("alarm_motion") || caps.includes("alarm_contact"))) return ["TS0202"];
  if (cls === "socket" && caps.includes("onoff")) return ["TS011F"];
  if (cls === "light") {
    const lightCaps = ["light_hue","light_saturation"]; // RGB
    const hasRGB = caps.some(c => lightCaps.includes(c));
    if (hasRGB) return ["TS0505A"]; // RGB
    if (caps.includes("light_temperature")) return ["TS0502A"]; // CCT
  }
  return current.length ? current : ["TS0201"]; // safe sensor fallback
}

function normalizeDriver(driverFolder){
  const file = path.join(DRIVERS_DIR, driverFolder, "driver.compose.json");
  const dcj = readJSON(file);

  // Clean placeholders
  dcj.zigbee = dcj.zigbee || {};
  dcj.zigbee.manufacturerName = removePlaceholders(dcj.zigbee.manufacturerName || []);

  // Remove non standard capability
  if (Array.isArray(dcj.capabilities)) {
    dcj.capabilities = dcj.capabilities.filter(c => c !== "measure_co");
  }

  // Infer TS if needed
  dcj.zigbee.productId = inferTS(dcj, driverFolder);

  // Ensure endpoints structure
  dcj.zigbee.endpoints = dcj.zigbee.endpoints || {};
  dcj.zigbee.endpoints["1"] = dcj.zigbee.endpoints["1"] || {};
  const ep1 = dcj.zigbee.endpoints["1"];
  ep1.clusters = Array.isArray(ep1.clusters) ? ep1.clusters.slice() : [];
  ep1.bindings = Array.isArray(ep1.bindings) ? ep1.bindings.slice() : [1];

  // Base clusters
  ep1.clusters = addCluster(ep1.clusters, 0);  // Basic
  ep1.clusters = addCluster(ep1.clusters, 1);  // Power
  ep1.clusters = addCluster(ep1.clusters, 3);  // Identify

  // Capability-driven clusters
  if (hasCap(dcj,"measure_temperature")) ep1.clusters = addCluster(ep1.clusters, 1026);
  if (hasCap(dcj,"measure_humidity"))    ep1.clusters = addCluster(ep1.clusters, 1029);
  if (hasCap(dcj,"alarm_motion") || hasCap(dcj,"alarm_contact") || hasCap(dcj,"alarm_co")) ep1.clusters = addCluster(ep1.clusters, 1280);
  if (hasCap(dcj,"onoff"))               ep1.clusters = addCluster(ep1.clusters, 6);
  if (hasCap(dcj,"dim"))                 ep1.clusters = addCluster(ep1.clusters, 8);
  const lightCaps = ["light_hue","light_saturation","light_temperature"];
  const hasAnyLight = Array.isArray(dcj.capabilities) && dcj.capabilities.some(c => lightCaps.includes(c));
  if (hasAnyLight || dcj.class === "light") {
    ep1.clusters = addCluster(ep1.clusters, 768); // colorControl
    ep1.clusters = addCluster(ep1.clusters, 4);   // groups
    ep1.clusters = addCluster(ep1.clusters, 5);   // scenes
  }

  // Window coverings cluster
  if (dcj.class === "window_coverings") {
    ep1.clusters = addCluster(ep1.clusters, 258);
  }

  // TS0601 → EF00 (61184)
  if (dcj.zigbee.productId && dcj.zigbee.productId.includes("TS0601")) {
    ep1.clusters = addCluster(ep1.clusters, 61184);
  }

  // energy.batteries if battery caps present and missing
  if ((hasCap(dcj,"measure_battery") || hasCap(dcj,"alarm_battery"))) {
    dcj.energy = dcj.energy || {};
    if (!Array.isArray(dcj.energy.batteries) || dcj.energy.batteries.length === 0) {
      const isCO = hasCap(dcj,"alarm_co") || /co_detector/i.test(driverFolder);
      dcj.energy.batteries = [isCO ? "PP3" : "CR2032"];
    }
  }

  // Ensure platforms includes local
  dcj.platforms = Array.isArray(dcj.platforms) ? dcj.platforms : [];
  if (!dcj.platforms.includes("local")) dcj.platforms.push("local");

  // Remove thermostat-only options if present erroneously
  if (dcj.capabilitiesOptions) {
    delete dcj.capabilitiesOptions.target_temperature;
    delete dcj.capabilitiesOptions.thermostat_mode;
    if (Object.keys(dcj.capabilitiesOptions).length === 0) delete dcj.capabilitiesOptions;
  }

  // Deduplicate clusters and bindings
  ep1.clusters = uniq(ep1.clusters);
  ep1.bindings = [1];

  writeJSON(file, dcj);
  return dcj;
}

function buildBDU(drivers){
  const bdu = { version: "v37", generatedAt: new Date().toISOString(), entries: [] };
  for (const d of drivers) {
    const file = path.join(DRIVERS_DIR, d, "driver.compose.json");
    const dcj = readJSON(file);
    const manufs = (dcj.zigbee && Array.isArray(dcj.zigbee.manufacturerName)) ? dcj.zigbee.manufacturerName : [];
    const products = (dcj.zigbee && Array.isArray(dcj.zigbee.productId)) ? dcj.zigbee.productId : [];
    const clusters = (dcj.zigbee && dcj.zigbee.endpoints && dcj.zigbee.endpoints["1"] && Array.isArray(dcj.zigbee.endpoints["1"].clusters)) ? dcj.zigbee.endpoints["1"].clusters : [];
    bdu.entries.push({
      driver: d,
      productId: products,
      manufacturerName: manufs,
      endpoints1_clusters: clusters,
      sources: ["local_manifest"],
      score: 3
    });
  }
  ensureDir(REF_DIR);
  writeJSON(BDU_OUT, bdu);
}

(function main(){
  const drivers = listDriverFolders();
  buildBDU(drivers);
  for (const d of drivers) normalizeDriver(d);
  console.log("Orchestrator v37: BDU built and drivers normalized.");
})();
