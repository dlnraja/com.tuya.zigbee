'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.469: SOS Emergency Button Driver - FIXED
 * Removed broken flow card registration causing driver initialization errors
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver v5.5.469 initialized');
    // v5.5.469: Flow cards are defined in driver.compose.json
    // No explicit registration needed - Homey SDK3 handles it automatically
  }

  /**
   * v5.5.469: Trigger SOS flow from device.js
   * Uses capability-based triggers which are auto-registered
   */
  triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] 🆘 triggerSOS called');
    // Capability change will auto-trigger flows
    device.setCapabilityValue('alarm_generic', true).catch(e =>
      this.log('[FLOW] ❌ alarm_generic set error:', e.message)
    );
  }
}

module.exports = SosEmergencyButtonDriver;
