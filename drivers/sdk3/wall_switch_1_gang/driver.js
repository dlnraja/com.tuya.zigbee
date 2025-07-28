'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class WallSwitch1Gang extends ZigbeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Enable debugging
    this.enableDebug();
    this.printNode();
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
  }
}

module.exports = WallSwitch1Gang; 


