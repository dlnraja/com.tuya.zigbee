'use strict';

const Homey = require('homey');

class SceneSwitch4Driver extends Homey.Driver {
  async onInit() {
    this.log('Scene Switch 4-Gang Driver initialized');
  }
}

module.exports = SceneSwitch4Driver;
