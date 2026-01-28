'use strict';

// v5.5.530: Fix "Class extends value undefined" error
let HybridSwitchBase;
try {
  HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
  if (!HybridSwitchBase) throw new Error('HybridSwitchBase is undefined');
} catch (e) {
  console.error('[switch_4gang] HybridSwitchBase load failed:', e.message);
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  HybridSwitchBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      4-GANG SWITCH - v5.5.921 + ZCL-Only Mode (packetninja technique)        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                   ║
 * ║  - 4 endpoints On/Off (EP1-4)                                               ║
 * ║  - Physical button detection via attribute reports                          ║
 * ║  - BSEED/Zemismart ZCL-only mode: _TZ3002_pzao9ls1, etc.                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ZCL-Only manufacturers (no Tuya DP)
const ZCL_ONLY_MANUFACTURERS_4G = [
  '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu', '_TZ3000_blhvsaqf',
  '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', '_TZ3000_e98krvvk'
];

const BaseClass = typeof HybridSwitchBase === 'function' 
  ? PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) 
  : HybridSwitchBase;

class Switch4GangDevice extends BaseClass {
  get gangCount() { return 4; }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') ||
                this.getStoreValue?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') || '';
    return ZCL_ONLY_MANUFACTURERS_4G.some(b => mfr.toLowerCase().includes(b.toLowerCase()));
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-4G] 🔵 ZCL-ONLY MODE (BSEED/Zemismart)');
      await this._initZclOnlyMode(zclNode);
      return;
    }

    await super.onNodeInit({ zclNode });

    // v5.5.896: Physical button detection (single/double/long/triple)
    await this.initPhysicalButtonDetection?.(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons?.();

    this.log('[SWITCH-4G] v5.5.921 - Physical button detection enabled');
  }

  /**
   * v5.5.921: ZCL-Only mode for BSEED/Zemismart 4-gang switches
   * Enhanced with physical button flow triggers (packetninja technique)
   */
  async _initZclOnlyMode(zclNode) {
    // State tracking per endpoint
    this._zclState = {
      lastState: { 1: null, 2: null, 3: null, 4: null },
      pending: { 1: false, 2: false, 3: false, 4: false },
      timeout: { 1: null, 2: null, 3: null, 4: null }
    };

    // Setup all 4 endpoints with physical button detection
    for (const epNum of [1, 2, 3, 4]) {
      const ep = zclNode?.endpoints?.[epNum];
      const onOff = ep?.clusters?.onOff;
      if (!onOff) continue;

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      
      // Listen for attribute reports (physical button presses)
      if (typeof onOff.on === 'function') {
        onOff.on('attr.onOff', (value) => {
          const isPhysical = !this._zclState.pending[epNum];
          this.log(`[BSEED-4G] EP${epNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
          
          if (this._zclState.lastState[epNum] !== value) {
            this._zclState.lastState[epNum] = value;
            this.setCapabilityValue(capName, value).catch(() => {});
            
            // Trigger flow cards for PHYSICAL button presses only
            if (isPhysical) {
              const flowId = `switch_4gang_gang${epNum}_physical_${value ? 'on' : 'off'}`;
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, { gang: epNum, state: value }, {})
                .catch(() => {});
              this.log(`[BSEED-4G] 🔘 Physical button G${epNum} ${value ? 'ON' : 'OFF'}`);
            }
          }
        });
      }

      // Register capability listener for app commands
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-4G] EP${epNum} app cmd: ${value}`);
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        await onOff[value ? 'setOn' : 'setOff']();
        return true;
      });

      this.log(`[BSEED-4G] EP${epNum} ZCL onOff + physical detection registered`);
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-4G] ✅ BSEED ZCL-only mode ready (packetninja technique)');
  }

  /**
   * Handle capability changes and trigger appropriate flow cards
   */
  async _onCapabilityChanged(capability, value, gang) {
    try {
      this.log(`[SWITCH-4G] Gang ${gang} ${capability}: ${value}`);

      // Get the appropriate trigger from driver
      const triggerName = `switch_4gang_gang${gang}_turned_${value ? 'on' : 'off'}`;
      const trigger = this.driver[`gang${gang}${value ? 'On' : 'Off'}Trigger`];

      if (trigger) {
        await trigger.trigger(this, {
          gang: gang,
          state: value
        }, {});
        this.log(`[SWITCH-4G] 🎯 Triggered flow: ${triggerName}`);
      } else {
        this.log(`[SWITCH-4G] ⚠️ Flow trigger not found: ${triggerName}`);
      }

    } catch (err) {
      this.log('[SWITCH-4G] ⚠️ Error triggering flow:', err.message);
    }
  }

  /**
   * Override setCapabilityValue to also trigger flows for external changes
   */
  async setCapabilityValue(capability, value) {
    const oldValue = this.getCapabilityValue(capability);
    await super.setCapabilityValue(capability, value);

    // Only trigger if value actually changed (and not ZCL-only mode which has its own triggers)
    if (oldValue !== value && !this.isZclOnlyDevice) {
      let gang = 1;
      if (capability === 'onoff.gang2') gang = 2;
      else if (capability === 'onoff.gang3') gang = 3;
      else if (capability === 'onoff.gang4') gang = 4;

      if (['onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4'].includes(capability)) {
        await this._onCapabilityChanged(capability, value, gang);
      }
    }
  }

  onDeleted() {
    // ZCL-only cleanup
    if (this._zclState?.timeout) {
      for (const epNum of [1, 2, 3, 4]) {
        if (this._zclState.timeout[epNum]) clearTimeout(this._zclState.timeout[epNum]);
      }
    }
    super.onDeleted?.();
  }
}
module.exports = Switch4GangDevice;
