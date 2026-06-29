'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class WallRemote3GangDriver extends Driver {
  async onInit() {
    this.log('wall_remote_3_gang driver init');
    registerButtonFlowCards(this, 'wall_remote_3_gang', 3);
  }
}

module.exports = WallRemote3GangDriver;
