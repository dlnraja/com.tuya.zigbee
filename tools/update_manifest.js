"use strict";
const fs = require("fs");
const path = require("path");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
const ROOT = process.cwd();
const target = arg("--path");
const addCap = arg("--add_cap");
if (!target || !addCap){
  console.error("Usage: node tools/update_manifest.js --path ./drivers/<driver> --add_cap <capability>");
  process.exit(2);
}
const comp = path.join(ROOT, target, 'driver.compose.json');
try{
  const j = JSON.parse(fs.readFileSync(comp, 'utf8'));
  j.capabilities = Array.isArray(j.capabilities) ? j.capabilities : [];
  if (!j.capabilities.includes(addCap)) j.capabilities.push(addCap);
  fs.writeFileSync(comp, JSON.stringify(j, null, 2)+"\n", 'utf8');
  console.log(JSON.stringify({ target: path.basename(target), addedCapability: addCap }, null, 2));
} catch(e){
  console.error("update_manifest failed:", e.message);
  process.exit(1);
}
