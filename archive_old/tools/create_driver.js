"use strict";
/**
 * create_driver.js
 *
 * Create a new driver skeleton under drivers/ with Homey SDK3 structure.
 *
 * Usage:
 *   node tools/create_driver.js --name "zigbee_special_repeater" --class "other"
 *   node tools/create_driver.js --name "enki_device_bridge" --class "sensor"
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");

function ex(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }

function argvToMap(){
  const m = new Map();
  for(const arg of process.argv.slice(2)){
    if(arg.startsWith("--")){
      const [k, vRaw] = arg.split("=");
      m.set(k.replace(/^--/, ''), vRaw ?? true);
    }
  }
  return m;
}

function makeDriverCompose(name, cls){
  return {
    name: { en: name.replace(/_/g, ' ') },
    class: cls || "other",
    capabilities: ["onoff"],
    zigbee: {
      manufacturerName: [],
      productId: [],
      endpoints: {
        "1": {
          clusters: [0,3,4,5,6],
          bindings: [1]
        }
      }
    },
    images: {
      small: `/drivers/${name}/assets/small.png`,
      large: `/drivers/${name}/assets/large.png`
    },
    platforms: ["local"],
    connectivity: ["zigbee"],
    community: {
      source: "create_driver.js",
      created_at: new Date().toISOString()
    }
  };
}

(function main(){
  const args = argvToMap();
  const name = String(args.get("name") || "").trim();
  const cls = String(args.get("class") || "other").trim();
  if(!name){
    console.error("--name is required");
    process.exit(1);
  }

  const driverPath = path.join(DRIVERS_DIR, name);
  const composePath = path.join(driverPath, "driver.compose.json");
  const devicePath = path.join(driverPath, "device.js");
  const assetsPath = path.join(driverPath, "assets");

  if(ex(composePath)){
    console.log(`Driver already exists: ${composePath}`);
    process.exit(0);
  }

  ed(driverPath);
  ed(assetsPath);

  const compose = makeDriverCompose(name, cls);
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2)+"\n", "utf8");

  const className = (name.replace(/[^a-zA-Z0-9]/g,'') || 'New') + 'Device';
  const deviceJS = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('${name} initialized');
    try {
      this.registerCapability('onoff', 'genOnOff');
    } catch(e) {
      this.error('Capability registration failed', e);
    }
  }
}

module.exports = ${className};
`;
  fs.writeFileSync(devicePath, deviceJS, 'utf8');

  const placeholder = {
    note: "Replace with actual images",
    small: "75x75px",
    large: "500x350px"
  };
  fs.writeFileSync(path.join(assetsPath, 'README.json'), JSON.stringify(placeholder, null, 2)+"\n", 'utf8');

  console.log(`✅ Driver created: ${driverPath}`);
  console.log(`   - driver.compose.json`);
  console.log(`   - device.js`);
  console.log(`   - assets/README.json`);
})();
