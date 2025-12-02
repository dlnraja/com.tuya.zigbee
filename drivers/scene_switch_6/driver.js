'use strict';

const Homey = require('homey');

class SceneSwitch6Driver extends Homey.Driver {
  async onInit() {
    this.log('Scene Switch 6-Gang Driver initialized');
  }
}

module.exports = SceneSwitch6Driver;
