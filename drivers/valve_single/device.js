'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VALVE SINGLE - v5.6.0 + Bidirectional Buttons                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Smart valve with bidirectional physical/virtual button support             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ValveSingleDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {
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
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.6.0: Track state for physical button detection
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected

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
