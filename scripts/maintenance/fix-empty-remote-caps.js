#!/usr/bin/env node
/**
 * Fix empty capabilities in remote/button/scene switch drivers.
 * These drivers extend ButtonDevice but have no capabilities declared
 * in driver.compose.json, causing "Missing Capability Listener" errors.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');

// Map driver name patterns to their expected capabilities
function getCaps(driverName, deviceCode) {
  // Determine button count from name
  let btnCount = 1;
  if (/1_gang|1_button/.test(driverName)) btnCount = 1;
  else if (/2_gang|2_button/.test(driverName)) btnCount = 2;
  else if (/3_gang|3_button/.test(driverName)) btnCount = 3;
  else if (/4_gang|4_button/.test(driverName)) btnCount = 4;
  else if (/6_gang|6_button/.test(driverName)) btnCount = 6;
  
  // Read device.js to detect buttonCount
  const devFile = path.join(DDIR, driverName, 'device.js');
  if (fs.existsSync(devFile)) {
    const code = fs.readFileSync(devFile, 'utf8');
    const m = code.match(/buttonCount\s*=\s*(\d+)/);
    if (m) btnCount = parseInt(m[1]);
  }
  
  const caps = [];
  const opts = {};
  for (let i = 1; i <= btnCount; i++) {
    caps.push(`button.${i}`);
    opts[`button.${i}`] = {
      title: {
        en: `Button ${i}`,
        fr: `Bouton ${i}`,
        nl: `Knop ${i}`,
        de: `Taste ${i}`
      }
    };
  }
  
  // Add battery for battery-powered devices
  caps.push('measure_battery');
  opts['measure_battery'] = {
    title: { en: 'Battery', fr: 'Batterie', nl: 'Batterij', de: 'Batterie' }
  };
  
  return { caps, opts };
}

function main() {
  const remotes = ['smart_button_switch', 'smart_remote_1_button_2', 
    'smart_remote_4_buttons', 'wall_remote_1_gang', 'wall_remote_3_gang',
    'wall_remote_4_gang', 'wall_remote_4_gang_2', 'wall_remote_4_gang_3',
    'wall_remote_6_gang'];
  
  let fixed = 0;
  
  for (const d of remotes) {
    const composeFile = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) {
      console.log(`   ${d}: compose file not found`);
      continue;
    }
    
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    
    if (compose.capabilities && compose.capabilities.length > 0) {
      console.log(`   ${d}: already has capabilities, skipping`);
      continue;
    }
    
    const { caps, opts } = getCaps(d);
    compose.capabilities = caps;
    compose.capabilitiesOptions = { ...(compose.capabilitiesOptions || {}), ...opts };
    
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
    console.log(`   ${d}: added ${caps.length} capabilities (${caps.join(', ')})`);
    fixed++;
  }
  
  console.log(`\nFixed ${fixed} drivers`);
}

main();
