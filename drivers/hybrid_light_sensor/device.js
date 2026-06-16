'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Hybrid Light + Button Sensor Device
 *
 * For Tuya Zigbee devices that function as BOTH a dimmable light AND a
 * wireless button / remote. These devices have irreconcilable conflicts when
 * registered under separate light (bulb_dimmable) or sensor (button_wireless_2) drivers.
 *
 * Class: "light" (allows onoff + dim in Homey UI)
 * Capabilities: onoff, dim, button.1, measure_battery, alarm_battery
 *
 * Examples: Smart bulbs with built-in button/remote functionality,
 * dimmer switches that also have a wireless button controller.
 */
class HybridLightSensorDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  get gangCount() { return 1; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', divisor: 1 },
      2: { capability: 'dim', divisor: 1 },
      3: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_LIGHT_SENSOR] Initializing...');

    await super.onNodeInit({ zclNode });

    // Register light on/off listener
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[HYBRID_LIGHT_SENSOR] Light ${value ? 'ON' : 'OFF'}`);
      try {
        await this.sendTuyaDataPoint(1, value ? 1 : 0, 'value');
      } catch (err) {
        this.error(`[HYBRID_LIGHT_SENSOR] Failed to set onoff: ${err.message}`);
      }
    });

    // Register brightness listener
    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.round(value * 100);
      this.log(`[HYBRID_LIGHT_SENSOR] Brightness: ${brightness}%`);
      try {
        await this.sendTuyaDataPoint(2, brightness, 'value');
      } catch (err) {
        this.error(`[HYBRID_LIGHT_SENSOR] Failed to set brightness: ${err.message}`);
      }
    });

    this.log('[HYBRID_LIGHT_SENSOR] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_LIGHT_SENSOR] DP${dpId} = ${value}`);

    const mapping = this.dpMappings[dpId];
    if (mapping) {
      let val = value / (mapping.divisor || 1);
      if (val !== null && val !== undefined) {
        return this.setCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridLightSensorDevice;
