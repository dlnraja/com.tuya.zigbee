'use strict';

const BaseZigbeeDevice = require('../../../common/BaseZigbeeDevice');
const { Cluster, CLUSTER } = require("zigbee-clusters");

class TS0207Device extends BaseZigbeeDevice {

  /**
   * Registers the capabilities of the device.
   * This is called by the BaseDevice's onNodeInit.
   */
  async registerCapabilities() {
    this.log('Registering capabilities for TS0207 Water Leak Sensor');

    // Register Water Alarm capability
    this.registerCapability('alarm_water', CLUSTER.IAS_ZONE);

    // Battery capability is handled by the BaseDevice
  }

module.exports = TS0207Device;
