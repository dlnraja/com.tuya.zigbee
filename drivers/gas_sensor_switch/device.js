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
      // Continue with driver-specific setup
      try {
        if (this.isZclOnlyDevice) {
          this.log('[SWITCH-4G]  ZCL-ONLY MODE (BSEED/Zemismart)');
          this.zclNode = zclNode; // v5.13.2: CRITICAL - set for base class use
          await this._initZclOnlyMode(zclNode);
          return;
        }

        await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected

        // v5.5.896: Physical button detection (single/double/long/triple)
        await this.initPhysicalButtonDetection(zclNode);

        // v5.5.412: Initialize virtual buttons
        await this.initVirtualButtons();

        this.log('[SWITCH-4G] v5.5.921 - Physical button detection enabled');
      } catch (setupErr) {
        this.log('[SWITCH-4G] Setup warning:', setupErr.message);
      }

      this.log('[SWITCH-4G]  Initialized with error recovery');
    } catch (err) {
      this.error('[SWITCH-4G]  CRITICAL INIT ERROR:', err.message);
      this.error('[SWITCH-4G] Stack:', err.stack);
      this.setUnavailable('Driver initialization incomplete - try removing and re-pairing').catch(() => {});
    }
  }

  /**
   * v5.5.999: ZCL-Only mode for BSEED/Zemismart 4-gang switches
   * Fixed: Register capability listeners for ALL gangs first (before cluster check)
   * Fixed: EP2-4 virtual button toggle (diagnostic c33007b0)
   * v5.8.39: Fix EP2-4 onOff cluster not found (diag 83af3e29)
   *   Homey interview may not discover onOff on EP2-4.
   *   Fix: manually instantiate onOff cluster using Cluster.getCluster(6).
   */
  async _initZclOnlyMode(zclNode) {
    // v7.2.5: Ensure all gang capabilities are present (HOBEIAN fix)
    await this._migrateCapabilities().catch(e => this.log(`[BSEED-4G]  Migrate: ${e.message}`));

    // v5.9.15: Init lastState from capabilities (not null)  prevents first
    // periodic heartbeat report from triggering false physical flow cards
    const cs = (ep) => { try { return this.getCapabilityValue(ep === 1 ? 'onoff' : `onoff.gang${ep}`); } catch { return null; } };
    this._zclState = {
      lastState: { 1: cs(1), 2: cs(2), 3: cs(3), 4: cs(4) },
      pending: { 1: false, 2: false, 3: false, 4: false },
      timeout: { 1: null, 2: null, 3: null, 4: null },
      lastReport: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true; // v5.5.993: Flag for VirtualButtonMixin direct ZCL

    // v5.8.39: Ensure onOff cluster exists on EP2-4 even if Homey interview missed it
    this._ensureOnOffClusters(zclNode);

    // v5.9.23: GROUP ISOLATION  remove all Zigbee group memberships from each EP
    await this._removeGroupMemberships(zclNode);

    // v5.9.23: Track which gang was last commanded by the app
    this._lastCommandedGang = null;
    this._lastCommandTime = 0;

    // v5.8.51: Explicit binding for EP1-4 onOff clusters (TS0726 BSEED fix)
    await this._bindAllEndpoints(zclNode);

    // v5.5.999: Helper to get onOff cluster from endpoint with multiple lookup strategies
    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      if (!ep?.clusters) return null;
      return ep.clusters.onOff || ep.clusters.genOnOff || ep.clusters[6] || ep.clusters['6'];
    };

    // v5.13.2: Unified listener registration (Capability + Flow Cards)
    // Inherited from UnifiedSwitchBase, handles ZCL/DP fallback automatically
    this._registerCapabilityListeners();

    // v5.7.38: Setup attribute listeners for available endpoints
    const setupEndpointListener = (epNum, retryCount = 0) => {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        if (retryCount < 3) {
          this.log(`[BSEED-4G] EP${epNum} cluster not ready, retry ${retryCount + 1}/3 in 2s`);
          setTimeout(() => setupEndpointListener(epNum, retryCount + 1), 2000);
        } else {
          this.log(`[BSEED-4G] EP${epNum} no ZCL attr listener after 3 retries`);
        }
        return;
      }

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      const gangNum = epNum; // Capture for closure
      onOff.on('attr.onOff', async (value) => {
        if (this._zclState.lastState[gangNum] === value) return;
        const now = Date.now();
        if (now - (this._zclState.lastReport[gangNum] || 0) < 1000) return;
        this._zclState.lastReport[gangNum] = now;

        const isPhysical = !this._zclState.pending[gangNum];
        // v5.9.23: Filter broadcast reports for non-commanded gangs
        const isBroadcast = !isPhysical && this._lastCommandedGang
          && gangNum !== this._lastCommandedGang
          && (now - this._lastCommandTime) < 2000;
        if (isBroadcast) {
          this.log(`[BSEED-4G] EP${gangNum} attr: ${value} FILTERED (broadcast from G${this._lastCommandedGang})`);
          return;
        }
        this.log(`[BSEED-4G] EP${gangNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

        this._zclState.lastState[gangNum] = value;
        this.setCapabilityValue(capName, value).catch(() => {});

        const mode = this.sceneMode;
        if (mode === 'magic') {
          this.setCapabilityValue(capName, !value).catch(() => {});
        }

        if (isPhysical && (mode === 'auto' || mode === 'both')) {
          const flowId = `switch_4gang_physical_gang${gangNum}_${value ? 'on' : 'off'}`;
          try {
            const card = this.homey.flow.getTriggerCard(flowId);
            if (card) await card.trigger(this, { gang: gangNum, state: value }, {}).catch(() => {});
            this.log(`[BSEED-4G]  Physical G${gangNum} ${value ? 'ON' : 'OFF'}`);
          } catch (e) { }
        }

        if (isPhysical && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
          const sceneId = `switch_4gang_gang${gangNum}_scene`;
          try {
            const card = this.homey.flow.getTriggerCard(sceneId);
            if (card) await card.trigger(this, { action: value ? 'on' : 'off' }, {}).catch(() => {});
            this.log(`[BSEED-4G]  Scene G${gangNum} ${value ? 'on' : 'off'}`);
          } catch (e) { }
        }
      });
      this.log(`[BSEED-4G] EP${epNum} ZCL onOff + physical + scene detection registered`);
    };

    // Setup listeners for all endpoints
    for (const epNum of [1, 2, 3, 4]) {
      setupEndpointListener(epNum);
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-4G]  BSEED ZCL-only mode ready (packetninja technique)');
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

