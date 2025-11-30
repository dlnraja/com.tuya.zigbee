'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver initializing...');

    // v5.2.61: Register SOS button flow card triggers
    this.sosButtonPressedTrigger = this.homey.flow.getDeviceTriggerCard('sos_button_pressed');
    if (this.sosButtonPressedTrigger) {
      this.log('[FLOW] ✅ Registered: sos_button_pressed trigger');
    } else {
      this.log('[FLOW] ⚠️ Flow card sos_button_pressed not found');
    }

    // Also try alternative names used in app.json
    if (!this.sosButtonPressedTrigger) {
      this.sosButtonPressedTrigger = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
      if (this.sosButtonPressedTrigger) {
        this.log('[FLOW] ✅ Registered: button_emergency_sos_pressed trigger');
      }
    }

    this.log('SosEmergencyButtonDriver initialized');
  }
}

module.exports = SosEmergencyButtonDriver;
