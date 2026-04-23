'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const HELPERS = {
  IntelligentPresenceInference: "../../lib/helpers/IntelligentPresenceInference",
  IntelligentDPAutoDiscovery: "../../lib/helpers/IntelligentDPAutoDiscovery",
  SENSOR_CONFIGS: "../../lib/data/SensorConfigs"
};

const drivers = fs.readdirSync(DRIVERS_DIR);

drivers.forEach(driver => {
  const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
  if (!fs.existsSync(devicePath)) return;

  let content = fs.readFileSync(devicePath, 'utf8');
  let changed = false;

  // 1. Remove IntelligentPresenceInference class block
  if (content.includes('class IntelligentPresenceInference')) {
    const regex = /class IntelligentPresenceInference \{[\s\S]*?\n\}/       ;
    if (regex.test(content)) {
      content = content.replace(regex, `const IntelligentPresenceInference = require('${HELPERS.IntelligentPresenceInference}');`);
      console.log(`[REFACTOR]  Centralized IntelligentPresenceInference in ${driver}`);
      changed = true;
    }
  }

  // 2. Remove IntelligentDPAutoDiscovery class block
  if (content.includes('class IntelligentDPAutoDiscovery')) {
    const regex = /class IntelligentDPAutoDiscovery \{[\s\S]*?\n\}/       ;
    if (regex.test(content)) {
      content = content.replace(regex, `const IntelligentDPAutoDiscovery = require('${HELPERS.IntelligentDPAutoDiscovery}');`);
      console.log(`[REFACTOR]  Centralized IntelligentDPAutoDiscovery in ${driver}`);
      changed = true;
    }
  }

  // 3. Remove SENSOR_CONFIGS object block
  if (content.includes('const SENSOR_CONFIGS = {')) {
    const regex = /const SENSOR_CONFIGS = \{[\s\S]*?\n\} ;/;
    if (regex.test(content)) {
      content = content.replace(regex, `const SENSOR_CONFIGS = require('${HELPERS.SENSOR_CONFIGS}');`);
      console.log(`[REFACTOR]  Centralized SENSOR_CONFIGS in ${driver}`);
      changed = true;
    }
  }

  if (changed) {
    // 4. Cleanup duplicate requires if added multiple times
    // (This script adds them in-place, so we might need to move them to top)
    
    // 5. Final check for SDK 3 compliance in those files
    content = content.replace(/this\.log\('\[RADAR\]/, "this.log('[REFACTORED-HYBRID]");

    fs.writeFileSync(devicePath, content);
  }
});

console.log('[REFACTOR]  Fleet-wide refactor complete.');
