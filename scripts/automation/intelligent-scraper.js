'use strict';

/**
 * INTELLIGENT TUYA SCRAPER v2.0
 * 
 * This script performs deep analysis of zigbee-herdsman-converters
 * to extract fingerprints, DP mappings, and device descriptions.
 * 
 * It aligns the Homey App with the global community's state-of-the-art
 * Tuya intelligence.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const Z2M_TUYA_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
const OUTPUT_FILE = path.join(__dirname, '../../data/z2m-enriched-definitions.json');

async function scrape() {
  console.log('Starting Intelligent Scrape of Z2M Tuya definitions...');
  
  try {
    const response = await axios.get(Z2M_TUYA_URL);
    const content = response.data;
    
    const results = {
      updatedAt: new Date().toISOString(),
      devices: []
    };

    // Regex for definitions block
    // We look for objects with fingerprint, model, vendor
    // This is a simplified parser for a massive TS file
    const deviceBlocks = content.split('    {');
    
    console.log(`Analyzing ${deviceBlocks.length} potential device blocks...`);

    for (const block of deviceBlocks) {
      if (!block.includes('fingerprint:')) continue;

      const device = {};
      
      // Extract Model
      const modelMatch = block.match(/model:\s*"([^"]+)"/);
      if (modelMatch) device.model = modelMatch[1];

      // Extract Vendor
      const vendorMatch = block.match(/vendor:\s*"([^"]+)"/);
      if (vendorMatch) device.vendor = vendorMatch[1];

      // Extract Fingerprints
      device.fingerprints = [];
      
      // Case 1: tuya.fingerprint("TS0601", ["_TZE200_xxx", "_TZE200_yyy"])
      const tuyaFpMatch = block.match(/tuya\.fingerprint\("([^"]+)",\s*\[([^\]]+)\]\)/);
      if (tuyaFpMatch) {
        const modelID = tuyaFpMatch[1];
        const mfrNames = tuyaFpMatch[2].split(',').map(s => s.trim().replace(/"/g, ''));
        mfrNames.forEach(mfr => {
          device.fingerprints.push({ modelID, manufacturerName: mfr });
        });
      }

      // Case 2: [{modelID: "...", manufacturerName: "..."}]
      const rawFpMatch = block.matchAll(/modelID:\s*"([^"]+)",\s*manufacturerName:\s*"([^"]+)"/g);
      for (const m of rawFpMatch) {
        device.fingerprints.push({ modelID: m[1], manufacturerName: m[2] });
      }

      if (device.fingerprints.length === 0) continue;

      // Extract DP Mappings
      device.datapoints = [];
      const dpBlockMatch = block.match(/tuyaDatapoints:\s*\[([\s\S]+?)\]/);
      if (dpBlockMatch) {
        const dpLines = dpBlockMatch[1].split('\n');
        for (const line of dpLines) {
          // Pattern: [dp, name, converter]
          const dpMatch = line.match(/\[(\d+),\s*"([^"]+)"/);
          if (dpMatch) {
            device.datapoints.push({
              dp: parseInt(dpMatch[1]),
              name: dpMatch[2]
            });
          }
        }
      }

      results.devices.push(device);
    }

    console.log(`Successfully scraped ${results.devices.length} devices.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    
    // Proactive DB updates
    syncLocalDB(results.devices);

  } catch (err) {
    console.error('Scrape failed:', err.message);
  }
}

function syncLocalDB(scrapedDevices) {
  const fpPath = path.join(__dirname, '../../lib/tuya-dp-engine/fingerprints.json');
  if (!fs.existsSync(fpPath)) return;

  try {
    const db = JSON.parse(fs.readFileSync(fpPath, 'utf8'));
    let newCount = 0;

    for (const device of scrapedDevices) {
      for (const fp of device.fingerprints) {
        if (!db.fingerprints[fp.manufacturerName]) {
          db.fingerprints[fp.manufacturerName] = {
            manufacturer: device.vendor || 'Tuya',
            model: device.model || fp.modelID,
            profile: inferProfile(device),
            category: 'auto-discovered',
            verified: false,
            notes: `Auto-synced from Z2M (${new Date().toLocaleDateString()})`
          };
          newCount++;
        }
      }
    }

    fs.writeFileSync(fpPath, JSON.stringify(db, null, 2));
    console.log(`Database updated: ${newCount} new fingerprints added.`);
  } catch (err) {
    console.error('Local DB sync failed:', err.message);
  }
}

function inferProfile(device) {
  // Simple heuristic based on DP names
  const dpNames = device.datapoints.map(d => d.name);
  if (dpNames.includes('state') && dpNames.includes('power')) return 'smart-plug-energy';
  if (dpNames.includes('occupancy')) return 'presence-sensor';
  if (dpNames.includes('temperature') && dpNames.includes('humidity')) return 'temperature-humidity';
  if (dpNames.includes('smoke')) return 'smoke-sensor';
  return 'generic-tuya';
}

scrape();
