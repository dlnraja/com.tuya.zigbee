const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaZigbeeDevice extends ZigBeeDevice {
  async onMeshInit() {
    // Initialize device capabilities
    await this.registerCapability('onoff', 'genOnOff');
    
    this.log('tuya_zigbee device initialized');
  }
}

module.exports = TuyaZigbeeDevice;