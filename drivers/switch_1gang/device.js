'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const { CLUSTER } = require('zigbee-clusters');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v5.5.895 UNIFIED (incl. BSEED)                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - dpMappings for DP 1-8 (gang switches) + DP 14-15 (settings)              ║
 * ║  - _setupTuyaDPMode() + _setupZCLMode()                                      ║
 * ║  - _registerCapabilityListeners() for all gangs                              ║
 * ║  - ProtocolAutoOptimizer for automatic detection                             ║
 * ║  v5.5.412: Added virtual toggle/identify buttons for remote control         ║
 * ║  v5.5.895: MERGED switch_1gang_bseed - physical button detection for all    ║
 * ║            Supports: Tuya DP, ZCL onOff, BSEED clusters (0xE000/0xE001)      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch1GangDevice extends VirtualButtonMixin(HybridSwitchBase) {

  get gangCount() { return 1; }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      // Energy monitoring (if device supports)
      17: { capability: 'measure_current', divisor: 1000, unit: 'A' },
      18: { capability: 'measure_power', divisor: 10, unit: 'W' },
      19: { capability: 'measure_voltage', divisor: 10, unit: 'V' },
      20: { capability: 'meter_power', divisor: 100, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.895: Initialize physical button tracking (merged from BSEED)
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    // Let parent handle Tuya DP + ZCL hybrid mode
    await super.onNodeInit({ zclNode });

    // v5.5.895: Setup BSEED-style physical button detection
    await this._setupPhysicalButtonDetection(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();

    this.log('[SWITCH-1G] v5.5.895 UNIFIED - 1-gang switch ready (BSEED merged)');
  }

  /**
   * v5.5.895: Setup physical button detection for BSEED and similar switches
   * Detects physical button presses by tracking attribute reports vs app commands
   */
  async _setupPhysicalButtonDetection(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    const onOffCluster = endpoint?.clusters?.onOff;

    if (!onOffCluster) {
      this.log('[SWITCH-1G] No onOff cluster on EP1 - skipping physical button setup');
      return;
    }

    // Listen for attribute reports (physical button presses)
    if (typeof onOffCluster.on === 'function') {
      onOffCluster.on('attr.onOff', (value) => {
        this.log(`[SWITCH-1G] 📥 onOff attribute report: ${value}`);
        this._handlePhysicalButtonChange(value, !this._appCommandPending);
      });
      this.log('[SWITCH-1G] ✅ Physical button detection enabled');
    }

    // Wrap capability listener to track app commands
    const originalListener = this._onOffCapabilityListener;
    this.registerCapabilityListener('onoff', async (value) => {
      this._markAppCommand();
      // Call original or use ZCL
      if (originalListener) {
        return originalListener.call(this, value);
      }
      // Fallback to ZCL onOff
      try {
        await onOffCluster[value ? 'setOn' : 'setOff']();
        return true;
      } catch (e) {
        this.error('[SWITCH-1G] ZCL onOff error:', e.message);
        throw e;
      }
    });
  }

  /**
   * v5.5.895: Handle physical button state changes and trigger flow cards
   */
  _handlePhysicalButtonChange(value, isPhysical) {
    if (this._lastOnoffState !== value) {
      this.log(`[SWITCH-1G] State: ${this._lastOnoffState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
      this._lastOnoffState = value;

      // Trigger flow cards ONLY for physical button presses
      if (isPhysical) {
        const flowCardId = value ? 'switch_1gang_physical_on' : 'switch_1gang_physical_off';
        this.log(`[SWITCH-1G] 🔘 Triggering physical flow: ${flowCardId}`);
        this.homey.flow.getDeviceTriggerCard(flowCardId)
          .trigger(this, {}, {})
          .catch(err => this.error(`[SWITCH-1G] Flow trigger error: ${err.message}`));
      }
    }
  }

  /**
   * v5.5.895: Mark that an app command was sent (to distinguish from physical)
   */
  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

  onDeleted() {
    if (this._appCommandTimeout) clearTimeout(this._appCommandTimeout);
    super.onDeleted?.();
    this.log('[SWITCH-1G] Device removed');
  }
}

module.exports = Switch1GangDevice;
