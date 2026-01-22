'use strict';

const Homey = require('homey');

class SwitchDimmer1GangDriver extends Homey.Driver {

  async onInit() {
    this.log('Switch Touch Dimmer (1 Gang) Driver has been initialized');
  }

  async onPairListDevices() {
    return [];
  }

}

module.exports = SwitchDimmer1GangDriver;
