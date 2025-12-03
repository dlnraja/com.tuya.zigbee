'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch2Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch2Driver initialized');
  }

}

module.exports = SceneSwitch2Driver;
