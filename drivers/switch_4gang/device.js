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
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      4-GANG SWITCH - v5.5.999 + ZCL-Only Mode (packetninja technique)        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                   ║
 * ║  - 4 endpoints On/Off (EP1-4)                                               ║
 * ║  - Physical button detection via attribute reports                          ║
 * ║  - BSEED/Zemismart ZCL-only mode: _TZ3002_pzao9ls1, etc.                    ║
 * ║  v5.5.999: Fixed BSEED virtual button toggle for EP2-4 (diag c33007b0)      ║
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
    return includesCI(ZCL_ONLY_MANUFACTURERS_4G, mfr);
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
   * v5.5.999: ZCL-Only mode for BSEED/Zemismart 4-gang switches
   * Fixed: Register capability listeners for ALL gangs first (before cluster check)
   * Fixed: EP2-4 virtual button toggle (diagnostic c33007b0)
   */
  async _initZclOnlyMode(zclNode) {
    this._zclState = {
      lastState: { 1: null, 2: null, 3: null, 4: null },
      pending: { 1: false, 2: false, 3: false, 4: false },
      timeout: { 1: null, 2: null, 3: null, 4: null }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true; // v5.5.993: Flag for VirtualButtonMixin direct ZCL

    // v5.5.999: Helper to get onOff cluster from endpoint with multiple lookup strategies
    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      if (!ep?.clusters) return null;
      return ep.clusters.onOff || ep.clusters.genOnOff || ep.clusters[6] || ep.clusters['6'];
    };

    // v5.5.999: Register capability listeners for ALL gangs
    // These listeners send ZCL commands to control the switch
    for (const epNum of [1, 2, 3, 4]) {
      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      
      // v5.5.999: Use arrow function to capture epNum correctly in closure
      const gangNum = epNum;
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-4G] EP${gangNum} app cmd: ${value}`);
        
        // v5.5.999: Use PhysicalButtonMixin markAppCommand for state tracking (packetninja pattern)
        this.markAppCommand?.(gangNum, value);
        
        this._zclState.pending[gangNum] = true;
        clearTimeout(this._zclState.timeout[gangNum]);
        this._zclState.timeout[gangNum] = setTimeout(() => {
          this._zclState.pending[gangNum] = false;
        }, 2000);
        
        // v5.5.999: Try to get cluster at command time (may be available now even if wasn't at init)
        const onOff = getOnOffCluster(gangNum);
        if (onOff && typeof onOff[value ? 'setOn' : 'setOff'] === 'function') {
          await onOff[value ? 'setOn' : 'setOff']();
          this.log(`[BSEED-4G] EP${gangNum} ZCL ${value ? 'ON' : 'OFF'} sent`);
        } else {
          this.log(`[BSEED-4G] EP${gangNum} onOff cluster not found - command not sent`);
          // v5.5.999: Still update capability value for UI consistency
        }
        return true;
      });
      this.log(`[BSEED-4G] EP${epNum} capability listener registered for ${capName}`);
    }

    // Setup attribute listeners for available endpoints
    for (const epNum of [1, 2, 3, 4]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        this.log(`[BSEED-4G] EP${epNum} no attr listener (cluster not ready)`);
        continue;
      }

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      const gangNum = epNum; // v5.5.999: Capture for closure
      onOff.on('attr.onOff', (value) => {
        const isPhysical = !this._zclState.pending[gangNum];
        this.log(`[BSEED-4G] EP${gangNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
        
        if (this._zclState.lastState[gangNum] !== value) {
          this._zclState.lastState[gangNum] = value;
          this.setCapabilityValue(capName, value).catch(() => {});
          
          if (isPhysical) {
            const flowId = `switch_4gang_physical_gang${gangNum}_${value ? 'on' : 'off'}`;
            this.homey.flow.getDeviceTriggerCard(flowId)
              .trigger(this, { gang: gangNum, state: value }, {})
              .catch(() => {});
            this.log(`[BSEED-4G] 🔘 Physical G${gangNum} ${value ? 'ON' : 'OFF'}`);
          }
        }
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
   * v5.5.962: Added deduplication to prevent duplicate flow triggers
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
        // v5.5.962: Deduplicate flow triggers (500ms window)
        const dedupKey = `${capability}_${value}`;
        const now = Date.now();
        if (this._lastFlowTrigger?.[dedupKey] && now - this._lastFlowTrigger[dedupKey] < 500) {
          return; // Skip duplicate trigger
        }
        this._lastFlowTrigger = this._lastFlowTrigger || {};
        this._lastFlowTrigger[dedupKey] = now;
        
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
