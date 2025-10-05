"use strict";
const fs = require("fs");
const path = require("path");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
const ROOT = process.cwd();
const target = arg("--path");
const addClustersStr = arg("--add_clusters", "");
if (!target || !addClustersStr){
  console.error("Usage: node tools/configure_zigbee.js --path ./drivers/<driver> --add_clusters 8,61184");
  process.exit(2);
}
const addClusters = addClustersStr.split(/[\s,]+/).filter(Boolean).map(n=>Number(n)).filter(n=>Number.isFinite(n));
const comp = path.join(ROOT, target, 'driver.compose.json');
try{
  const j = JSON.parse(fs.readFileSync(comp, 'utf8'));
  j.zigbee = j.zigbee || {};
  j.zigbee.endpoints = j.zigbee.endpoints || {};
  const ep1 = j.zigbee.endpoints["1"] = j.zigbee.endpoints["1"] || {};
  ep1.clusters = Array.isArray(ep1.clusters) ? ep1.clusters : [];
  for (const c of addClusters){ if (!ep1.clusters.includes(c)) ep1.clusters.push(c); }
  ep1.clusters = Array.from(new Set(ep1.clusters)).sort((a,b)=>a-b);
  ep1.bindings = Array.isArray(ep1.bindings) ? ep1.bindings : [];
  if (!ep1.bindings.includes(1)) ep1.bindings.push(1);
  fs.writeFileSync(comp, JSON.stringify(j, null, 2)+"\n", 'utf8');
  console.log(JSON.stringify({ target: path.basename(target), clusters: ep1.clusters, bindings: ep1.bindings }, null, 2));
} catch(e){
  console.error("configure_zigbee failed:", e.message);
  process.exit(1);
}
