'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART PLUG - v5.6.0 + Virtual/Physical Buttons (packetninja pattern)   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ PlugBase handles: onoff listener, Tuya DP, ZCL On/Off                ║
 * ║  This class ONLY: dpMappings + ZCL energy monitoring listeners              ║
 * ║  DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00                          ║
 * ║  v5.6.0: Added bidirectional physical/virtual button support                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartPlugDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }
  // v9.7.3: Standardized Plug with bidirectional button support
  // All energy monitoring (Tuya DP + ZCL) is now orchestrated by UnifiedPlugBase.

  get plugCapabilities() {
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      7: { capability: null, internal: 'child_lock', writable: true },
      9: { capability: null, internal: 'countdown', writable: true },
      17: { capability: 'measure_current', divisor: 1000 },
      18: { capability: 'measure_power', divisor: 10 },
      19: { capability: 'measure_voltage', divisor: 10 },
      20: { capability: 'meter_power', divisor: 100 },
      21: { capability: null, internal: 'frequency', divisor: 100 },
      101: { capability: null, internal: 'power_factor', divisor: 10 },
      102: { capability: null, internal: 'max_power_alert', writable: true }
    };
  }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v9.7.3: Initialization chain: Mixins -> UnifiedPlugBase -> Specialized setup
      await super.onNodeInit({ zclNode });
      // v5.6.0: Initialize bidirectional button support
      await this.initPhysicalButtonDetection(zclNode);
      await this.initVirtualButtons();
      this._setupPhysicalButtonFlowDetection();
      this.log('[PLUG] ✅ v9.7.3 Standardized initialization complete');
    }, 'onNodeInit');
  }

  /**
   * v5.6.0: Setup physical button flow detection (packetninja pattern)
   */
  _setupPhysicalButtonFlowDetection() {
    this._lastOnoffState = this.getCapabilityValue('onoff');
    this._appCommandPending = false;
    
    // Intercept DP1 to detect physical button presses
    const originalHandler = this._handleDP?.bind(this);
    if (originalHandler) {
      this._handleDP = (dp, value) => {
        if (dp === 1) {
          const state = Boolean(value);
          const isPhysical = !this._appCommandPending;
          if (this._lastOnoffState !== state) {
            this._lastOnoffState = state;
            if (isPhysical) {
              const flowId = state ? 'plug_smart_physical_on' : 'plug_smart_physical_off';
              this.log(`[BUTTON] 🔘 Physical press detected: ${state ? 'ON' : 'OFF'}`);
              this.homey.flow.getDeviceTriggerCard(flowId).trigger(this, {}, {}).catch(e => this.error('[BUTTON] Flow error:', e));
            }
          }
        }
        return originalHandler(dp, value);
      };
    }
  }

  async _setOnOff(value) {
    this._appCommandPending = true;
    setTimeout(() => { this._appCommandPending = false; }, 2000);
    return super._setOnOff(value);
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartPlugDevice;
