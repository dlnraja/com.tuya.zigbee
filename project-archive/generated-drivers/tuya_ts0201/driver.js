'use strict';

const Homey = require('homey');

/**
 * Tuya TS0201 Driver
 */
class TuyaTs0201Driver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs0201Driver has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS0201',
        data: {
          id: '23bec147-b1ec-4ff9-a27b-e81dfe3a3086'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = TuyaTs0201Driver;