'use strict';

const { Driver } = require('homey');

class Dimmer3GangDriver extends Driver {
  async onInit() {
    this.log('3-Gang Dimmer Driver initialized');
  }
}

module.exports = Dimmer3GangDriver;
