const fs = require('fs');

console.log('🔧 COMPLETE DRIVER FILES');

// Example: co2_temp_humidity driver
const driver = 'co2_temp_humidity';
const path = `drivers/${driver}`;

// 1. Create device.js
const deviceJs = `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class CO2Device extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.registerCapability('measure_co2', 'CLUSTER_TUYA_SPECIFIC');
    this.registerCapability('measure_temperature', 'CLUSTER_TUYA_SPECIFIC');
  }
}
module.exports = CO2Device;`;

fs.writeFileSync(`${path}/device.js`, deviceJs);

// 2. Create driver.js
const driverJs = `'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class CO2Driver extends ZigBeeDriver {
  onInit() {
    this.log('CO2 Driver initialized');
  }
}
module.exports = CO2Driver;`;

fs.writeFileSync(`${path}/driver.js`, driverJs);

console.log(`✅ Completed ${driver} with device.js + driver.js`);
