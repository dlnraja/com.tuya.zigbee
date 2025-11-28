'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Philips Hue Bulb Device
 * Supports all Hue bulbs: White, Ambiance, Color
 */
class PhilipsHueBulbDevice extends ZigBeeLightDevice {

  async onNodeInit({ zclNode }) {
    this.log('Philips Hue Bulb initializing...');

    // Call parent init for light capabilities
    await super.onNodeInit({ zclNode });

    // Mark as mains powered
    this._mainsPowered = true;

    // Get transition time from settings
    this._transitionTime = this.getSetting('transition_time') || 400;

    // Custom on/off with transition
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[HUE] Setting onoff: ${value}`);
      const endpoint = zclNode.endpoints[11] || zclNode.endpoints[1];
      if (endpoint?.clusters?.onOff) {
        if (value) {
          await endpoint.clusters.onOff.setOn();
        } else {
          await endpoint.clusters.onOff.setOff();
        }
      }
      return value;
    });

    // Dimming with transition
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        this.log(`[HUE] Setting dim: ${value}`);
        const endpoint = zclNode.endpoints[11] || zclNode.endpoints[1];
        if (endpoint?.clusters?.levelControl) {
          await endpoint.clusters.levelControl.moveToLevel({
            level: Math.round(value * 254),
            transitionTime: Math.round(this._transitionTime / 100)
          });
        }
        return value;
      });
    }

    this.log('Philips Hue Bulb initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('transition_time')) {
      this._transitionTime = newSettings.transition_time;
      this.log(`[HUE] Transition time: ${this._transitionTime}ms`);
    }

    if (changedKeys.includes('power_on_behavior')) {
      this.log(`[HUE] Power-on behavior: ${newSettings.power_on_behavior}`);
      // Hue uses attribute 0x4003 for startup behavior
    }
  }
}

module.exports = PhilipsHueBulbDevice;
