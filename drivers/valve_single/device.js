'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VALVE SINGLE - v5.6.0 + Bidirectional Buttons                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Smart valve with bidirectional physical/virtual button support             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ValveSingleDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridPlugBase)) {
  get plugCapabilities() { return ['onoff']; }
  get gangCount() { return 1; }

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

    // v5.6.0: Track state for physical button detection
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    await super.onNodeInit({ zclNode });

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();

    this.log('[VALVE] v5.6.0 ✅ Ready with bidirectional buttons');
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = ValveSingleDevice;
