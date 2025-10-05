'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class CeilingFanDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Ceiling Fan device initialized');

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: this.getClusterEndpoint(CLUSTER.ON_OFF)
      });
    }

    // Register dim capability for fan speed control
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
        endpoint: this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL)
      });
    }

    // Print the current state
    this.log('Ceiling fan state:', {
      onoff: this.getCapabilityValue('onoff'),
      fanSpeed: this.getCapabilityValue('dim')
    });
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Ceiling Fan device has been deleted');
  }

}

module.exports = CeilingFanDevice;
