"use strict";
const fs = require("fs");
const path = require("path");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
const ROOT = process.cwd();
const id = arg("--id");
const target = arg("--target");
if (!id || !target){
  console.error("Usage: node tools/inject_id_to_target.js --id <manufacturerName> --target ./drivers/<driver>");
  process.exit(2);
}
const comp = path.join(ROOT, target, 'driver.compose.json');
try{
  const j = JSON.parse(fs.readFileSync(comp, 'utf8'));
  j.zigbee = j.zigbee || {};
  j.zigbee.manufacturerName = Array.isArray(j.zigbee.manufacturerName) ? j.zigbee.manufacturerName : [];
  if (!j.zigbee.manufacturerName.includes(id)) j.zigbee.manufacturerName.push(id);
  j.zigbee.manufacturerName = Array.from(new Set(j.zigbee.manufacturerName)).sort((a,b)=>a.localeCompare(b));
  fs.writeFileSync(comp, JSON.stringify(j, null, 2)+"\n", 'utf8');
  console.log(JSON.stringify({ target: path.basename(target), added: id }, null, 2));
} catch(e){
  console.error("inject_id_to_target failed:", e.message);
  process.exit(1);
}
