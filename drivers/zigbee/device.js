const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeDevice extends ZigBeeDevice {
  async onMeshInit() {
    // Initialize device capabilities
    await this.registerCapability('onoff', 'genOnOff');
    
    this.log('zigbee device initialized');
  }
}

module.exports = ZigbeeDevice;