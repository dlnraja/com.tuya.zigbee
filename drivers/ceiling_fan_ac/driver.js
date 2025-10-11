'use strict';

const { Driver } = require('homey');

class CeilingFanDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Ceiling Fan Driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' template is used.
   */
  async onPairListDevices() {
    return [];
  }

}

module.exports = CeilingFanDriver;
