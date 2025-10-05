'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ComprehensiveAirMonitorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.enableDebug();
    this.printNode();

    // Register measurements using numeric Zigbee clusters
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 1026); // temperatureMeasurement
    }
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 1029); // relativeHumidity
    }
    // CO2/PM2.5 typically via Tuya EF00; fallback runtime can be added when DP map is confirmed
  }
}

module.exports = ComprehensiveAirMonitorDevice;
