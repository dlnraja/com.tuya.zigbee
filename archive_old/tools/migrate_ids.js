"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){
  const i = process.argv.indexOf(name);
  if (i >= 0 && i+1 < process.argv.length) return process.argv[i+1];
  return def;
}
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function uniq(a){ return Array.from(new Set(a)); }

const ROOT = process.cwd();
const srcRel = arg("--source");
const outRel = arg("--output", path.join("project-data","migration_temp_V38.txt"));

if (!srcRel){
  console.error("Usage: node tools/migrate_ids.js --source ./drivers/<driver> [--output project-data/migration_temp_V38.txt]");
  process.exit(2);
}

const srcDir = path.resolve(ROOT, srcRel);
const composeFile = path.join(srcDir, 'driver.compose.json');
const outFile = path.resolve(ROOT, outRel);

function driverCategory(folder, cls){
  const f = folder.toLowerCase();
  if (cls === 'light' || /bulb|strip|spot|ceiling|rgb|tunable|dimmer/.test(f)) return 'lighting';
  if (cls === 'socket' || /plug|outlet|socket/.test(f)) return 'plugs';
  if (/curtain|roller|shade/.test(f)) return 'curtains';
  if (/door_window|contact/.test(f)) return 'contact';
  if (/motion|pir|presence|radar/.test(f)) return 'motion';
  if (cls === 'sensor' || /climate|temperature|humidity|air|tvoc|co2|pm25/.test(f)) return 'climate';
  if (/switch|relay/.test(f)) return 'switches';
  if (/smoke|co_detector|gas|water_leak/.test(f)) return 'safety';
  if (/lock|fingerprint/.test(f)) return 'locks';
  return 'other';
}

// Heuristic mapping hints
const HINTS = {
  lighting: new Set(["_TZ3000_ji4araar","_TZ3000_qzjcsmar","_TZ3000_fllyghyj"]),
  plugs: new Set(["_TZ3000_g5xawfcq","_TZ3000_cehuw1lw"]),
  climate: new Set(["_TZE200_cwbvmsar","_TZE200_bjawzodf"]),
  curtains: new Set(["_TZE200_fctwhugx","_TZE200_cowvfni3"]),
  motion: new Set(["_TZ3000_mmtwjmaq","_TZ3000_kmh5qpmb","_TZE200_3towulqd"]),
  contact: new Set(["_TZ3000_26fmupbb","_TZ3000_n2egfsli"]) 
};
const ALL = new Map(); for (const [c, s] of Object.entries(HINTS)) for (const v of s) ALL.set(v, c);

try{
  const j = readJSON(composeFile);
  const folder = path.basename(srcDir);
  const cls = j.class || '';
  const expectedCat = driverCategory(folder, cls);
  const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName.slice() : [];

  const keep = [];
  const moved = [];
  for (const id of names){
    const hint = ALL.get(id) || null;
    if (hint && hint !== expectedCat){
      moved.push(id);
    } else {
      keep.push(id);
    }
  }

  // Update manifest
  if (!j.zigbee) j.zigbee = {};
  j.zigbee.manufacturerName = uniq(keep).sort((a,b)=>a.localeCompare(b));
  fs.writeFileSync(composeFile, JSON.stringify(j, null, 2)+"\n", "utf8");

  // Append migration records
  if (moved.length){
    const prefix = moved.map(id => `${id}::UNKNOWN::${folder}`).join("\n") + "\n";
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.appendFileSync(outFile, prefix, "utf8");
  }
  console.log(JSON.stringify({ source: folder, expectedCat, removed: moved.length, kept: keep.length, output: outRel }, null, 2));
} catch(e){
  console.error("migrate_ids failed:", e.message);
  process.exit(1);
}
