'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 7-GANG SWITCH - v5.5.922 + ZCL-Only Mode (packetninja technique)
 * Physical button detection via attribute reports
 */
const ZCL_ONLY_MANUFACTURERS_7G = [
  '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare'
];

class Switch7GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  get gangCount() { return 7; }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') || '';
    return ZCL_ONLY_MANUFACTURERS_7G.some(b => mfr.toLowerCase().includes(b.toLowerCase()));
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-7G] 🔵 ZCL-ONLY MODE');
      await this._initZclOnlyMode(zclNode);
      return;
    }
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection?.(zclNode);
    await this.initVirtualButtons?.();
    this.log('[SWITCH-7G] v5.5.922 ✅ Ready');
  }

  async _initZclOnlyMode(zclNode) {
    this._zclState = { lastState: {}, pending: {}, timeout: {} };
    for (let i = 1; i <= 7; i++) {
      this._zclState.lastState[i] = null;
      this._zclState.pending[i] = false;
      this._zclState.timeout[i] = null;
    }

    for (const epNum of [1, 2, 3, 4, 5, 6, 7]) {
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
              const flowId = `switch_wall_7gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, { gang: epNum, state: value }, {}).catch(() => {});
              this.log(`[SWITCH-7G] 🔘 Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
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
    this.log('[SWITCH-7G] ✅ ZCL-only mode ready');
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (let i = 1; i <= 7; i++) {
        if (this._zclState.timeout[i]) clearTimeout(this._zclState.timeout[i]);
      }
    }
    super.onDeleted?.();
  }
}
module.exports = Switch7GangDevice;
