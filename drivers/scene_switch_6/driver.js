'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch6Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch6Driver initialized');
  }

}

module.exports = SceneSwitch6Driver;
