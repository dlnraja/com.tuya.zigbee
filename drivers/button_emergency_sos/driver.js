'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver initializing...');

    // v5.2.66: Use correct flow card ID from driver.flow.compose.json
    try {
      this.sosButtonPressedTrigger = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
      this.log('[FLOW] ✅ Registered: button_emergency_sos_pressed trigger');
    } catch (err) {
      this.error('[FLOW] ❌ Failed to register flow card:', err.message);
    }

    this.log('SosEmergencyButtonDriver initialized');
  }
}

module.exports = SosEmergencyButtonDriver;
