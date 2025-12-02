'use strict';

const Homey = require('homey');

class SceneSwitch1Driver extends Homey.Driver {
  async onInit() {
    this.log('Scene Switch 1-Gang Driver initialized');
  }
}

module.exports = SceneSwitch1Driver;
