'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerSOSFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: SOS Emergency Button Driver with flow card registration
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver initializing...');

    // v5.5.114: Use helper for comprehensive flow card registration
    registerSOSFlowCards(this);

    // Keep reference for device.js
    try {
      this.sosButtonPressedTrigger = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
    } catch (err) {
      // Silent - already registered by helper
    }

    this.log('SosEmergencyButtonDriver initialized');
  }
}

module.exports = SosEmergencyButtonDriver;
