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
   * v5.8.39: Fix EP2-4 onOff cluster not found (diag 83af3e29)
   *   Homey interview may not discover onOff on EP2-4.
   *   Fix: manually instantiate onOff cluster using Cluster.getCluster(6).
   */
  async _initZclOnlyMode(zclNode) {
    this._zclState = {
      lastState: { 1: null, 2: null, 3: null, 4: null },
      pending: { 1: false, 2: false, 3: false, 4: false },
      timeout: { 1: null, 2: null, 3: null, 4: null }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true; // v5.5.993: Flag for VirtualButtonMixin direct ZCL

    // v5.8.39: Ensure onOff cluster exists on EP2-4 even if Homey interview missed it
    // Root cause: Endpoint constructor only creates clusters from descriptor.inputClusters.
    // If interview didn't include cluster 6 in EP2-4 descriptors, the cluster is never created.
    // Fix: Use Cluster.getCluster(6) to get the OnOff class and instantiate it manually.
    this._ensureOnOffClusters(zclNode);

    // v5.8.51: Explicit binding for EP1-4 onOff clusters (TS0726 BSEED fix - Hartmut_Dunker)
    // Root cause: TS0726 doesn't send attr reports for EP2-4 without explicit binding.
    // The requiresExplicitBinding flag from PhysicalButtonMixin is not checked in ZCL-only path.
    await this._bindAllEndpoints(zclNode);

    // v5.5.999: Helper to get onOff cluster from endpoint with multiple lookup strategies
    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      if (!ep?.clusters) return null;
      return ep.clusters.onOff || ep.clusters.genOnOff || ep.clusters[6] || ep.clusters['6'];
    };

    // v5.8.26: Helper to get Tuya cluster on EP1 for DP fallback (BSEED EP2-4 fix)
    const getTuyaCluster = () => {
      const ep1 = this._zclNode?.endpoints?.[1];
      if (!ep1?.clusters) return null;
      return ep1.clusters.tuya || ep1.clusters.manuSpecificTuya ||
             ep1.clusters[0xEF00] || ep1.clusters['61184'];
    };

    // v5.8.26: Send Tuya DP bool command for gangs without ZCL onOff
    const sendTuyaDPBool = async (dpId, value) => {
      const tuyaCluster = getTuyaCluster();
      if (!tuyaCluster) {
        this.log(`[BSEED-4G] ⚠️ No Tuya cluster on EP1 for DP${dpId}`);
        return false;
      }
      const dataBuffer = Buffer.from([value ? 1 : 0]);
      try {
        if (typeof tuyaCluster.datapoint === 'function') {
          await tuyaCluster.datapoint({ dp: dpId, datatype: 1, data: dataBuffer });
        } else if (typeof tuyaCluster.sendData === 'function') {
          await tuyaCluster.sendData({ dp: dpId, value: value ? 1 : 0, dataType: 1 });
        } else {
          this.log(`[BSEED-4G] ⚠️ No DP send method on Tuya cluster`);
          return false;
        }
        this.log(`[BSEED-4G] ✅ Tuya DP${dpId} = ${value} sent`);
        return true;
      } catch (err) {
        this.log(`[BSEED-4G] ❌ Tuya DP${dpId} send failed: ${err.message}`);
        return false;
      }
    };
    this._sendTuyaDPBool = sendTuyaDPBool;

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
          // v5.8.26: Tuya DP fallback for EP2-4 without onOff clusters
          const dpSent = await sendTuyaDPBool(gangNum, value);
          if (!dpSent) {
            this.log(`[BSEED-4G] EP${gangNum} no ZCL onOff and no Tuya DP - command not sent`);
          }
        }
        return true;
      });
      this.log(`[BSEED-4G] EP${epNum} capability listener registered for ${capName}`);
    }

    // v5.7.38: Setup attribute listeners for available endpoints
    // Also setup delayed retry for endpoints where cluster isn't ready yet
    const setupEndpointListener = (epNum, retryCount = 0) => {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        if (retryCount < 3) {
          this.log(`[BSEED-4G] EP${epNum} cluster not ready, retry ${retryCount + 1}/3 in 2s`);
          setTimeout(() => setupEndpointListener(epNum, retryCount + 1), 2000);
        } else {
          this.log(`[BSEED-4G] EP${epNum} no ZCL attr listener after 3 retries - using Tuya DP for gang ${epNum}`);
          this._dpFallbackGangs = this._dpFallbackGangs || new Set();
          this._dpFallbackGangs.add(epNum);
        }
        return;
      }

      const capName = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
      const gangNum = epNum; // Capture for closure
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
    };

    // Setup listeners for all endpoints
    for (const epNum of [1, 2, 3, 4]) {
      setupEndpointListener(epNum);
    }

    // v5.8.26: Setup Tuya DP listener for gangs that fell back to DP mode
    this._setupTuyaDPListener(zclNode);

    await this.initVirtualButtons?.();
    this.log('[SWITCH-4G] ✅ BSEED ZCL-only mode ready (packetninja technique)');
  }

  /**
   * v5.8.26: Setup Tuya DP listener on EP1 cluster 0xEF00 for gangs using DP fallback
   * Handles incoming DP reports for physical button detection on EP2-4
   */
  _setupTuyaDPListener(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1?.clusters) return;

    const tuyaCluster = ep1.clusters.tuya || ep1.clusters.manuSpecificTuya ||
                        ep1.clusters[0xEF00] || ep1.clusters['61184'];
    if (!tuyaCluster) {
      this.log('[BSEED-4G] No Tuya cluster on EP1 for DP listener');
      return;
    }

    // Listen for datapoint reports (DP1-4 = gang states)
    const handleDPReport = (dpId, value) => {
      if (dpId < 1 || dpId > 4) return;
      const boolVal = value === 1 || value === true;
      const capName = dpId === 1 ? 'onoff' : `onoff.gang${dpId}`;
      const isPhysical = !this._zclState.pending[dpId];

      this.log(`[BSEED-4G] Tuya DP${dpId} report: ${boolVal} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

      if (this._zclState.lastState[dpId] !== boolVal) {
        this._zclState.lastState[dpId] = boolVal;
        this.setCapabilityValue(capName, boolVal).catch(() => {});

        if (isPhysical) {
          const flowId = `switch_4gang_physical_gang${dpId}_${boolVal ? 'on' : 'off'}`;
          this.homey.flow.getDeviceTriggerCard(flowId)
            .trigger(this, { gang: dpId, state: boolVal }, {})
            .catch(() => {});
          this.log(`[BSEED-4G] 🔘 Physical G${dpId} ${boolVal ? 'ON' : 'OFF'} (via Tuya DP)`);
        }
      }
    };

    // Try multiple listener patterns for Tuya cluster
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('datapoint', (frame) => {
        if (frame?.dp !== undefined && frame?.data !== undefined) {
          const val = frame.data.length === 1 ? frame.data[0] : frame.data;
          handleDPReport(frame.dp, val);
        }
      });
      tuyaCluster.on('response', (frame) => {
        if (frame?.dp !== undefined && frame?.data !== undefined) {
          const val = frame.data.length === 1 ? frame.data[0] : frame.data;
          handleDPReport(frame.dp, val);
        }
      });
      this.log('[BSEED-4G] Tuya DP listener registered on EP1 cluster 0xEF00');
    }
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

  /**
   * v5.8.39: Ensure onOff cluster exists on all 4 endpoints.
   * Root cause (diag 83af3e29): Homey interview may not discover onOff (cluster 6)
   * on EP2-4 for BSEED TS0726. The Endpoint constructor only creates clusters from
   * descriptor.inputClusters, so if cluster 6 wasn't in the descriptor, the cluster
   * object is never created and all commands fail with "onOff cluster not found".
   *
   * Fix: Use Cluster.getCluster(6) from zigbee-clusters to get the OnOff class,
   * then manually instantiate it on endpoints where it's missing.
   */
  _ensureOnOffClusters(zclNode) {
    try {
      const { Cluster } = require('zigbee-clusters');
      // v5.8.47: Try both string name and numeric ID for maximum compatibility
      const OnOffCluster = Cluster.getCluster('onOff') || Cluster.getCluster(6);
      if (!OnOffCluster) {
        this.log('[BSEED-4G] ⚠️ OnOff cluster class not found in registry');
        return;
      }

      for (const epNum of [1, 2, 3, 4]) {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep) {
          this.log(`[BSEED-4G] ⚠️ EP${epNum} endpoint does not exist`);
          continue;
        }
        if (!ep.clusters) ep.clusters = {};

        // Check if onOff already exists under any key
        const existing = ep.clusters.onOff || ep.clusters.genOnOff
          || ep.clusters[6] || ep.clusters['6'];
        if (existing) {
          this.log(`[BSEED-4G] EP${epNum} onOff cluster already present`);
          continue;
        }

        // v5.8.47: Manually instantiate onOff cluster - try multiple constructor patterns
        let clusterInstance = null;
        try {
          clusterInstance = new OnOffCluster(ep);
        } catch (e1) {
          try { clusterInstance = new OnOffCluster({ endpoint: ep }); } catch (e2) {
            this.log(`[BSEED-4G] ⚠️ EP${epNum} cluster construction failed: ${e1.message}`);
          }
        }
        if (clusterInstance) {
          // v5.8.47: Store under multiple keys for reliable lookup
          const name = OnOffCluster.NAME || 'onOff';
          ep.clusters[name] = clusterInstance;
          if (!ep.clusters[6]) ep.clusters[6] = clusterInstance;
          if (!ep.clusters['6']) ep.clusters['6'] = clusterInstance;
          this.log(`[BSEED-4G] ✅ EP${epNum} onOff cluster CREATED manually (interview missed it)`);
        }
      }
    } catch (err) {
      this.log(`[BSEED-4G] ⚠️ _ensureOnOffClusters error: ${err.message}`);
    }
  }

  /**
   * v5.8.51: Explicitly bind onOff cluster on all endpoints (TS0726 BSEED fix)
   * Without binding, the device won't send attribute reports for EP2-4.
   */
  async _bindAllEndpoints(zclNode) {
    for (const epNum of [1, 2, 3, 4]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) continue;
        const onOff = ep.clusters.onOff || ep.clusters.genOnOff || ep.clusters[6] || ep.clusters['6'];
        if (onOff && typeof onOff.bind === 'function') {
          await onOff.bind().catch(e => this.log(`[BSEED-4G] EP${epNum} bind warn: ${e.message}`));
          this.log(`[BSEED-4G] EP${epNum} onOff cluster bound`);
        } else {
          this.log(`[BSEED-4G] EP${epNum} no bindable onOff cluster`);
        }
      } catch (err) {
        this.log(`[BSEED-4G] EP${epNum} bind error: ${err.message}`);
      }
    }

    // v5.8.58: Configure attribute reporting for EP1-4 (Hartmut_Dunker fix)
    try {
      const cfg = [1, 2, 3, 4].map(ep => ({
        endpointId: ep, cluster: 'onOff',
        attributeName: 'onOff', minInterval: 0,
        maxInterval: 300, minChange: 1
      }));
      await this.configureAttributeReporting(cfg).catch(e =>
        this.log(`[BSEED-4G] Report cfg warn: ${e.message}`)
      );
      this.log('[BSEED-4G] ✅ Attr reporting configured EP1-4');
    } catch (err) {
      this.log(`[BSEED-4G] ⚠️ Report cfg error: ${err.message}`);
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
