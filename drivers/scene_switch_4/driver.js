'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch4Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch4Driver initialized');
  }

}

module.exports = SceneSwitch4Driver;
