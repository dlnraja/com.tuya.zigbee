'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote4Gang3Driver extends Driver {
  async onInit() {
    this.log('wall_remote_4_gang_3 driver init');
    registerButtonFlowCards(this, 'wall_remote_4_gang_3', 4);
  }
}

module.exports = WallRemote4Gang3Driver;
