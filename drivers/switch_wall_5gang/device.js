'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 5-GANG SWITCH - v5.5.922 + ZCL-Only Mode (packetninja technique)
 * Physical button detection via attribute reports
 */
const ZCL_ONLY_MANUFACTURERS_5G = [
  '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare'
];

class Switch5GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  get gangCount() { return 5; }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_5G, mfr);
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-5G] 🔵 ZCL-ONLY MODE');
      await this._initZclOnlyMode(zclNode);
      return;
    }
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection?.(zclNode);
    await this.initVirtualButtons?.();
    this.log('[SWITCH-5G] v5.5.922 ✅ Ready');
  }

  async _initZclOnlyMode(zclNode) {
    this._zclState = {
      lastState: {}, pending: {}, timeout: {}
    };
    for (let i = 1; i <= 5; i++) {
      this._zclState.lastState[i] = null;
      this._zclState.pending[i] = false;
      this._zclState.timeout[i] = null;
    }

    for (const epNum of [1, 2, 3, 4, 5]) {
      const ep = zclNode?.endpoints?.[epNum];
      const onOff = ep?.clusters?.onOff;
      if (!onOff) continue;

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      
      if (typeof onOff.on === 'function') {
        onOff.on('attr.onOff', (value) => {
          const isPhysical = !this._zclState.pending[epNum];
          if (this._zclState.lastState[epNum] !== value) {
            this._zclState.lastState[epNum] = value;
            this.setCapabilityValue(capName, value).catch(() => {});
            if (isPhysical) {
              const flowId = `switch_wall_5gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, { gang: epNum, state: value }, {}).catch(() => {});
              this.log(`[SWITCH-5G] 🔘 Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
            }
          }
        });
      }

      this.registerCapabilityListener(capName, async (value) => {
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        await onOff[value ? 'setOn' : 'setOff']();
        return true;
      });
    }
    await this.initVirtualButtons?.();
    this.log('[SWITCH-5G] ✅ ZCL-only mode ready');
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (let i = 1; i <= 5; i++) {
        if (this._zclState.timeout[i]) clearTimeout(this._zclState.timeout[i]);
      }
    }
    super.onDeleted?.();
  }
}
module.exports = Switch5GangDevice;
