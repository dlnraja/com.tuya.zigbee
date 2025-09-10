'use strict';

const Homey = require('homey');

/**
 * Tuya TS0601 Driver
 */
class TuyaTs0601Driver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs0601Driver has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS0601',
        data: {
          id: '7527024e-f0a9-43ec-8865-0f51cb1b31f7'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = TuyaTs0601Driver;