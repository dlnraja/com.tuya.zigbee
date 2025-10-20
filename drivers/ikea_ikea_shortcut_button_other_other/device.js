'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * ShortcutButtonBatteryDevice
 * 
 * SUPPORTED BRANDS:
 * - IKEA
 * 
 * COMPATIBLE PRODUCTS:
 * - IKEA SOMRIG Shortcut Button (E2213)
 * - Quick action button
 * 
 * Note: Driver ID and folder name are UNBRANDED for universal compatibility.
 * Brand identification happens via manufacturerName and productId fields.
 */

class ShortcutButtonBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // IKEA SOMRIG Shortcut Button
    
    this.log('Shortcut Button initialized');
  }
}

module.exports = ShortcutButtonBatteryDevice;
