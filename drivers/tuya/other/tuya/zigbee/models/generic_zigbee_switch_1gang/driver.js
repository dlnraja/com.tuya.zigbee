'use strict';

const ZigbeeDevice = require('homey-meshdriver').ZigbeeDevice;

class GenericZigbeeSwitch1Gang extends ZigbeeDevice {
  async onMeshInit() {
    // Register capabilities
    await this.registerCapability('onoff', 'genOnOff');
  }
}

module.exports = GenericZigbeeSwitch1Gang;
