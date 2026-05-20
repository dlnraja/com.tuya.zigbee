'use strict';

const { Driver } = require('homey');

class RemoteDimmerDriver extends Driver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('Remote Control Dimmer driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RemoteDimmerDriver;
