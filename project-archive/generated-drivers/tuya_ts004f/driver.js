'use strict';

const Homey = require('homey');

/**
 * Tuya TS004F Driver
 */
class TuyaTs004fDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs004fDriver has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS004F',
        data: {
          id: 'f6d8d64e-399f-4817-b2b2-9efaf4d4d015'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = TuyaTs004fDriver;