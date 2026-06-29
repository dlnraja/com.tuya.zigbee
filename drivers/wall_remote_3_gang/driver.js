'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote3GangDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'wall_remote_3_gang', 3);
    this.log('wall_remote_3_gang driver initialized');
  }
}

module.exports = WallRemote3GangDriver;
