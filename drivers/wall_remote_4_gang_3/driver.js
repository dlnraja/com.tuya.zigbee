'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote4Gang3Driver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'wall_remote_4_gang_3', 4);
    this.log('wall_remote_4_gang_3 driver initialized');
  }
}

module.exports = WallRemote4Gang3Driver;
