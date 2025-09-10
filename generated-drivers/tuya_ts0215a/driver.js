'use strict';

const Homey = require('homey');

/**
 * Tuya TS0215A Driver
 */
class TuyaTs0215aDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs0215aDriver has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS0215A',
        data: {
          id: '575cb4ea-596d-4663-b7ab-c7608025220a'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = TuyaTs0215aDriver;