'use strict';

const HybridLightBase = require('../../lib/devices/HybridLightBase');

/**
 * LED Strip Device - v5.3.64 SIMPLIFIED
 */
class LEDStripDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation'];
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    // --- Battery Alarm (auto-injected) ---
    if (this.hasCapability('measure_battery')) {
      this.registerCapabilityListener('measure_battery', async (value) => {
        if (this.hasCapability('alarm_battery')) {
          await this.setCapabilityValue('alarm_battery', value < 15).catch(() => {});
        }
      });
      // Initial check
      const bat = this.getCapabilityValue('measure_battery');
      if (bat !== null && this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', bat < 15).catch(() => {});
      }
    }
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this.log('[LED] ✅ LED strip ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = LEDStripDevice;
