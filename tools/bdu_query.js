"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){
  const i = process.argv.indexOf(name);
  if (i >= 0 && i+1 < process.argv.length) return process.argv[i+1];
  return def;
}

const ROOT = process.cwd();
const BDU_V38 = path.join(ROOT, "references", "BDU_v38.json");
const BDU_V38_N4 = path.join(ROOT, "references", "BDU_v38_n4.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }

const targetRaw = arg("--target", "Dimmer");
const target = (targetRaw||'').toLowerCase();
const pathOpt = arg("--path");
const listOpt = arg("--list");

function loadIDs(){
  if (pathOpt){
    const comp = path.join(ROOT, pathOpt, 'driver.compose.json');
    const j = readJSON(comp);
    return (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
  }
  if (listOpt){
    return listOpt.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

// Heuristic hints from memories
const HINTS = {
  lighting: new Set(["_TZ3000_ji4araar","_TZ3000_qzjcsmar","_TZ3000_fllyghyj"]),
  plugs: new Set(["_TZ3000_g5xawfcq","_TZ3000_cehuw1lw"]),
  climate: new Set(["_TZE200_cwbvmsar","_TZE200_bjawzodf"]),
  curtains: new Set(["_TZE200_fctwhugx","_TZE200_cowvfni3"]),
  motion: new Set(["_TZ3000_mmtwjmaq","_TZ3000_kmh5qpmb","_TZE200_3towulqd"]),
  contact: new Set(["_TZ3000_26fmupbb","_TZ3000_n2egfsli"]) 
};
const ALL = new Map(); for (const [c, s] of Object.entries(HINTS)) for (const v of s) ALL.set(v, c);

const ids = loadIDs();
const out = [];
for (const id of ids){
  const cat = ALL.get(id) || null;
  const score = cat ? 0.9 : 0.1; // crude confidence
  out.push({ id, predictedCategory: cat, score, targetMatch: (cat === target ? 1 : 0) });
}

let bdu = exists(BDU_V38_N4) ? readJSON(BDU_V38_N4) : (exists(BDU_V38) ? readJSON(BDU_V38) : null);
const overrides = (bdu && Array.isArray(bdu.overrides)) ? bdu.overrides : [];
const n4 = bdu && bdu.version && /n4/i.test(bdu.version) ? (bdu.n4||{}) : null;

console.log(JSON.stringify({ target, count: ids.length, results: out, overridesCount: overrides.length, usingN4: !!n4, n4_unverified: !!(n4 && n4.unverified) }, null, 2));
