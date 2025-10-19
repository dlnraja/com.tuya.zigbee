'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class ShortcutButtonBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // IKEA SOMRIG Shortcut Button
    
    this.log('Shortcut Button initialized');
  }
}

module.exports = ShortcutButtonBatteryDevice;
