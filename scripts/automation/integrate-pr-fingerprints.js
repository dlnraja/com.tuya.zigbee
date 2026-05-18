#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../../.github/state/pr-issue-scan.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

if (!fs.existsSync(STATE_FILE)) {
  console.error(`State file not found at ${STATE_FILE}`);
  process.exit(1);
}

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function inferDriverFromTitle(title, mfrName) {
  const t = title.toLowerCase();
  const m = mfrName.toLowerCase();

  // Radar/Presence detection
  if (t.includes('radar') || t.includes('presence') || t.includes('10g') || t.includes('human')) {
    return 'presence_sensor_radar';
  }
  // Standard Motion/PIR
  if (t.includes('motion') || t.includes('pir') || t.includes('lux') || t.includes('sensor 2') || t.includes('occupancy')) {
    return 'motion_sensor';
  }
  // Climate: Temperature & Humidity
  if (t.includes('temp') || t.includes('humid') || t.includes('climate') || t.includes('weather') || t.includes('lcd')) {
    return 'climate_sensor';
  }
  // Water/Flood Leak
  if (t.includes('water') || t.includes('leak') || t.includes('flood') || t.includes('rain')) {
    return 'water_leak_sensor';
  }
  // Smoke detectors
  if (t.includes('smoke') || t.includes('co') || t.includes('gas') || t.includes('fire')) {
    return 'smoke_detector_advanced';
  }
  // Curtains/Covers/Blinds
  if (t.includes('curtain') || t.includes('blind') || t.includes('cover') || t.includes('shade') || t.includes('motor')) {
    return 'curtain_motor';
  }
  // Radiator Valves / TRVs
  if (t.includes('trv') || t.includes('valve') || t.includes('radiator') || t.includes('thermostat') || t.includes('heating')) {
    return 'radiator_valve';
  }
  // SOS Buttons / Emergency
  if (t.includes('sos') || t.includes('emergency')) {
    return 'button_emergency_sos';
  }
  // Plugs / Outlets
  if (t.includes('plug') || t.includes('socket') || t.includes('outlet') || t.includes('strip')) {
    return 'plug_energy_monitor';
  }
  // Dimmers
  if (t.includes('dimmer') || t.includes('dim')) {
    return 'dimmer_wall_1gang';
  }
  // Multi-gang button controllers / switches
  if (t.includes('button') || t.includes('knob') || t.includes('scene')) {
    if (t.includes('1 gang') || t.includes('1gang') || t.includes('1 button')) return 'button_wireless';
    if (t.includes('2 gang') || t.includes('2gang') || t.includes('2 button')) return 'button_wireless_2';
    if (t.includes('3 gang') || t.includes('3gang') || t.includes('3 button')) return 'button_wireless_3';
    if (t.includes('4 gang') || t.includes('4gang') || t.includes('4 button')) return 'button_wireless_4';
    if (t.includes('6 gang') || t.includes('6gang') || t.includes('6 button')) return 'button_wireless_6';
    if (t.includes('8 gang') || t.includes('8gang') || t.includes('8 button')) return 'button_wireless_8';
    return 'button_wireless';
  }
  // Multi-gang Relays / Wall Switches
  if (t.includes('switch') || t.includes('relay')) {
    if (t.includes('1 gang') || t.includes('1gang') || t.includes('1way')) return 'switch_1gang';
    if (t.includes('2 gang') || t.includes('2gang') || t.includes('2way')) return 'switch_2gang';
    if (t.includes('3 gang') || t.includes('3gang') || t.includes('3way')) return 'switch_3gang';
    if (t.includes('4 gang') || t.includes('4gang') || t.includes('4way')) return 'switch_4gang';
    return 'switch_1gang';
  }

  // Fallback heuristics based on mfrName prefix (Tuya type codes)
  if (mfrName.startsWith('_TZE200_')) return 'generic_diy'; // TS0601 custom DPs are generic
  if (mfrName.startsWith('_TZE204_')) return 'generic_diy';
  if (mfrName.startsWith('_TZ3000_')) {
    // Standard ZCL switch or button
    return 'switch_1gang';
  }

  return 'generic_diy';
}

function patchDriver(driverName, mfrValue) {
  const cf = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(cf)) {
    return false;
  }
  try {
    const content = fs.readFileSync(cf, 'utf8');
    const data = JSON.parse(content);
    if (!data.zigbee) data.zigbee = {};
    if (!data.zigbee.manufacturerName) data.zigbee.manufacturerName = [];
    
    // De-duplicate case-insensitively
    const list = data.zigbee.manufacturerName;
    const normalized = mfrValue.trim();
    if (list.some(x => x.toLowerCase() === normalized.toLowerCase())) {
      return false; // already present
    }
    
    list.push(normalized);
    fs.writeFileSync(cf, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return true;
  } catch (e) {
    console.error(`Failed to patch driver ${driverName}: ${e.message}`);
    return false;
  }
}

function main() {
  const state = loadState();
  const repos = ['JohanBendz/com.tuya.zigbee', 'dlnraja/com.tuya.zigbee'];
  
  // Gather all new fingerprints
  const newFPsMap = new Map(); // mfr -> { mfr, source, title }
  
  for (const repo of repos) {
    const data = state[repo];
    if (data && Array.isArray(data.newFPs)) {
      for (const fp of data.newFPs) {
        if (!newFPsMap.has(fp.mfr)) {
          newFPsMap.set(fp.mfr, fp);
        }
      }
    }
  }

  console.log(`Found ${newFPsMap.size} unique new fingerprints in scanner report.\n`);

  let addedCount = 0;
  const driverCounts = {};

  for (const [mfr, fp] of newFPsMap.entries()) {
    const suggestedDriver = inferDriverFromTitle(fp.title, fp.mfr);
    const success = patchDriver(suggestedDriver, fp.mfr);
    if (success) {
      console.log(`+ Integrated: "${fp.mfr}" -> [${suggestedDriver}] (from ${fp.source}: ${fp.title.substring(0, 50)})`);
      driverCounts[suggestedDriver] = (driverCounts[suggestedDriver] || 0) + 1;
      addedCount++;
    }
  }

  console.log(`\nSuccessfully integrated ${addedCount} new fingerprints across the driver fleet!`);
  console.log('Driver distribution:', JSON.stringify(driverCounts, null, 2));
}

main();
