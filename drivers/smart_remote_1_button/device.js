'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Smart Remote 1 Button - TS004F
 * 1-button battery remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class SmartRemote1ButtonDevice extends ButtonDevice {
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

    this.buttonCount = 1;
    this.log('[SMART_REMOTE_1_BUTTON] v5.12.0 init - 1 button');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[SMART_REMOTE_1_BUTTON] init err:', err.message));
    this.log('[SMART_REMOTE_1_BUTTON] ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartRemote1ButtonDevice;
