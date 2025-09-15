'use strict';

const BaseZigbeeDevice = require('../../../common/BaseZigbeeDevice');
const { Cluster, CLUSTER } = require("zigbee-clusters");

class TS0201Device extends BaseZigbeeDevice {

  /**
   * Registers the capabilities of the device.
   * This is called by the BaseDevice's onNodeInit.
   */
  async registerCapabilities() {
    this.log('Registering capabilities for TS0201');

    // Register Temperature capability
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      report: 'measuredValue',
      reportParser: value => {
        if (value < -10000) return null; // Ignore invalid values
        return value / 100;
      },
      reportOpts: {
        minReportDelay: 60,   // 1 minute
        maxReportDelay: 300,  // 5 minutes
        minReportChange: 10,  // 0.1 degree
      },
    });

    // Register Humidity capability
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      report: 'measuredValue',
      reportParser: value => {
        if (value < 0 || value > 10000) return null; // Ignore invalid values
        return value / 100;
      },
      reportOpts: {
        minReportDelay: 60,
        maxReportDelay: 300,
        minReportChange: 100, // 1%
      },
    });

    // The 'measure_battery' capability is automatically handled by the BaseDevice
    // as long as it's defined in the driver's manifest (driver.compose.json).
  }
}

module.exports = TS0201Device;
