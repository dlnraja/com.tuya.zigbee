#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function main() {
  console.log(' ADAPTIVE LIGHTING ENFORCER - ACTIVATED');
  console.log('==========================================');

  const entries = fs.readdirSync(DRIVERS_DIR);
  for (const entry of entries) {
    if (entry.includes('bulb') || entry.includes('light')) {
      const composePath = path.join(DRIVERS_DIR, entry, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Only fix if it has 'dim' but NOT 'light_color_temp'
        if (compose.capabilities?.includes('dim' ) && !compose.capabilities?.includes('light_color_temp')) {
          console.log(`  Compensating ${entry}...`) ;
          
          // 1. Add capability
          compose.capabilities.push('light_color_temp');
          
          // 2. Add Zigbee Mapping if applicable
          if (compose.zigbee) {
            if (!compose.zigbee.capabilities ) compose.zigbee.capabilities = {};
            if (!compose.zigbee.capabilities.light_color_temp) {
              compose.zigbee.capabilities.light_color_temp = {
                cluster: "colorControl",
                attr: "colorTemperature"
              };
            }
          }

          // 3. Add WiFi (Tuya) Mapping if it looks like a WiFi driver
          const devicePath = path.join(DRIVERS_DIR, entry, 'device.js');
          if (fs.existsSync(devicePath)) {
            const code = fs.readFileSync(devicePath, 'utf8');
            if (code.includes('TuyaLocalDevice')) {
               // WiFi logic (simplistic)
               // Usually color temp is DP 3 or 4
            }
          }

          fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
          console.log(`    Added light_color_temp to ${entry}`);
        }
      } catch (e) {
        console.error(`    Failed ${entry}: ${e.message}`);
      }
    }
  }
}

main().catch(console.error);
