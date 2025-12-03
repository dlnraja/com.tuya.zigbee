'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch1Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch1Driver initialized');
  }

}

module.exports = SceneSwitch1Driver;
