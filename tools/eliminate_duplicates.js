"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function uniq(a){ return Array.from(new Set(a)); }
function asNum(x){ const n = Number(x); return Number.isFinite(n) ? n : x; }

const ROOT = process.cwd();
const targetPath = arg("--path");
if (!targetPath){
  console.error("Usage: node tools/eliminate_duplicates.js --path ./drivers/<driver>");
  process.exit(2);
}
const driverDir = path.resolve(ROOT, targetPath);
const composeFile = path.join(driverDir, 'driver.compose.json');

try{
  const j = readJSON(composeFile);
  const before = JSON.stringify(j);
  if (j.zigbee){
    if (Array.isArray(j.zigbee.productId)) j.zigbee.productId = uniq(j.zigbee.productId.map(String));
    if (Array.isArray(j.zigbee.manufacturerName)) j.zigbee.manufacturerName = uniq(j.zigbee.manufacturerName.map(String)).sort((a,b)=>a.localeCompare(b));
    if (j.zigbee.endpoints && typeof j.zigbee.endpoints === 'object'){
      for (const ep of Object.keys(j.zigbee.endpoints)){
        const e = j.zigbee.endpoints[ep] || {};
        if (Array.isArray(e.clusters)){
          e.clusters = uniq(e.clusters.map(asNum)).filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a,b)=>a-b);
        }
        if (Array.isArray(e.bindings)){
          e.bindings = uniq(e.bindings.map(asNum)).filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a,b)=>a-b);
        }
        j.zigbee.endpoints[ep] = e;
      }
    }
  }
  const after = JSON.stringify(j);
  const changed = before !== after;
  if (changed) fs.writeFileSync(composeFile, JSON.stringify(j, null, 2)+"\n", "utf8");
  console.log(JSON.stringify({ driver: path.basename(driverDir), changed }, null, 2));
} catch(e){
  console.error("eliminate_duplicates failed:", e.message);
  process.exit(1);
}
