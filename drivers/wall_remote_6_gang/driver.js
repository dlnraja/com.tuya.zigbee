'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote6GangDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'wall_remote_6_gang', 6);
    this.log('wall_remote_6_gang driver initialized');
  }
}

module.exports = WallRemote6GangDriver;
