const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeDriver extends ZigBeeDevice {
  async onMeshInit() {
    // Initialize device
    this.log('zigbee driver initialized');
  }
}

module.exports = ZigbeeDriver;