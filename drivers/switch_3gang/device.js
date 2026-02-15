'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 3-GANG SWITCH - v5.9.23 + ZCL-Only Mode (BSEED)
 * Physical button detection: single/double/long/triple per gang
 * BSEED ZCL-only mode: _TZ3000_qkixdnon (Pieter_Pessers forum)
 * v5.9.23: GROUP ISOLATION FIX — remove group memberships + broadcast filter
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

    // v5.9.23: GROUP ISOLATION — remove all Zigbee group memberships per EP
    await this._removeGroupMemberships(zclNode);

    // v5.9.23: Track which gang was last commanded by the app
    this._lastCommandedGang = null;
    this._lastCommandTime = 0;

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
    };

    // v5.5.990: Register capability listeners FIRST (packetninja fix)
    for (const epNum of [1, 2, 3]) {
      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-3G] EP${epNum} app cmd: ${value}`);
        // v5.9.23: Track which gang the user actually commanded
        this._lastCommandedGang = epNum;
        this._lastCommandTime = Date.now();
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
        const now = Date.now();
        const isPhysical = !this._zclState.pending[epNum];

        // v5.9.23: Filter broadcast reports for non-commanded gangs
        const isBroadcast = !isPhysical && this._lastCommandedGang
          && epNum !== this._lastCommandedGang
          && (now - this._lastCommandTime) < 2000;
        if (isBroadcast) {
          this.log(`[BSEED-3G] EP${epNum} attr: ${value} FILTERED (broadcast from G${this._lastCommandedGang})`);
          return;
        }
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

    // v5.8.72: PacketNinja pattern — configure onOff reporting per endpoint
    for (const epNum of [1, 2, 3]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.configureReporting === 'function') {
        try {
          await onOff.configureReporting({
            onOff: { minInterval: 0, maxInterval: 300, minChange: 1 }
          });
          this.log(`[BSEED-3G] ✅ EP${epNum} onOff reporting configured`);
        } catch (err) {
          this.log(`[BSEED-3G] EP${epNum} configureReporting failed: ${err.message}`);
        }
      }
    }

    // v5.8.72: PacketNinja pattern — read initial onOff state per endpoint
    for (const epNum of [1, 2, 3]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.readAttributes === 'function') {
        try {
          const state = await onOff.readAttributes(['onOff']);
          if (state.onOff !== undefined) {
            const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
            this._zclState.lastState[epNum] = state.onOff;
            await this.setCapabilityValue(capName, state.onOff).catch(() => {});
            this.log(`[BSEED-3G] EP${epNum} initial state: ${state.onOff ? 'ON' : 'OFF'}`);
          }
        } catch (err) {
          this.log(`[BSEED-3G] EP${epNum} initial state read failed: ${err.message}`);
        }
      }
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-3G] ✅ BSEED ZCL-only mode ready (packetninja v990+v5.8.72)');
  }

  /**
   * v5.9.23: Remove Zigbee group memberships to fix BSEED broadcast bug.
   */
  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2, 3]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) continue;
        const g = ep.clusters.groups || ep.clusters.genGroups || ep.clusters[4] || ep.clusters['4'];
        if (!g) { this.log(`[BSEED-3G] EP${epNum} no groups cluster`); continue; }
        const fn = g.removeAll || g.removeAllGroups;
        if (typeof fn === 'function') {
          await fn.call(g).catch(e => this.log(`[BSEED-3G] EP${epNum} removeAll warn: ${e.message}`));
          this.log(`[BSEED-3G] EP${epNum} group memberships removed`);
        } else {
          this.log(`[BSEED-3G] EP${epNum} no removeAll on groups`);
        }
      } catch (err) { this.log(`[BSEED-3G] EP${epNum} group err: ${err.message}`); }
    }
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
