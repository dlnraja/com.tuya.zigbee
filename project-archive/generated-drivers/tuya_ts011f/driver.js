'use strict';

const Homey = require('homey');

/**
 * Tuya TS011F Driver
 */
class TuyaTs011fDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs011fDriver has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS011F',
        data: {
          id: '9a2c1368-f2d7-401e-875a-ec20e69bba1c'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = TuyaTs011fDriver;