'use strict';

const { Driver } = require('homey');

class SmartPlugDimmerAcDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('SmartPlugDimmerAcDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   */
  async onPairListDevices() {
    return [];
  }

}

module.exports = SmartPlugDimmerAcDriver;
