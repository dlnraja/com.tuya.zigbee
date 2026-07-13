'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote4GangDriver extends Driver {
  async onInit() {
    this.log('wall_remote_4_gang driver init');
    registerButtonFlowCards(this, 'wall_remote_4_gang', 4);
  }
}

module.exports = WallRemote4GangDriver;
