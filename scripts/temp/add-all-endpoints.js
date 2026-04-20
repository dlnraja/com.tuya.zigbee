const fs = require('fs');
const path = require('path');

// Add minimal endpoints to ALL drivers missing it
const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir);

let fixed = 0;

for (const driver of drivers) {
  const composeFile = path.join(driversDir, driver, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) continue;
  
  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const data = JSON.parse(content);
    
    // Only process if has zigbee section but no endpoints
    if (data.zigbee && !data.zigbee.endpoints) {
      // Determine appropriate clusters based on driver type
      let clusters = [0, 6]; // Basic + OnOff default
      let bindings = [];
      
      // Special cases for specific driver types
      if (driver.includes('sensor') || driver.includes('motion') || driver.includes('contact')) {
        clusters = [0, 1, 1026, 1280]; // Basic, Power, Temperature, IAS Zone
        bindings = [1];
      } else if (driver.includes('valve') || driver.includes('thermostat') || driver.includes('hvac')) {
        clusters = [0, 1, 513, 516]; // Basic, Power, Thermostat, HVAC
      } else if (driver.includes('plug') || driver.includes('power')) {
        clusters = [0, 6, 2820, 1794]; // Basic, OnOff, ElectricalMeasurement, Metering
      } else if (driver.includes('lock')) {
        clusters = [0, 1, 257]; // Basic, Power, DoorLock
      }
      
      // For TS0601 devices (Tuya DP), only need cluster 61184
      if (data.zigbee.productId && data.zigbee.productId.includes('TS0601')) {
        clusters = [0, 61184];
        bindings = [61184];
      }
      
      data.zigbee.endpoints = {
        "1": {
          "clusters": clusters,
          "bindings": bindings
        }
      };
      
      fs.writeFileSync(composeFile, JSON.stringify(data, null, 2) + '\n');
      console.log(` ${driver}`);
      fixed++;
    }
  } catch (e) {
    console.error(` ${driver}: ${e.message}`);
  }
}

console.log(`\n Added endpoints to ${fixed} drivers`);
