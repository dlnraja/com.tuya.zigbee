'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartKnobSwitchDriver extends Driver {
  async onInit() {
    this.log('smart_knob_switch driver init');
    registerButtonFlowCards(this, 'smart_knob_switch', 1);
  }
}

module.exports = SmartKnobSwitchDriver;
