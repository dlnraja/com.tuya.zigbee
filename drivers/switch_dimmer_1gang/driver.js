'use strict';

const Homey = require('homey');

class SwitchDimmer1GangDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Bseed Dimmer 1 Gang Driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is pairing
   */
  async onPairListDevices() {
    return [];
  }

}

module.exports = SwitchDimmer1GangDriver;
