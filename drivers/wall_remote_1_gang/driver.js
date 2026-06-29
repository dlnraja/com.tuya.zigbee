'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote1GangDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'wall_remote_1_gang', 1);
    this.log('wall_remote_1_gang driver initialized');
  }
}

module.exports = WallRemote1GangDriver;
