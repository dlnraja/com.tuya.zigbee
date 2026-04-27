/**
 * Script: fix-malformed-drivers.js
 * Purpose: Fix drivers that have structural issues after previous cleanup
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// List of drivers that need complete rewrite due to structural corruption
const DRIVERS_TO_REWRITE = {
  'water_valve_smart': `\'use strict\';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterValveSmartDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('WaterValveSmart driver v7.4.11 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getActionCard('water_valve_smart_set_valve');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setValve(args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.error(\`Flow card error: \${err.message}\`);
    }
    this.log('[FLOW] WaterValveSmart flow cards registered');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WaterValveSmartDriver;
`,

  'weather_station_outdoor': `\'use strict\';

const Homey = require('homey');

class WeatherStationOutdoorDriver extends Homey.Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Weather Station Outdoor driver v7.4.11 initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WeatherStationOutdoorDriver;
`,

  'switch_temp_sensor': `\'use strict\';

const Homey = require('homey');

class SwitchTempSensorDriver extends Homey.Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Switch Temp Sensor driver v7.4.11 initialized');
    
    try {
      const card = this.homey.flow.getActionCard('switch_temp_sensor_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('target_temperature', args.temperature).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.error(\`Flow card error: \${err.message}\`);
    }
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = SwitchTempSensorDriver;
`,
};

console.log('=== Fix Malformed Drivers ===\n');

let fixed = 0;
let errors = 0;

for (const [driverName, content] of Object.entries(DRIVERS_TO_REWRITE)) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  
  if (!fs.existsSync(driverPath)) {
    console.log(`  [MISSING] ${driverName}/driver.js`);
    continue;
  }
  
  try {
    fs.writeFileSync(driverPath, content, 'utf8');
    console.log(`  [REWRITTEN] ${driverName}`);
    fixed++;
  } catch (err) {
    console.log(`  [ERROR] ${driverName}: ${err.message}`);
    errors++;
  }
}

console.log(`\nFixed: ${fixed}, Errors: ${errors}`);
