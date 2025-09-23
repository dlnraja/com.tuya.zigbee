'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class CO2Device extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.registerCapability('measure_co2', 'CLUSTER_TUYA_SPECIFIC');
    this.registerCapability('measure_temperature', 'CLUSTER_TUYA_SPECIFIC');
  }
}
module.exports = CO2Device;