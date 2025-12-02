'use strict';

const Homey = require('homey');

class SwitchPlug2Driver extends Homey.Driver {
  async onInit() {
    this.log('Smart Plug 2-Gang Driver initialized');
  }
}

module.exports = SwitchPlug2Driver;
