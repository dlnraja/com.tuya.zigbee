'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartKnobSwitchDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'smart_knob_switch', 1);
    this.log('smart_knob_switch driver initialized');
  }
}

module.exports = SmartKnobSwitchDriver;
