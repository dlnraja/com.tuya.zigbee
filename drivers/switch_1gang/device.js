'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v5.5.940 SIMPLIFIED (PR #118 rollback)                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - dpMappings for DP 1-8 (gang switches) + DP 14-15 (settings)              ║
 * ║  - _setupTuyaDPMode() + _setupZCLMode()                                      ║
 * ║  - _registerCapabilityListeners() for all gangs                              ║
 * ║  - ProtocolAutoOptimizer for automatic detection                             ║
 * ║                                                                               ║
 * ║  NOTE: BSEED devices should use wall_switch_1gang_1way driver instead       ║
 * ║  (PR #118 by packetninja/Attilla)                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {

  get gangCount() { return 1; }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', divisor: 1000, unit: 'A' },
      18: { capability: 'measure_power', divisor: 10, unit: 'W' },
      19: { capability: 'measure_voltage', divisor: 10, unit: 'V' },
      20: { capability: 'meter_power', divisor: 100, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    // Track state for physical button detection (PR #120 pattern)
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this._setupPhysicalButtonFlowDetection();
    this.log('[SWITCH-1G] v5.5.961 - Physical button detection ready');
  }

  /**
   * Setup physical button flow detection (PR #120 pattern)
   */
  _setupPhysicalButtonFlowDetection() {
    this.registerCapabilityListener('onoff', async (value) => {
      this._markAppCommand();
      return this._setGangOnOff(1, value);
    });

    const originalHandler = this._handleTuyaDatapoint?.bind(this);
    if (originalHandler) {
      this._handleTuyaDatapoint = (dp, data, reportingEvent = false) => {
        if (dp === 1) {
          const state = Boolean(data?.value ?? data);
          const isPhysical = reportingEvent && !this._appCommandPending;
          if (this._lastOnoffState !== state) {
            this._lastOnoffState = state;
            if (isPhysical) {
              const flowId = state ? 'switch_1gang_physical_on' : 'switch_1gang_physical_off';
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, {}, {}).catch(() => {});
            }
          }
        }
        return originalHandler(dp, data, reportingEvent);
      };
    }
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }
}

module.exports = Switch1GangDevice;
