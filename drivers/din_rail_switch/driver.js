'use strict';

const { Driver } = require('homey');

class DinRailSwitchDriver extends Driver {
  async onInit() {
    this.log('Din Rail Switch driver initialized');
  }
}

module.exports = DinRailSwitchDriver;
