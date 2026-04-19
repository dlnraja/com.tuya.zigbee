const fs = require('fs');
const path = require('path');

// Fix missing endpoints in driver.compose.json files
const driversNeedingEndpoints = [
  'hvac_controller', 'lcdtemphumidsensor', 'light_sensor_outdoor',
  'lock_smart', 'pet_feeder_zigbee', 'plug_energy_monitor',
  'plug_smart', 'power_meter', 'radiator_valve', 'rain_sensor',
  'siren', 'smart_lcd_thermostat', 'smart_scene_panel', 'soil_sensor',
  'switch_1gang', 'thermostat_tuya_dp', 'valve_irrigation',
  'vibration_sensor', 'water_leak_sensor', 'water_valve_smart'
];

let fixed = 0;

for (const driver of driversNeedingEndpoints) {
  const filePath = path.join('drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let data = JSON.parse(content);
  
  // Check if zigbee section exists and lacks endpoints
  if (data.zigbee && !data.zigbee.endpoints) {
    // Add minimal endpoints configuration
    data.zigbee.endpoints = {
      "1": {
        "clusters": data.zigbee.clusters || [0, 6],
        "bindings": data.zigbee.bindings || []
      }
    };
    
    // Clean up old top-level clusters/bindings if they exist
    delete data.zigbee.clusters;
    delete data.zigbee.bindings;
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(` Fixed ${driver}`);
    fixed++;
  }
}

console.log(`\n Fixed ${fixed} drivers with missing endpoints`);
