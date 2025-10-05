"use strict";
const fs = require("fs");
const path = require("path");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
const ROOT = process.cwd();
const target = arg("--path");
const idsStr = arg("--ids", "");
if (!target || !idsStr){
  console.error("Usage: node tools/add_product_ids.js --path ./drivers/<driver> --ids TS110E,TS0601");
  process.exit(2);
}
const ids = idsStr.split(/[\s,]+/).filter(Boolean).map(s => s.toUpperCase());
const comp = path.join(ROOT, target, 'driver.compose.json');
try{
  const j = JSON.parse(fs.readFileSync(comp, 'utf8'));
  j.zigbee = j.zigbee || {};
  j.zigbee.productId = Array.isArray(j.zigbee.productId) ? j.zigbee.productId : [];
  for (const id of ids){ if (!j.zigbee.productId.includes(id)) j.zigbee.productId.push(id); }
  j.zigbee.productId = Array.from(new Set(j.zigbee.productId));
  fs.writeFileSync(comp, JSON.stringify(j, null, 2)+"\n", 'utf8');
  console.log(JSON.stringify({ target: path.basename(target), productId: j.zigbee.productId }, null, 2));
} catch(e){
  console.error("add_product_ids failed:", e.message);
  process.exit(1);
}
