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
   * v5.5.990: ZCL-Only mode for BSEED 3-gang switches
   * Fixed: Register capability listeners FIRST (before attr listeners)
   * Enhanced with physical button flow triggers (packetninja technique)
   */
  async _initZclOnlyMode(zclNode) {
    this._zclState = {
      lastState: { 1: null, 2: null, 3: null },
      pending: { 1: false, 2: false, 3: false },
      timeout: { 1: null, 2: null, 3: null }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true; // v5.5.993: Flag for VirtualButtonMixin direct ZCL

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
    };

    // v5.5.990: Register capability listeners FIRST (packetninja fix)
    for (const epNum of [1, 2, 3]) {
      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-3G] EP${epNum} app cmd: ${value}`);
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        
        const onOff = getOnOffCluster(epNum);
        if (onOff) {
          await onOff[value ? 'setOn' : 'setOff']();
        } else {
          this.log(`[BSEED-3G] EP${epNum} onOff cluster not found`);
        }
        return true;
      });
      this.log(`[BSEED-3G] EP${epNum} capability listener registered`);
    }

    // Setup attribute listeners for physical button detection
    for (const epNum of [1, 2, 3]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        this.log(`[BSEED-3G] EP${epNum} no attr listener (cluster not ready)`);
        continue;
      }

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      onOff.on('attr.onOff', (value) => {
        const isPhysical = !this._zclState.pending[epNum];
        this.log(`[BSEED-3G] EP${epNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
        
        if (this._zclState.lastState[epNum] !== value) {
          this._zclState.lastState[epNum] = value;
          this.setCapabilityValue(capName, value).catch(() => {});
          
          if (isPhysical) {
            const flowId = `switch_3gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
            this.homey.flow.getDeviceTriggerCard(flowId)
              .trigger(this, { gang: epNum, state: value }, {})
              .catch(() => {});
            this.log(`[BSEED-3G] 🔘 Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
          }
        }
      });
      this.log(`[BSEED-3G] EP${epNum} attr listener registered`);
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-3G] ✅ BSEED ZCL-only mode ready (packetninja v990)');
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (const epNum of [1, 2, 3]) {
        if (this._zclState.timeout[epNum]) clearTimeout(this._zclState.timeout[epNum]);
      }
    }
    super.onDeleted?.();
  }
}
module.exports = Switch3GangDevice;
