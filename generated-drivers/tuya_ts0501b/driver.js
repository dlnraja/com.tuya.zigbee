'use strict';

const Homey = require('homey');

/**
 * Tuya TS0501B Driver
 */
class TuyaTs0501bDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs0501bDriver has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS0501B',
        data: {
          id: '2562ab82-00b8-42ae-895e-8f118a1b6c78'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = TuyaTs0501bDriver;