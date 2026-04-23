'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 3-GANG SWITCH - v5.9.23
 */

const ZCL_ONLY_MANUFACTURERS_3G = [
  '_TZ3000_qkixdnon', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'
];

class Switch3GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
  get gangCount() { return 3; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get isZclOnlyDevice() {
    const mfr = this.getSetting('zb_manufacturer_name') ||
                this.getStoreValue('zb_manufacturer_name') ||
                this.getStoreValue('manufacturerName') || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_3G, mfr);
  }

  async onNodeInit({ zclNode }) {
    try {
      if (this.isZclOnlyDevice) {
        this.log('[SWITCH-3G] ZCL-ONLY MODE');
        this.zclNode = zclNode;
        await this._initZclOnlyMode(zclNode);
      } else {
        await super.onNodeInit({ zclNode });
      }

      await this.initPhysicalButtonDetection(zclNode);
      await this.initVirtualButtons();
      this.log('[SWITCH-3G] Initialized');
    } catch (err) {
      this.error('[SWITCH-3G] CRITICAL INIT ERROR:', err.message);
      this.setUnavailable('Driver initialization incomplete').catch(() => {});
    }
  }

  async _initZclOnlyMode(zclNode) {
    await this._migrateCapabilities().catch(() => {});

    this._zclState = {
      lastState: { 1: null, 2: null, 3: null },
      pending: { 1: false, 2: false, 3: false },
      timeout: { 1: null, 2: null, 3: null }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true;

    await this._removeGroupMemberships(zclNode);

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode.endpoints[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff;
    };

    this._registerCapabilityListeners();

    for (const epNum of [1, 2, 3]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff) continue;

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      onOff.on('attr.onOff', async (value) => {
        if (this._zclState.lastState[epNum] !== value) {
          this._zclState.lastState[epNum] = value;
          this.setCapabilityValue(capName, value).catch(() => {});
          
          const mode = this.sceneMode;
          if (mode === 'magic') {
            this.setCapabilityValue(capName, !value).catch(() => {});
          }
          
          const isPhysical = !this._zclState.pending[epNum];
          if (isPhysical && (mode === 'auto' || mode === 'both')) {
            const flowId = `switch_3gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
            this.driver?.homey?.flow?.getTriggerCard(flowId)?.trigger(this, { gang: epNum, state: value }).catch(() => {});
          }
        }
      });
    }

    // Configure reporting
    for (const epNum of [1, 2, 3]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff?.configureReporting) {
        await onOff.configureReporting({
          onOff: { minInterval: 0, maxInterval: 300, minChange: 1 }
        }).catch(() => {});
      }
    }

    await this.initVirtualButtons?.();
  }

  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2, 3]) {
      try {
        const ep = zclNode.endpoints[epNum];
        const g = ep?.clusters?.groups || ep?.clusters?.genGroups;
        if (typeof g?.removeAll === 'function') {
          await g.removeAll().catch(() => {});
        }
      } catch (err) { }
    }
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (const epNum in this._zclState.timeout) {
        if (this._zclState.timeout[epNum]) clearTimeout(this._zclState.timeout[epNum]);
      }
    }
    super.onDeleted?.();
  }
}

module.exports = Switch3GangDevice;
