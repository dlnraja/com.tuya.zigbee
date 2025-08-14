const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaZigbeeDriver extends ZigBeeDevice {
  async onMeshInit() {
    // Initialize device
    this.log('tuya_zigbee driver initialized');
  }
}

module.exports = TuyaZigbeeDriver;