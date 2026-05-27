'use strict';

// v5.5.530: Fix "Class extends value undefined" error
let UnifiedSwitchBase;
try {
  UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
  if (!UnifiedSwitchBase) throw new Error('UnifiedSwitchBase is undefined');
} catch (e) {
  console.error('[switch_4gang] UnifiedSwitchBase load failed:', e.message);
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  UnifiedSwitchBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 
 *       4-GANG SWITCH - v5.9.23 + ZCL-Only Mode (packetninja technique)        
 * 
 *   Features:                                                                   
 *   - 4 endpoints On/Off (EP1-4)                                               
 *   - Physical button detection via attribute reports                          
 *   - BSEED/Zemismart ZCL-only mode: _TZ3002_pzao9ls1, etc.                    
 *   v5.5.999: Fixed BSEED virtual button toggle for EP2-4 (diag c33007b0)      
 *   v5.9.23: GROUP ISOLATION FIX (diag 945448b9 / Hartmut_Dunker)            
 *     TS0726 FW broadcasts ZCL to all EPs (confirmed Z2M #27167, ZHA #2443)  
 *     Fix: remove group memberships + filter non-commanded gang reports       
 *   v5.11.29: ATTRIBUTE WRITE FIX (Z2M #27167, ZHA #2443, ZHA #1580)        
 *     Root cause: FW broadcasts ZCL on/off COMMANDS to all EPs internally    
 *     But routes ATTRIBUTE WRITES per-EP correctly                            
 *     Fix: writeAttributes({onOff:val}) instead of setOn()/setOff()          
 * 
 */

// ZCL-Only manufacturers (no Tuya DP)
const ZCL_ONLY_MANUFACTURERS_4G = [
  '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu', '_TZ3000_blhvsaqf',
  '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', '_TZ3000_e98krvvk',
  '_TZ3000_qkixdnon', '_TZ3000_xk5udnd6', '_TZ3000_bseed'
];

// v5.8.92: Manufacturers whose firmware broadcasts ZCL to ALL endpoints
// Fix: Use Tuya DP commands (DP1-4) for individual gang control
const FORCE_TUYA_DP_4G = [];

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
    const mfr = this.getSetting?.('zb_manufacturer_name' ) ||
                this.getStoreValue?.('zb_manufacturer_name' ) ||
                this.getStoreValue?.('manufacturerName' ) || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_4G, mfr);
  }

  async onNodeInit({ zclNode }) {
    try {
      if (this.isZclOnlyDevice) {
        this.log('[SWITCH-4G] ZCL-ONLY MODE (BSEED/Zemismart)');
        this.zclNode = zclNode;
        await this._initZclOnlyMode(zclNode);
        return; // Early return to avoid duplicate listeners!
      }

      await super.onNodeInit({ zclNode });
      await this.initPhysicalButtonDetection(zclNode);
      await this.initVirtualButtons();
      this.log('[SWITCH-4G] Initialized with physical buttons');
    } catch (err) {
      this.error('[SWITCH-4G] CRITICAL INIT ERROR:', err.message);
      this.setUnavailable('Driver initialization incomplete').catch(() => {});
    }
  }

  /**
   * ZCL-Only mode for BSEED/Zemismart 4-gang switches
   */
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

    // Track commanded gang
    this._lastCommandedGang = null;
    this._lastCommandTime = 0;

    // Helper to get cluster
    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6] || ep?.clusters?.['6'];
    };

    // Override capability listeners to track commanded gang
    for (const epNum of [1, 2, 3, 4]) {
      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-4G] EP${epNum} app cmd: ${value}`);
        this._lastCommandedGang = epNum;
        this._lastCommandTime = Date.now();
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        
        const onOff = getOnOffCluster(epNum);
        if (onOff && typeof onOff.writeAttributes === 'function') {
          try {
            await onOff.writeAttributes({ onOff: value ? true : false });
          } catch (e) {
            if (typeof onOff[value ? 'setOn' : 'setOff'] === 'function') {
              await onOff[value ? 'setOn' : 'setOff']();
            }
          }
        } else if (onOff) {
          await onOff[value ? 'setOn' : 'setOff']();
        }
        return true;
      });
    }

    // Setup attribute listeners with filtering and flows
    for (const epNum of [1, 2, 3, 4]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        this.log(`[BSEED-4G] EP${epNum} no attr listener (cluster not ready)`);
        continue;
      }

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      onOff.on('attr.onOff', async (value) => {
        const now = Date.now();
        if (now - (this._zclState.lastReport[epNum] || 0) < 1000) return;
        this._zclState.lastReport[epNum] = now;

        const isPhysical = !this._zclState.pending[epNum];
        const isBroadcast = !isPhysical && this._lastCommandedGang
          && epNum !== this._lastCommandedGang
          && (now - this._lastCommandTime) < 2000;
        if (isBroadcast) {
          this.log(`[BSEED-4G] EP${epNum} attr: ${value} FILTERED (broadcast from G${this._lastCommandedGang})`);
          return;
        }
        this.log(`[BSEED-4G] EP${epNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

        if (this._zclState.lastState[epNum] !== value) {
          this._zclState.lastState[epNum] = value;
          this.setCapabilityValue(capName, value).catch(() => {});

          const mode = this.sceneMode;
          if (mode === 'magic') {
            this.setCapabilityValue(capName, !value).catch(() => {});
          }

          if (isPhysical && (mode === 'auto' || mode === 'both')) {
            const flowId = `gas_sensor_switch_switch_4gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
            try {
              const card = this.homey.flow.getDeviceTriggerCard(flowId);
              if (card) {
                await card.trigger(this, { gang: epNum, state: value }, {}).catch(() => {});
                this.log(`[BSEED-4G] ✅ Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
              }
            } catch (e) { }
          }

          if (isPhysical && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
            const sceneId = `gas_sensor_switch_switch_4gang_gang${epNum}_scene`;
            try {
              const card = this.homey.flow.getDeviceTriggerCard(sceneId);
              if (card) {
                await card.trigger(this, { action: value ? 'on' : 'off' }, {}).catch(() => {});
                this.log(`[BSEED-4G] ✅ Scene G${epNum} ${value ? 'on' : 'off'}`);
              }
            } catch (e) { }
          }
        }
      });
      this.log(`[BSEED-4G] EP${epNum} attr listener registered`);
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-4G] BSEED ZCL-only mode ready (packetninja technique)');
  }

  /**
   * v5.8.39: Ensure onOff cluster exists on all 4 endpoints.
   */
  _ensureOnOffClusters(zclNode) {
    try {
      const { Cluster } = require('zigbee-clusters');
      const OnOffCluster = Cluster.getCluster('onOff') || Cluster.getCluster(6);
      if (!OnOffCluster) return;

      for (const epNum of [1, 2, 3, 4]) {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep) continue;
        if (!ep.clusters) ep.clusters = {};

        const existing = ep.clusters.onOff || ep.clusters.genOnOff
          || ep.clusters[6] || ep.clusters['6'];
        if (existing) continue;

        let clusterInstance = null;
        try {
          clusterInstance = new OnOffCluster(ep );
        } catch (e1) {
          try { clusterInstance = new OnOffCluster({ endpoint: ep }); } catch (e2) { }
        }
        if (clusterInstance) {
          const name = OnOffCluster.NAME || 'onOff';
          ep.clusters[name] = clusterInstance;
          if (!ep.clusters[6]) ep.clusters[6] = clusterInstance;
          if (!ep.clusters['6']) ep.clusters['6'] = clusterInstance;
          this.log(`[BSEED-4G]  EP${epNum} onOff cluster CREATED manually`);
        }
      }
    } catch (err) { }
  }

  /**
   * v5.9.23: Remove Zigbee group memberships to fix TS0726 broadcast bug.
   */
  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2, 3, 4]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) continue;
        const g = ep.clusters.groups || ep.clusters.genGroups || ep.clusters[4] || ep.clusters['4'];
        if (!g) continue;
        const fn = g.removeAll || g.removeAllGroups;
        if (typeof fn === 'function') {
          await fn.call(g).catch(() => {});
          this.log(`[BSEED-4G] EP${epNum}  Group memberships removed` );
        }
      } catch (err) { }
    }
  }

  /**
   * v5.8.51: Explicitly bind onOff cluster on all endpoints
   */
  async _bindAllEndpoints(zclNode) {
    for (const epNum of [1, 2, 3, 4]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) continue;
        const onOff = ep.clusters.onOff || ep.clusters.genOnOff || ep.clusters[6] || ep.clusters['6'];
        if (onOff && typeof onOff.bind === 'function') {
          await onOff.bind().catch(() => {});
          this.log(`[BSEED-4G] EP${epNum} onOff cluster bound` );
        }
      } catch (err) { }
    }

    for (const epNum of [1, 2, 3, 4]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) continue;
        const onOff = ep.clusters.onOff || ep.clusters.genOnOff || ep.clusters[6] || ep.clusters['6'];
        if (onOff && typeof onOff.configureReporting === 'function') {
          await onOff.configureReporting({
            onOff: { minInterval: 0, maxInterval: 300, minChange: 1 }
          }).catch(() => {});
          this.log(`[BSEED-4G] EP${epNum}  Attr reporting configured directly`);
        }
      } catch (err) { }
    }
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (const epNum of [1, 2, 3, 4]) {
        if (this._zclState.timeout[epNum]) clearTimeout(this._zclState.timeout[epNum]);
      }
    }
    super.onDeleted?.();
  }
}
module.exports = Switch4GangDevice;

