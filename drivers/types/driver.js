const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Device initialized');
    
    // Register capabilities
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'onOff');
    }
}

module.exports = MyDevice;