'use strict';
const EweLinkLocalDevice = require('../../lib/ewelink-local/EweLinkLocalDevice');

/**
 * Sonoff MINIR4 (Omni-Fusion Gold Template)
 * v7.0.0: Robust 1-gang WiFi relay with Auto-Healing & BVB
 */
class SonoffMinir4 extends EweLinkLocalDevice {

  /**
   * Mappage des Ã©tats (Inspiration Tuya/Sonoff Hybrid)
   * CentralisÃ© pour profiter de _safeSetCapability hÃ©ritÃ©e
   */
  get stateMappings() {
    return {
      switch: { 
        capability: 'onoff', 
        transform: v => v === 'on' 
      }
    };
  }

  _registerCapListeners() {
    // v7.0.0: Unified command pattern with error handling
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[MINIR4]  Command: ${value ? 'ON' : 'OFF'}`);
      try {
        await this._client.setSwitch(value);
      } catch (err) {
        this.error('[MINIR4] Command failed:', err.message);
        throw err;
      }
    });
  }

}

module.exports = SonoffMinir4;
