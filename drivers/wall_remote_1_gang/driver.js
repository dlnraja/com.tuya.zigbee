'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote1GangDriver extends Driver {
  async onInit() {
    this.log('wall_remote_1_gang driver init');
    registerButtonFlowCards(this, 'wall_remote_1_gang', 1);
  }
}

module.exports = WallRemote1GangDriver;
