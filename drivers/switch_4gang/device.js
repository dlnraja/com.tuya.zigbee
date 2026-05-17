'use strict';

let UnifiedSwitchBase;
try {
  UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
  if (!UnifiedSwitchBase) throw new Error('UnifiedSwitchBase is undefined');
} catch (e) {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  UnifiedSwitchBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 4-GANG SWITCH - v5.9.23
 */

const ZCL_ONLY_MANUFACTURERS_4G = [
  '_TZ302_pzao9ls1', '_TZ3002_vaq2bfcu', '_TZ3000_blhvsaqf',
  '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', '_TZ3000_e98krvvk',
  '_TZ3000_qkixdnon', '_TZ3000_xk5udnd6', '_TZ3000_bseed'
];

const BaseClass = typeof UnifiedSwitchBase === 'function' 
  ? PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))
  : UnifiedSwitchBase;

class Switch4GangDevice extends BaseClass {
  get gangCount() { return 4; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get isZclOnlyDevice() {
    const mfr = this.getSetting('zb_manufacturer_name') ||
                this.getStoreValue('zb_manufacturer_name') ||
                this.getStoreValue('manufacturerName') || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_4G, mfr);
  }

  async onNodeInit({ zclNode }) {
    try {
      if (this.isZclOnlyDevice) {
        this.log('[SWITCH-4G] ZCL-ONLY MODE');
        this.zclNode = zclNode;
        await this._initZclOnlyMode(zclNode);
      } else {
        await super.onNodeInit({ zclNode });
      }

      await this.initPhysicalButtonDetection(zclNode);
      await this.initVirtualButtons();
      this.log('[SWITCH-4G] Initialized');
    } catch (err) {
      this.error('[SWITCH-4G] CRITICAL INIT ERROR:', err.message);
      this.setUnavailable('Driver initialization incomplete').catch(() => {});
    }
  }

  async _initZclOnlyMode(zclNode) {
    await this._migrateCapabilities().catch(() => {});

    const cs = (ep) => { try { return this.getCapabilityValue(ep === 1 ? 'onoff' : `onoff.gang${ep}`); } catch { return null; } };
    this._zclState = {
      lastState: { 1: cs(1), 2: cs(2), 3: cs(3), 4: cs(4) },
      pending: { 1: false, 2: false, 3: false, 4: false },
      timeout: { 1: null, 2: null, 3: null, 4: null },
      lastReport: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true;

    this._ensureOnOffClusters(zclNode);
    await this._removeGroupMemberships(zclNode);
    await this._bindAllEndpoints(zclNode);

    this._registerCapabilityListeners();

    for (const epNum of [1, 2, 3, 4]) {
      const ep = zclNode.endpoints[epNum];
      const onOff = ep?.clusters.onOff || ep?.clusters.genOnOff;
      if (!onOff) continue;

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      onOff.on('attr.onOff', (value) => {
        if (this._zclState.lastState[epNum] !== value) {
          this._zclState.lastState[epNum] = value;
          this.setCapabilityValue(capName, value).catch(() => {});
        }
      });
    }

    await this.initVirtualButtons?.();
  }

  _ensureOnOffClusters(zclNode) {
    try {
      const { Cluster } = require('zigbee-clusters');
      const OnOffCluster = Cluster.getCluster('onOff') || Cluster.getCluster(6);
      if (!OnOffCluster) return;

      for (const epNum of [1, 2, 3, 4]) {
        const ep = zclNode.endpoints[epNum];
        if (!ep) continue;
        if (!ep.clusters.onOff && !ep.clusters.genOnOff && !ep.clusters[6]) {
          ep.clusters.onOff = new OnOffCluster(ep);
        }
      }
    } catch (err) { }
  }

  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2, 3, 4]) {
      try {
        const ep = zclNode.endpoints[epNum];
        const g = ep?.clusters.groups || ep?.clusters.genGroups;
        if (typeof g?.removeAll === 'function') await g.removeAll().catch(() => {});
      } catch (err) { }
    }
  }

  async _bindAllEndpoints(zclNode) {
    for (const epNum of [1, 2, 3, 4]) {
      try {
        const ep = zclNode.endpoints[epNum];
        const onOff = ep?.clusters.onOff || ep?.clusters.genOnOff;
        if (onOff?.bind) await onOff.bind().catch(() => {});
        if (onOff?.configureReporting) {
          await onOff.configureReporting({
            onOff: { minInterval: 0, maxInterval: 300, minChange: 1 }
          }).catch(() => {});
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

module.exports = Switch4GangDevice;
