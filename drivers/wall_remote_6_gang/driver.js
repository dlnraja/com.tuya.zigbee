'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote6GangDriver extends Driver {
  async onInit() {
    this.log('wall_remote_6_gang driver init');
    registerButtonFlowCards(this, 'wall_remote_6_gang', 6);
  }
}

module.exports = WallRemote6GangDriver;
