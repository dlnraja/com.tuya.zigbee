'use strict';

const Homey = require('homey');

class SceneSwitch2Driver extends Homey.Driver {
  async onInit() {
    this.log('Scene Switch 2-Gang Driver initialized');
  }
}

module.exports = SceneSwitch2Driver;
