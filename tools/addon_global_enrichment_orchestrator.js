"use strict";
/**
 * ADDON GLOBAL ENRICHMENT ORCHESTRATOR
 * 
 * Enrichit la base de données avec sources mondiales multilingues:
 * - Zigbee2MQTT (Koenkk)
 * - Blakadder Templates
 * - ZHA Device Handlers
 * - Forums communautaires
 * - Écosystèmes propriétaires (Samsung, Enki, etc.)
 * 
 * Crée des drivers spécifiques si nécessaire pour les écosystèmes identifiés.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = process.cwd();
const REFS = path.join(ROOT, "references");
const ADDON_DATA = path.join(REFS, "addon_enrichment_data");
const REPORT = path.join(ROOT, "project-data", "addon_enrichment_report.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }

// Fetch utility with error handling
function fetchJSON(url){
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'HomeyZigbeeEnrichment/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try{ resolve(JSON.parse(data)); }
        catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}

// Fetch utility for text
function fetchText(url){
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'HomeyZigbeeEnrichment/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// SOURCES CONFIGURATION
const SOURCES = {
  zigbee2mqtt: {
    name: 'Zigbee2MQTT Supported Devices',
    url: 'https://zigbee2mqtt.io/supported-devices.json',
    type: 'json',
    parser: 'z2m'
  },
  blakadder: {
    name: 'Blakadder Zigbee Database',
    url: 'https://zigbee.blakadder.com/assets/all_devices.json',
    type: 'json',
    parser: 'blakadder'
  },
  koenkk_tuya: {
    name: 'Koenkk Tuya Devices (herdsman-converters)',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    type: 'text',
    parser: 'koenkk_ts'
  },
  smartthings_edge: {
    name: 'SmartThings Edge Drivers (community)',
    url: 'https://api.github.com/repos/SmartThingsCommunity/SmartThingsEdgeDrivers/contents/drivers',
    type: 'json',
    parser: 'github_api'
  }
};

// PARSERS

function parseZ2M(data){
  const devices = [];
  if(!Array.isArray(data)) return devices;
  
  for(const dev of data){
    if(!dev.model) continue;
    devices.push({
      manufacturerName: dev.vendor || '',
      productId: dev.model || '',
      description: dev.description || '',
      supports: dev.supports || '',
      source: 'zigbee2mqtt',
      ecosys<br/>tem: detectEcosystem(dev.vendor, dev.model)
    });
  }
  return devices;
}

function parseBlakadder(data){
  const devices = [];
  if(!Array.isArray(data)) return devices;
  
  for(const dev of data){
    devices.push({
      manufacturerName: dev.Manufacturer || '',
      productId: dev.Model || dev.modelId || '',
      description: dev.Name || '',
      type: dev.Type || '',
      source: 'blakadder',
      ecosystem: detectEcosystem(dev.Manufacturer, dev.Model)
    });
  }
  return devices;
}

function parseKoenkkTS(text){
  const devices = [];
  // Parse TypeScript definitions: manufacturerName: ['_TZ...']
  const regex = /manufacturerName:\s*\[(.*?)\]/gs;
  const matches = [...text.matchAll(regex)];
  
  for(const match of matches){
    const names = match[1].split(',').map(n => n.trim().replace(/['"]/g, ''));
    names.forEach(name => {
      if(name && name.startsWith('_TZ')){
        devices.push({
          manufacturerName: name,
          productId: '',
          source: 'koenkk_herdsman',
          ecosystem: 'tuya'
        });
      }
    });
  }
  return devices;
}

function detectEcosystem(vendor, model){
  const v = String(vendor || '').toLowerCase();
  const m = String(model || '').toLowerCase();
  
  if(/tuya|_tz|ts\d{4}/.test(v + m)) return 'tuya';
  if(/samsung|smartthings/.test(v)) return 'samsung_smartthings';
  if(/enki|leroy.?merlin/.test(v)) return 'enki_leroy_merlin';
  if(/xiaomi|aqara/.test(v)) return 'xiaomi_aqara';
  if(/philips|hue|signify/.test(v)) return 'philips_hue';
  if(/ikea|tradfri/.test(v)) return 'ikea_tradfri';
  if(/sonoff|ewelink/.test(v)) return 'sonoff_ewelink';
  if(/ledvance|osram/.test(v)) return 'ledvance';
  if(/schneider|wiser/.test(v)) return 'schneider_wiser';
  if(/legrand|netatmo/.test(v)) return 'legrand_netatmo';
  
  return 'generic';
}

// MAIN ORCHESTRATOR
async function main(){
  ed(ADDON_DATA);
  ed(path.join(ROOT, "project-data"));
  
  console.log("\n🌍 ADDON GLOBAL ENRICHMENT - Sources Mondiales\n");
  
  const report = {
    timestamp: new Date().toISOString(),
    sources: {},
    totals: {
      devices: 0,
      manufacturers: new Set(),
      productIds: new Set(),
      ecosystems: {}
    },
    errors: []
  };
  
  // Fetch all sources
  for(const [key, config] of Object.entries(SOURCES)){
    console.log(`📡 Fetching: ${config.name}...`);
    
    try{
      const data = config.type === 'json' 
        ? await fetchJSON(config.url)
        : await fetchText(config.url);
      
      let devices = [];
      
      switch(config.parser){
        case 'z2m': devices = parseZ2M(data); break;
        case 'blakadder': devices = parseBlakadder(data); break;
        case 'koenkk_ts': devices = parseKoenkkTS(data); break;
        default: break;
      }
      
      // Store raw data
      const outFile = path.join(ADDON_DATA, `${key}_${Date.now()}.json`);
      wj(outFile, { source: config.name, url: config.url, devices, fetchedAt: new Date().toISOString() });
      
      // Update report
      report.sources[key] = {
        name: config.name,
        devicesCount: devices.length,
        file: outFile
      };
      
      // Aggregate
      devices.forEach(dev => {
        report.totals.devices++;
        if(dev.manufacturerName) report.totals.manufacturers.add(dev.manufacturerName);
        if(dev.productId) report.totals.productIds.add(dev.productId);
        if(dev.ecosystem){
          report.totals.ecosystems[dev.ecosystem] = (report.totals.ecosystems[dev.ecosystem] || 0) + 1;
        }
      });
      
      console.log(`   ✅ ${devices.length} devices fetched`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch(e){
      console.log(`   ❌ Error: ${e.message}`);
      report.errors.push({ source: key, error: e.message });
    }
  }
  
  // Convert sets to arrays
  report.totals.manufacturers = Array.from(report.totals.manufacturers);
  report.totals.productIds = Array.from(report.totals.productIds);
  
  wj(REPORT, report);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total devices: ${report.totals.devices}`);
  console.log(`   Unique manufacturers: ${report.totals.manufacturers.length}`);
  console.log(`   Unique product IDs: ${report.totals.productIds.length}`);
  console.log(`   Ecosystems detected: ${Object.keys(report.totals.ecosystems).length}`);
  console.log(`\n📝 Report: ${REPORT}`);
  console.log(`\n🎯 Next Steps:`);
  console.log(`   1. node tools/integrate_addon_sources.js`);
  console.log(`   2. node tools/generate_ecosystem_drivers.js`);
  console.log(`   3. node tools/ultimate_coherence_checker_with_all_refs.js`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
