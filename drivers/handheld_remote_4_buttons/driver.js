'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class HandheldRemote4ButtonsDriver extends Driver {
  async onInit() {
    this.log('handheld_remote_4_buttons driver init');
    registerButtonFlowCards(this, 'handheld_remote_4_buttons', 4);
  }
}

module.exports = HandheldRemote4ButtonsDriver;
