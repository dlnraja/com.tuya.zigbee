'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.printNode();
    
    // Register capabilities with proper Zigbee clusters
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 1026);
    }

    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 1029);
    }

    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1);
    }

    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', 1);
    }
  }
}
module.exports = TuyaDevice;