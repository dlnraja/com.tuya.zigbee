'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote4GangDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'wall_remote_4_gang', 4);
    this.log('wall_remote_4_gang driver initialized');
  }
}

module.exports = WallRemote4GangDriver;
