'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.printNode();
    
    // Register capabilities with correct clusters
    if (this.hasCapability('alarm_co')) {
      this.registerCapability('alarm_co', 1280);
    }
    
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1);
    }
  }
}

module.exports = TuyaDevice;