'use strict';

const Homey = require('homey');

class SwitchPlug1Driver extends Homey.Driver {
  async onInit() {
    this.log('Smart Plug 1-Gang Driver initialized');
  }
}

module.exports = SwitchPlug1Driver;
