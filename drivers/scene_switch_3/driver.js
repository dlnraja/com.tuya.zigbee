'use strict';

const Homey = require('homey');

class SceneSwitch3Driver extends Homey.Driver {
  async onInit() {
    this.log('Scene Switch 3-Gang Driver initialized');
  }
}

module.exports = SceneSwitch3Driver;
