#!/usr/bin/env node
'use strict';

/**
 * RESTORE ALL ENDPOINTS
 * 
 * Restaure tous les endpoints qui ont été supprimés par REMOVE_PROBLEM_ENDPOINTS.js
 * Utilise les configurations correctes selon le type de device
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 RESTORE ALL ENDPOINTS\n');
console.log('═══════════════════════════════════════════════════\n');

/**
 * Configurations standard des endpoints selon le type
 */
const ENDPOINT_CONFIGS = {
  
  // Buttons & Wireless Switches
  button: {
    "1": {
      clusters: [0, 1, 3],
      bindings: [3, 6, 8]
    }
  },
  
  button_advanced: {
    "1": {
      clusters: [0, 1, 3, 6, 8],
      bindings: [0, 1, 3, 6, 8]
    }
  },
  
  // Climate & Sensors
  climate_sensor: {
    "1": {
      clusters: [0, 1, 3, 1026, 1029],
      bindings: [0, 1]
    }
  },
  
  // Presence Sensors
  presence_sensor: {
    "1": {
      clusters: [0, 1, 3, 1030],
      bindings: [0, 1]
    }
  },
  
  // Switches 1 Gang
  switch_1gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    }
  },
  
  // Switches 2 Gang
  switch_2gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    },
    "2": {
      clusters: [6],
      bindings: [6]
    }
  },
  
  // Switches 3 Gang
  switch_3gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    },
    "2": {
      clusters: [6],
      bindings: [6]
    },
    "3": {
      clusters: [6],
      bindings: [6]
    }
  },
  
  // Switches 4 Gang
  switch_4gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    },
    "2": {
      clusters: [6],
      bindings: [6]
    },
    "3": {
      clusters: [6],
      bindings: [6]
    },
    "4": {
      clusters: [6],
      bindings: [6]
    }
  },
  
  // Switches 5 Gang
  switch_5gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    },
    "2": {
      clusters: [6],
      bindings: [6]
    },
    "3": {
      clusters: [6],
      bindings: [6]
    },
    "4": {
      clusters: [6],
      bindings: [6]
    },
    "5": {
      clusters: [6],
      bindings: [6]
    }
  },
  
  // Switches 6 Gang
  switch_6gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    },
    "2": {
      clusters: [6],
      bindings: [6]
    },
    "3": {
      clusters: [6],
      bindings: [6]
    },
    "4": {
      clusters: [6],
      bindings: [6]
    },
    "5": {
      clusters: [6],
      bindings: [6]
    },
    "6": {
      clusters: [6],
      bindings: [6]
    }
  },
  
  // Switches 8 Gang
  switch_8gang: {
    "1": {
      clusters: [0, 3, 4, 5, 6],
      bindings: [6]
    },
    "2": {
      clusters: [6],
      bindings: [6]
    },
    "3": {
      clusters: [6],
      bindings: [6]
    },
    "4": {
      clusters: [6],
      bindings: [6]
    },
    "5": {
      clusters: [6],
      bindings: [6]
    },
    "6": {
      clusters: [6],
      bindings: [6]
    },
    "7": {
      clusters: [6],
      bindings: [6]
    },
    "8": {
      clusters: [6],
      bindings: [6]
    }
  }
};

/**
 * Mapping des drivers vers leurs configurations
 */
const DRIVER_ENDPOINT_MAP = {
  // Buttons
  'button_emergency_advanced': 'button_advanced',
  'button_wireless_3': 'button',
  'button_wireless_4': 'button',
  
  // Climate
  'climate_sensor_soil': 'climate_sensor',
  
  // Presence
  'presence_sensor_radar': 'presence_sensor',
  
  // Switches 1 gang
  'switch_basic_1gang': 'switch_1gang',
  'switch_smart_1gang': 'switch_1gang',
  'switch_touch_1gang': 'switch_1gang',
  'switch_touch_1gang_basic': 'switch_1gang',
  'switch_wall_1gang': 'switch_1gang',
  'switch_wall_1gang_basic': 'switch_1gang',
  
  // Switches 2 gang
  'switch_basic_2gang': 'switch_2gang',
  'switch_2gang': 'switch_2gang',
  'switch_touch_2gang': 'switch_2gang',
  'switch_wall_2gang': 'switch_2gang',
  'switch_wall_2gang_basic': 'switch_2gang',
  'switch_wall_2gang_smart': 'switch_2gang',
  
  // Switches 3 gang
  'switch_smart_3gang': 'switch_3gang',
  'switch_touch_3gang': 'switch_3gang',
  'switch_touch_3gang_basic': 'switch_3gang',
  'switch_wall_3gang': 'switch_3gang',
  'switch_wall_3gang_basic': 'switch_3gang',
  
  // Switches 4 gang
  'switch_smart_4gang': 'switch_4gang',
  'switch_touch_4gang': 'switch_4gang',
  'switch_wall_4gang': 'switch_4gang',
  'switch_wall_4gang_basic': 'switch_4gang',
  'switch_wall_4gang_smart': 'switch_4gang',
  
  // Switches 5 gang
  'switch_basic_5gang': 'switch_5gang',
  'switch_wall_5gang': 'switch_5gang',
  
  // Switches 6 gang
  'switch_wall_6gang': 'switch_6gang',
  'switch_wall_6gang_basic': 'switch_6gang',
  'switch_wall_6gang_smart': 'switch_6gang',
  
  // Switches 8 gang
  'switch_wall_8gang_smart': 'switch_8gang'
};

/**
 * Restaure les endpoints pour un driver
 */
function restoreEndpoints(driverName) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    console.log(`⚠️  Not found: ${driverName}`);
    return false;
  }
  
  const configKey = DRIVER_ENDPOINT_MAP[driverName];
  if (!configKey) {
    console.log(`❌ No config for: ${driverName}`);
    return false;
  }
  
  const endpoints = ENDPOINT_CONFIGS[configKey];
  if (!endpoints) {
    console.log(`❌ No endpoint config for: ${configKey}`);
    return false;
  }
  
  // Read compose file
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  // Ensure zigbee object exists
  if (!compose.zigbee) {
    compose.zigbee = {};
  }
  
  // Add endpoints
  compose.zigbee.endpoints = endpoints;
  
  // Write back
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
  
  const epCount = Object.keys(endpoints).length;
  console.log(`✅ ${driverName} - ${epCount} endpoint(s)`);
  
  return true;
}

/**
 * Main
 */
function main() {
  const drivers = Object.keys(DRIVER_ENDPOINT_MAP);
  
  console.log(`📊 Processing ${drivers.length} drivers...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const driverName of drivers) {
    if (restoreEndpoints(driverName)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ ENDPOINTS RESTORED');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('');
  
  console.log('📝 Endpoint configurations:');
  console.log('   - Buttons: 1 endpoint (clusters: 0,1,3 / bindings: 3,6,8)');
  console.log('   - Climate: 1 endpoint (clusters: 0,1,3,1026,1029)');
  console.log('   - Presence: 1 endpoint (clusters: 0,1,3,1030)');
  console.log('   - Switch 1g: 1 endpoint (clusters: 0,3,4,5,6)');
  console.log('   - Switch 2g: 2 endpoints');
  console.log('   - Switch 3g: 3 endpoints');
  console.log('   - Switch 4g: 4 endpoints');
  console.log('   - Switch 5g: 5 endpoints');
  console.log('   - Switch 6g: 6 endpoints');
  console.log('   - Switch 8g: 8 endpoints');
  console.log('');
  
  console.log('✅ All endpoints restored correctly!');
  console.log('');
}

main();
