'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');

/**
 * IKEA TRÅDFRI Bulb Device
 */
class IkeaTradfriLightDevice extends ZigBeeLightDevice {

  async onNodeInit({ zclNode }) {
    this.log('IKEA TRÅDFRI Bulb initializing...');

    // Mark as mains powered
    this._mainsPowered = true;

    // Call parent init for light capabilities
    await super.onNodeInit({ zclNode });

    this.log('IKEA TRÅDFRI Bulb initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('transition_time')) {
      this.log(`[IKEA] Transition time: ${newSettings.transition_time}ms`);
    }
  }
}

module.exports = IkeaTradfriLightDevice;
