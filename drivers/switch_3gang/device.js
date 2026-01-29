'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 3-GANG SWITCH - v5.5.919 + ZCL-Only Mode (BSEED)
 * Physical button detection: single/double/long/triple per gang
 * BSEED ZCL-only mode: _TZ3000_qkixdnon (Pieter_Pessers forum)
 */

// ZCL-Only manufacturers (no Tuya DP) - forum: Pieter_Pessers BSEED 3-gang
const ZCL_ONLY_MANUFACTURERS_3G = [
  '_TZ3000_qkixdnon', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'
];

class Switch3GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  get gangCount() { return 3; }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') ||
                this.getStoreValue?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_3G, mfr);
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-3G] 🔵 ZCL-ONLY MODE (BSEED)');
      await this._initZclOnlyMode(zclNode);
      return;
    }
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[SWITCH-3G] v5.5.919 - Physical button detection enabled');
  }

  /**
   * v5.5.921: ZCL-Only mode for BSEED 3-gang switches
   * Enhanced with physical button flow triggers (packetninja technique)
   * Forum: Pieter_Pessers - _TZ3000_qkixdnon TS0003
   */
  async _initZclOnlyMode(zclNode) {
    // State tracking per endpoint
    this._zclState = {
      lastState: { 1: null, 2: null, 3: null },
      pending: { 1: false, 2: false, 3: false },
      timeout: { 1: null, 2: null, 3: null }
    };

    // Setup all 3 endpoints with physical button detection
    for (const epNum of [1, 2, 3]) {
      const ep = zclNode?.endpoints?.[epNum];
      const onOff = ep?.clusters?.onOff;
      if (!onOff) continue;

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      
      // Listen for attribute reports (physical button presses)
      if (typeof onOff.on === 'function') {
        onOff.on('attr.onOff', (value) => {
          const isPhysical = !this._zclState.pending[epNum];
          this.log(`[BSEED-3G] EP${epNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
          
          if (this._zclState.lastState[epNum] !== value) {
            this._zclState.lastState[epNum] = value;
            this.setCapabilityValue(capName, value).catch(() => {});
            
            // Trigger flow cards for PHYSICAL button presses only
            if (isPhysical) {
              const flowId = `switch_3gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, { gang: epNum, state: value }, {})
                .catch(() => {});
              this.log(`[BSEED-3G] 🔘 Physical button G${epNum} ${value ? 'ON' : 'OFF'}`);
            }
          }
        });
      }

      // Register capability listener for app commands
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-3G] EP${epNum} app cmd: ${value}`);
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        await onOff[value ? 'setOn' : 'setOff']();
        return true;
      });

      this.log(`[BSEED-3G] EP${epNum} ZCL onOff + physical detection registered`);
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-3G] ✅ BSEED ZCL-only mode ready (packetninja technique)');
  }

  onDeleted() {
    if (this._zclState?.timeout) clearTimeout(this._zclState.timeout);
    super.onDeleted?.();
  }
}
module.exports = Switch3GangDevice;
