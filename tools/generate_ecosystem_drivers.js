"use strict";
/**
 * GENERATE ECOSYSTEM DRIVERS
 * 
 * Crée des drivers spécifiques pour les écosystèmes détectés:
 * - Samsung SmartThings
 * - Enki by Leroy Merlin
 * - Xiaomi/Aqara
 * - Philips Hue
 * - IKEA TRÅDFRI
 * - Sonoff/eWeLink
 * - Schneider Wiser
 * - Legrand Netatmo
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const ADDON_DATA = path.join(ROOT, "references", "addon_enrichment_data");
const REPORT = path.join(ROOT, "project-data", "ecosystem_drivers_report.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }

// Load addon data
function loadAddonData(){
  const ecosystemDevices = new Map(); // ecosystem -> [devices]
  
  if(!ex(ADDON_DATA)) return ecosystemDevices;
  
  const files = fs.readdirSync(ADDON_DATA).filter(f => f.endsWith('.json'));
  
  for(const file of files){
    try{
      const data = dj(path.join(ADDON_DATA, file));
      if(data.devices && Array.isArray(data.devices)){
        for(const dev of data.devices){
          const eco = dev.ecosystem || 'generic';
          if(!ecosystemDevices.has(eco)) ecosystemDevices.set(eco, []);
          ecosystemDevices.get(eco).push(dev);
        }
      }
    } catch{}
  }
  
  return ecosystemDevices;
}

// Ecosystem configurations
const ECOSYSTEMS = {
  samsung_smartthings: {
    name: 'Samsung SmartThings',
    prefix: 'smartthings',
    class: 'other',
    icon: '⚡'
  },
  enki_leroy_merlin: {
    name: 'Enki by Leroy Merlin',
    prefix: 'enki',
    class: 'other',
    icon: '🛠️'
  },
  xiaomi_aqara: {
    name: 'Xiaomi Aqara',
    prefix: 'aqara',
    class: 'sensor',
    icon: '🏠'
  },
  philips_hue: {
    name: 'Philips Hue',
    prefix: 'hue',
    class: 'light',
    icon: '💡'
  },
  ikea_tradfri: {
    name: 'IKEA TRÅDFRI',
    prefix: 'ikea',
    class: 'light',
    icon: '🪑'
  },
  sonoff_ewelink: {
    name: 'Sonoff eWeLink',
    prefix: 'sonoff',
    class: 'socket',
    icon: '🔌'
  },
  schneider_wiser: {
    name: 'Schneider Electric Wiser',
    prefix: 'schneider',
    class: 'thermostat',
    icon: '🌡️'
  },
  legrand_netatmo: {
    name: 'Legrand Netatmo',
    prefix: 'legrand',
    class: 'socket',
    icon: '🔵'
  }
};

// Create driver template
function createDriverTemplate(eco, config, devices){
  const manufacturerNames = uj(devices.map(d => d.manufacturerName).filter(Boolean));
  const productIds = uj(devices.map(d => d.productId).filter(Boolean));
  
  return {
    name: {
      en: `${config.name} Device`
    },
    class: config.class,
    capabilities: ["onoff"],
    zigbee: {
      manufacturerName: manufacturerNames.slice(0, 30),
      productId: productIds.slice(0, 10),
      endpoints: {
        "1": {
          clusters: [0, 3, 4, 5, 6],
          bindings: [1]
        }
      }
    },
    images: {
      small: `/drivers/${eco}_generic/assets/small.png`,
      large: `/drivers/${eco}_generic/assets/large.png`
    },
    platforms: ["local"],
    connectivity: ["zigbee"],
    community: {
      ecosystem: config.name,
      source: "addon_global_enrichment",
      auto_generated: true,
      generated_at: new Date().toISOString()
    }
  };
}

// Create driver assets
function createDriverAssets(driverPath){
  const assetsPath = path.join(driverPath, 'assets');
  ed(assetsPath);
  
  // Placeholder images (will need to be replaced with real ones)
  const placeholder = {
    note: "Replace with actual device images",
    size_small: "75x75px",
    size_large: "500x350px"
  };
  
  wj(path.join(assetsPath, 'README.json'), placeholder);
}

(function main(){
  console.log("\n🏢 Generating Ecosystem-Specific Drivers\n");
  
  const ecosystemDevices = loadAddonData();
  console.log(`   Found ${ecosystemDevices.size} ecosystems in addon data\n`);
  
  const report = {
    timestamp: new Date().toISOString(),
    driversCreated: 0,
    ecosystems: []
  };
  
  for(const [eco, devices] of ecosystemDevices.entries()){
    if(eco === 'generic' || eco === 'tuya') continue; // Skip generic and tuya (already handled)
    if(!ECOSYSTEMS[eco]) continue; // Only create for configured ecosystems
    
    const config = ECOSYSTEMS[eco];
    const driverFolder = `${eco}_generic`;
    const driverPath = path.join(DRIVERS, driverFolder);
    
    // Check if driver already exists
    if(ex(path.join(driverPath, 'driver.compose.json'))){
      console.log(`✓  ${config.icon} ${config.name}: driver already exists`);
      continue;
    }
    
    // Create driver directory
    ed(driverPath);
    
    // Create driver.compose.json
    const driverManifest = createDriverTemplate(eco, config, devices);
    wj(path.join(driverPath, 'driver.compose.json'), driverManifest);
    
    // Create assets directory
    createDriverAssets(driverPath);
    
    // Create device.js stub
    const deviceJS = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${config.name.replace(/\\s+/g, '')}Device extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('${config.name} device initialized');
    
    // Register onoff capability
    this.registerCapability('onoff', 'genOnOff');
    
    // Add ecosystem-specific logic here
  }
  
}

module.exports = ${config.name.replace(/\\s+/g, '')}Device;
`;
    
    fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJS, 'utf8');
    
    report.driversCreated++;
    report.ecosystems.push({
      ecosystem: eco,
      name: config.name,
      devices: devices.length,
      manufacturerNames: uj(devices.map(d => d.manufacturerName).filter(Boolean)).length
    });
    
    console.log(`✅ ${config.icon} ${config.name}: created with ${devices.length} devices`);
  }
  
  wj(REPORT, report);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Ecosystem drivers created: ${report.driversCreated}`);
  console.log(`\n📝 Report: ${REPORT}`);
  console.log(`\n⚠️  Next Steps:`);
  console.log(`   1. Add real device images to each driver's assets/`);
  console.log(`   2. Implement ecosystem-specific capabilities in device.js`);
  console.log(`   3. Run: node tools/verify_driver_assets_v38.js`);
  console.log(`   4. Run: node tools/homey_validate.js`);
})();
