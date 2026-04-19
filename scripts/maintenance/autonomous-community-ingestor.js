#!/usr/bin/env node
'use strict';

/**
 * 
 *   AUTONOMOUS COMMUNITY INGESTOR v1.0                                        
 *   Ingests 2,140+ fingerprints from community-intel.json                      
 * 
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INTEL_FILE = path.join(ROOT, 'data', 'community-intel.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const TYPE_MAPPING = {
  'christmas_lights': 'led_strip',
  'curtain_module': 'curtain_motor',
  'curtain_module_2_gang': 'curtain_motor',
  'curtain_motor': 'curtain_motor',
  'dimmable_led_strip': 'led_controller_dimmable',
  'dimmable_recessed_led': 'bulb_dimmable',
  'dimmer_1_gang': 'dimmer_wall_1gang',
  'dimmer_1_gang_tuya': 'dimmer_wall_1gang',
  'dimmer_2_gang': 'dimmer_dual_channel',
  'dimmer_2_gang_tuya': 'dimmer_dual_channel',
  'doorwindowsensor': 'contact_sensor',
  'fingerbot': 'fingerbot',
  'motion_sensor': 'motion_sensor',
  'plug': 'plug_smart',
  'switch_1_gang': 'switch_1gang',
  'switch_2_gang': 'switch_2gang',
  'switch_3_gang': 'switch_3gang',
  'switch_4_gang': 'switch_4gang',
  'temp_humidity_sensor': 'lcdtemphumidsensor'
};

async function injectFingerprint(driverId, mfr, pid) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return false;

  try {
    const raw = fs.readFileSync(composePath, 'utf8');
    const compose = JSON.parse(raw);
    if (!compose.zigbee) compose.zigbee = {};
    if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
    if (!compose.zigbee.productId) compose.zigbee.productId = [];

    const mset = new Set(compose.zigbee.manufacturerName.map(m => m.toLowerCase()));
    let changed = false;

    if (!mset.has(mfr.toLowerCase())) {
      compose.zigbee.manufacturerName.push(mfr);
      changed = true;
    }
    
    if (pid && !compose.zigbee.productId.includes(pid)) {
      if (!compose.zigbee.productId.map(p => p.toLowerCase()).includes(pid.toLowerCase())) {
         compose.zigbee.productId.push(pid);
         changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      return true;
    }
  } catch (e) {
    console.error(`  [ERR] Failed to inject into ${driverId}:`, e.message);
  }
  return false;
}

async function main() {
  if (!fs.existsSync(INTEL_FILE)) {
    console.error(' community-intel.json not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
  let count = 0;

  for (const issue of data.issues || []) {
    const body = issue.body || '';
    // Optimized Matcher for Markdown Tables
    const rowRegex = /\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/g;
    let match;

    while ((match = rowRegex.exec(body)) !== null) {
      const mfr = match[1].trim();
      const pidsRaw = match[2].trim();
      if (pidsRaw.includes('Manufacturer ID')) continue; // Header guard

      const pids = pidsRaw.split(',').map(p => p.trim()).filter(p => p && p !== '-');
      const type = match[3].trim().toLowerCase();

      const driverId = TYPE_MAPPING[type];
      if (driverId) {
        if (pids.length === 0) {
           if (await injectFingerprint(driverId, mfr, null)) count++;
        } else {
          for (const pid of pids) {
            if (await injectFingerprint(driverId, mfr, pid)) {
              count++;
            }
          }
        }
        if (count > 0 && count % 50 === 0) console.log(`  Processed ${count} fingerprints...`);
      }
    }
  }

  console.log(` Ingested ${count} new fingerprints into manifests.`);
}

main().catch(console.error);
