'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');

/**
 * Hybrid Light + Window Covering Device
 *
 * For Tuya Zigbee devices that function as BOTH a dimmable light AND a
 * curtain/shutter controller. These devices have irreconcilable conflicts when
 * registered under separate light (bulb_dimmable) or windowcoverings (curtain_motor_shutter) drivers.
 *
 * Class: "windowcoverings" (allows windowcoverings_set in Homey UI)
 * Capabilities: onoff, dim (light brightness), windowcoverings_set, windowcoverings_state
 *
 * The device routes DP commands to both the light and motor subsystems.
 */
class HybridLightWindowCoveringsDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      // Light control DPs
      1: { capability: 'onoff', divisor: 1 },
      2: { capability: 'dim', divisor: 1 },
      // Window covering DPs
      3: { capability: 'windowcoverings_set', divisor: 1 },
      4: { capability: 'windowcoverings_state', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_LIGHT_WINDOWCOVERINGS] Initializing...');

    await super.onNodeInit({ zclNode });

    // Register light on/off listener
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[HYBRID_LIGHT_WINDOWCOVERINGS] Light ${value ? 'ON' : 'OFF'}`);
      try {
        await this.sendTuyaDataPoint(1, value ? 1 : 0, 'value');
      } catch (err) {
        this.error(`[HYBRID_LIGHT_WINDOWCOVERINGS] Failed to set light: ${err.message}`);
      }
    });

    // Register light brightness listener
    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.round(value * 100);
      this.log(`[HYBRID_LIGHT_WINDOWCOVERINGS] Brightness: ${brightness}%`);
      try {
        await this.sendTuyaDataPoint(2, brightness, 'value');
      } catch (err) {
        this.error(`[HYBRID_LIGHT_WINDOWCOVERINGS] Failed to set brightness: ${err.message}`);
      }
    });

    // Register window covering position listener
    this.registerCapabilityListener('windowcoverings_set', async (value) => {
      this.log(`[HYBRID_LIGHT_WINDOWCOVERINGS] Cover position: ${value}%`);
      try {
        await this.sendTuyaDataPoint(3, value, 'value');
      } catch (err) {
        this.error(`[HYBRID_LIGHT_WINDOWCOVERINGS] Failed to set cover position: ${err.message}`);
      }
    });

    // Register window covering state listener (open/close/stop)
    this.registerCapabilityListener('windowcoverings_state', async (value) => {
      this.log(`[HYBRID_LIGHT_WINDOWCOVERINGS] Cover state: ${value}`);
      const stateMap = { 'up': 0, 'down': 1, 'stop': 2 };
      const dpValue = stateMap[value] ?? 2;
      try {
        await this.sendTuyaDataPoint(4, dpValue, 'value');
      } catch (err) {
        this.error(`[HYBRID_LIGHT_WINDOWCOVERINGS] Failed to set cover state: ${err.message}`);
      }
    });

    this.log('[HYBRID_LIGHT_WINDOWCOVERINGS] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_LIGHT_WINDOWCOVERINGS] DP${dpId} = ${value}`);

    const mapping = this.dpMappings[dpId];
    if (mapping) {
      let val = value / (mapping.divisor || 1);

      if (val !== null && val !== undefined) {
        return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridLightWindowCoveringsDevice;
