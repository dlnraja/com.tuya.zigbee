"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
const ROOT = process.cwd();
const reportPath = path.join(ROOT, "project-data", "asset_size_report_v38.json");
const driverPath = arg("--path");
if (!driverPath){
  console.error("Usage: node tools/check_assets_compliance.js --path ./drivers/<driver>");
  process.exit(2);
}
const driver = path.basename(driverPath);
try {
  execSync("node tools/verify_driver_assets_v38.js", { stdio: "inherit", shell: true });
} catch {}
try {
  const json = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const entry = (json.drivers||[]).find(d => d.folder === driver);
  if (!entry) { console.log(JSON.stringify({ driver, found:false }, null, 2)); process.exit(0); }
  console.log(JSON.stringify({ driver, small: entry.small, large: entry.large, needsFix: entry.needsFix }, null, 2));
} catch (e){
  console.error("check_assets_compliance failed:", e.message);
  process.exit(1);
}
