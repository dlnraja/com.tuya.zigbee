'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
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

class Switch5GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
  get gangCount() { return 5; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name' ) ||
                this.getStoreValue?.('manufacturerName' ) || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_5G, mfr);
  }

  async onNodeInit({ zclNode }) {
    this.initPhysicalButtonDetection(); // rule-19 injected
    
    this._registerCapabilityListeners(); // rule-12a injected
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-5G]  ZCL-ONLY MODE');
      this.zclNode = zclNode; // v5.13.2: CRITICAL - set for base class use
      await this._initZclOnlyMode(zclNode);
      return;
    }
    await this.initPhysicalButtonDetection?.(zclNode );
    await this.initVirtualButtons?.();
    this.log('[SWITCH-5G] v5.5.922  Ready' );
  }

  /**
   * v5.5.990: ZCL-Only mode - capability listeners FIRST (packetninja fix)
   */
  async _initZclOnlyMode(zclNode) {
    this._zclState = { lastState: {}, pending: {}, timeout: {} };
    this._zclNode = zclNode;
    for (let i = 1; i <= 5; i++) {
      this._zclState.lastState[i] = null;
      this._zclState.pending[i] = false;
      this._zclState.timeout[i] = null;
    }

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6] || null;
    };

    // Register capability listeners FIRST
    for (const epNum of [1, 2, 3, 4, 5]) {
      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      this.registerCapabilityListener(capName, async (value) => {
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        const onOff = getOnOffCluster(epNum);
        if (onOff) await onOff[value ? 'setOn' : 'setOff']();
        return true;
      });
    }

    // Setup attribute listeners for physical button detection
    for (const epNum of [1, 2, 3, 4, 5]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') continue;

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      onOff.on('attr.onOff', async (value) => {
        const isPhysical = !this._zclState.pending[epNum];
        if (this._zclState.lastState[epNum] !== value) {
          this._zclState.lastState[epNum] = value;
          this.setCapabilityValue(capName, value).catch(() => {});
          // v5.12.5: Scene mode support
          const mode = this.sceneMode;
          if (mode === 'magic') {
            this.setCapabilityValue(capName, !value).catch(() => {});
          }
          if (isPhysical && (mode === 'auto' || mode === 'both')) {
            const flowId = `switch_wall_5gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
            try {
              const card =
      this.homey.flow.getTriggerCard(flowId)?.trigger(this, {}, {}).catch(this.error || console.error)
              if (card ) await card.trigger(this, { gang: epNum, state: value }, {}).catch(() => {});
              this.log(`[SWITCH-5G]  Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
            } catch (e) { }
          }
          if (isPhysical && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
            const sceneId = `switch_wall_5gang_gang${epNum}_scene`;
            try {
              const card =
      this.homey.flow.getTriggerCard(sceneId)?.trigger(this, {}, {}).catch(this.error || console.error)
              if (card ) await card.trigger(this , { action: value ? 'on' : 'off' }, {}).catch(() => {});
              this.log(`[SWITCH-5G]  Scene G${epNum} ${value ? 'on' : 'off'}`);
            } catch (e) { }
          }
        }
      });
    }
    await this.initVirtualButtons?.();
    this.log('[SWITCH-5G]  ZCL-only mode ready (packetninja v990)');
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (let i = 1; i <= 5; i++) {
        if (this._zclState.timeout[i]) clearTimeout(this._zclState.timeout[i] );
      }
    }
    super.onDeleted?.();
  }
}
module.exports = Switch5GangDevice;


