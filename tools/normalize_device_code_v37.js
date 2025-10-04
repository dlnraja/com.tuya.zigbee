"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }

function listDriverFolders(){
  if(!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => {
    const dp = path.join(DRIVERS_DIR, d);
    return fs.statSync(dp).isDirectory() && exists(path.join(dp, "device.js"));
  });
}

function normalizeDeviceJS(driverFolder){
  const file = path.join(DRIVERS_DIR, driverFolder, "device.js");
  let src = fs.readFileSync(file, "utf8");

  // Only target simple generic pattern: forEach over caps with CLUSTER_TUYA_SPECIFIC
  const genericPattern = /const\s+caps\s*=\s*this\.getCapabilities\(\);[\s\S]*?caps\.forEach\(cap\s*=>\s*\{[\s\S]*?this\.registerCapability\(cap,\s*['"]CLUSTER_TUYA_SPECIFIC['"]\);[\s\S]*?\}\);/m;
  if (!genericPattern.test(src)) return false;

  // Ensure enableDebug/printNode present
  if (!/this\.enableDebug\(\);/m.test(src)) {
    src = src.replace(/async\s+onNodeInit\(\)\s*\{/, match => `${match}\n    this.enableDebug();`);
  }
  if (!/this\.printNode\(\);/m.test(src)) {
    src = src.replace(/this\.enableDebug\(\);[\s\S]*?\n/, m => m + `    this.printNode();\n`);
  }

  // Replace the generic loop with explicit numeric registrations
  const replacement = `// Register capabilities with numeric Zigbee clusters\n    if (this.hasCapability('onoff')) {\n      this.registerCapability('onoff', 6);\n    }\n    if (this.hasCapability('dim')) {\n      this.registerCapability('dim', 8);\n    }\n    if (this.hasCapability('light_hue')) {\n      this.registerCapability('light_hue', 768);\n    }\n    if (this.hasCapability('light_saturation')) {\n      this.registerCapability('light_saturation', 768);\n    }\n    if (this.hasCapability('light_temperature')) {\n      this.registerCapability('light_temperature', 768);\n    }\n    if (this.hasCapability('measure_temperature')) {\n      this.registerCapability('measure_temperature', 1026);\n    }\n    if (this.hasCapability('measure_humidity')) {\n      this.registerCapability('measure_humidity', 1029);\n    }\n    if (this.hasCapability('alarm_motion')) {\n      this.registerCapability('alarm_motion', 1280);\n    }\n    if (this.hasCapability('alarm_contact')) {\n      this.registerCapability('alarm_contact', 1280);\n    }\n    if (this.hasCapability('alarm_co')) {\n      this.registerCapability('alarm_co', 1280);\n    }\n    if (this.hasCapability('measure_battery')) {\n      this.registerCapability('measure_battery', 1);\n    }\n    if (this.hasCapability('alarm_battery')) {\n      this.registerCapability('alarm_battery', 1);\n    }`;

  src = src.replace(genericPattern, replacement);

  fs.writeFileSync(file, src, "utf8");
  return true;
}

(function main(){
  const drivers = listDriverFolders();
  let changed = 0;
  for (const d of drivers) {
    try {
      const ok = normalizeDeviceJS(d);
      if (ok) {
        changed++;
        console.log(`Updated device.js in ${d}`);
      }
    } catch (e) {
      console.error(`Failed to normalize ${d}:`, e.message);
    }
  }
  console.log(`normalize_device_code_v37: updated ${changed} device.js files`);
})();
