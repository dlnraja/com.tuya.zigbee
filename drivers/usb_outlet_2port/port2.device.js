'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Port2Device - Sub device for USB Port 2
 * Handles only endpoint 2 (second USB port)
 */
class Port2Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    const { subDeviceId } = this.getData();
    this.log(`[PORT2] Initializing sub device: ${subDeviceId}`);
    
    // Register onoff capability for endpoint 2
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: 2
    });
    
    this.log('[PORT2] ✅ USB Port 2 initialized');
  }

  async onDeleted() {
    this.log('[PORT2] USB Port 2 deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = Port2Device;
