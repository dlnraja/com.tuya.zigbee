'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const { getAppVersionPrefixed } = require('../utils/AppVersion');

/**
 * HybridSwitchBase - Base class for Tuya wall switches
 *
 * v5.5.63: TRUE HYBRID - Listens to BOTH Tuya DP AND ZCL simultaneously
 *          After 15 min, pauses unused protocol methods
 *
 * FEATURES:
 * - Single and multi-gang support
 * - Power-on behavior settings
 * - LED indicator control
 * - Protocol auto-detection
 *
 * SUPPORTED SWITCH TYPES:
 * - 1-gang, 2-gang, 3-gang, 4-gang, 6-gang
 * - With/without neutral
 * - Dimmer switches
 * - Scene switches
 */
class HybridSwitchBase extends ZigBeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  /** Number of gangs (override in subclass) */
  get gangCount() { return 1; }

  get switchCapabilities() {
    const caps = ['onoff'];
    for (let i = 2; i <= this.gangCount; i++) {
      caps.push(`onoff.gang${i}`);
    }
    return caps;
  }

  get dpMappings() {
    // v5.3.95: Use onoff.gangX to match driver.compose.json
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'onoff.gang2', transform: (v) => v === 1 || v === true },
      3: { capability: 'onoff.gang3', transform: (v) => v === 1 || v === true },
      4: { capability: 'onoff.gang4', transform: (v) => v === 1 || v === true },
      5: { capability: 'onoff.gang5', transform: (v) => v === 1 || v === true },
      6: { capability: 'onoff.gang6', transform: (v) => v === 1 || v === true },
      7: { capability: 'onoff.gang7', transform: (v) => v === 1 || v === true },
      8: { capability: 'onoff.gang8', transform: (v) => v === 1 || v === true },
      // Settings
      14: { capability: null, setting: 'power_on_behavior' },  // Power-on state
      15: { capability: null, setting: 'led_indicator' }       // LED indicator
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridSwitchInited) {
      this.log('[HYBRID-SWITCH] ⚠️ Already initialized');
      return;
    }
    this._hybridSwitchInited = true;

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log(`║          HYBRID SWITCH BASE ${getAppVersionPrefixed()}`.padEnd(62) + '║');
    this.log(`║ Model: ${this._protocolInfo.modelId} | Gangs: ${this.gangCount}`);
    this.log(`║ Mode: ${this._protocolInfo.protocol}`);
    this.log('╚══════════════════════════════════════════════════════════════╝');

    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

    // v5.5.63: Initialize Protocol Auto-Optimizer
    this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
    await this.protocolOptimizer.initialize(zclNode);

    this.protocolOptimizer.on('decision', (mode, stats) => {
      this.log(`[AUTO-OPT] ✅ Decision: ${mode} (Tuya=${stats.protocols.tuya.hits}, ZCL=${stats.protocols.zcl.hits})`);
    });

    // v5.5.63: Setup BOTH protocols simultaneously - optimizer will decide later
    await Promise.all([
      this._setupTuyaDPMode().catch(() => { }),
      this._setupZCLMode(zclNode).catch(() => { })
    ]);

    this._registerCapabilityListeners();
    this.log('[HYBRID-SWITCH] ✅ Initialization complete (TRUE HYBRID mode)');
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const modelId = settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');

    return { protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL', isTuyaDP, modelId, mfr };
  }

  async _migrateCapabilities() {
    for (const cap of this.switchCapabilities) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  _bumpMaxListeners(zclNode) {
    try {
      if (!zclNode?.endpoints) return;
      for (const endpoint of Object.values(zclNode.endpoints)) {
        if (typeof endpoint.setMaxListeners === 'function') endpoint.setMaxListeners(50);
        for (const cluster of Object.values(endpoint?.clusters || {})) {
          if (typeof cluster?.setMaxListeners === 'function') cluster.setMaxListeners(50);
        }
      }
    } catch (e) { }
  }

  async _setupTuyaDPMode() {
    this.log('[TUYA-DP] Setting up Tuya DP listeners for switch...');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters.tuya ||
      endpoint.clusters.manuSpecificTuya ||
      endpoint.clusters[0xEF00] ||
      endpoint.clusters['61184'];

    if (tuyaCluster && typeof tuyaCluster.on === 'function') {
      // Listen to ALL event types
      const events = ['dp', 'datapoint', 'response', 'data', 'report'];
      for (const evt of events) {
        try {
          tuyaCluster.on(evt, (data) => {
            // Register hit with optimizer
            if (this.protocolOptimizer) {
              this.protocolOptimizer.registerHit('tuya', 'cluster', data);
            }
            // Only process if Tuya protocol is active
            if (!this.protocolOptimizer || this.protocolOptimizer.isActive('tuya')) {
              this._handleTuyaData(data);
            }
          });
          this.log(`[TUYA-DP] ✅ Listener: tuya.on('${evt}')`);
        } catch (e) { }
      }
    }

    // Also listen via TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        if (this.protocolOptimizer) {
          this.protocolOptimizer.registerHit('tuya', dpId, value);
        }
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('tuya')) {
          this._handleDP(dpId, value);
        }
      });
    }
  }

  _handleTuyaData(data) {
    if (!data) return;

    // Parse DP from various formats
    if (data.dp !== undefined && data.value !== undefined) {
      this._handleDP(data.dp, data.value);
    } else if (data.dpId !== undefined) {
      this._handleDP(data.dpId, data.value || data.data);
    } else if (Buffer.isBuffer(data) && data.length >= 5) {
      // Parse raw Tuya frame: [seq:2][dp:1][type:1][len:2][data:len]
      const dp = data[2];
      const len = data.readUInt16BE(4);
      let value;
      if (len === 1) value = data[6];
      else if (len === 4) value = data.readInt32BE(6);
      else value = data.slice(6, 6 + len);
      this._handleDP(dp, value);
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL listeners for switch...');

    // For multi-gang, each gang is on a different endpoint
    for (let gang = 1; gang <= this.gangCount; gang++) {
      const endpoint = zclNode?.endpoints?.[gang];
      const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

      if (!onOffCluster) continue;

      const capability = gang === 1 ? 'onoff' : `onoff.gang${gang}`;

      if (this.hasCapability(capability)) {
        onOffCluster.on('attr.onOff', (value) => {
          // Register hit with optimizer
          if (this.protocolOptimizer) {
            this.protocolOptimizer.registerHit('zcl', `onOff.gang${gang}`, value);
          }
          // Only process if ZCL protocol is active
          if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) {
            this.log(`[ZCL] ${capability} = ${value}`);
            this.setCapabilityValue(capability, value).catch(() => { });
          }
        });
        this.log(`[ZCL] ✅ Listener: EP${gang}.onOff`);

        // Read initial state
        onOffCluster.readAttributes(['onOff']).then(data => {
          if (data?.onOff != null) {
            this.setCapabilityValue(capability, data.onOff).catch(() => { });
          }
        }).catch(() => { });
      }
    }
  }

  _handleDP(dpId, rawValue) {
    const mapping = this.dpMappings[dpId];
    if (!mapping) return;

    let value = typeof rawValue === 'number' ? rawValue :
      typeof rawValue === 'boolean' ? rawValue :
        Buffer.isBuffer(rawValue) ? rawValue[0] : rawValue;

    if (mapping.transform) value = mapping.transform(value);

    if (mapping.capability) {
      this.log(`[DP] DP${dpId} → ${mapping.capability} = ${value}`);
      // v5.5.118: Use safe setter with dynamic capability addition
      this._safeSetCapability(mapping.capability, value);
    }

    if (mapping.setting) {
      this.log(`[DP] DP${dpId} → setting ${mapping.setting} = ${value}`);
      this.setSettings({ [mapping.setting]: value }).catch(() => { });
    }
  }

  _registerCapabilityListeners() {
    for (let gang = 1; gang <= this.gangCount; gang++) {
      const capability = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      const dpId = gang;

      if (this.hasCapability(capability)) {
        this.registerCapabilityListener(capability, async (value) => {
          return this._setGangOnOff(gang, value);
        });
      }

      // v5.5.24: Support legacy onoff.X naming (onoff.1, onoff.2, etc.)
      const legacyCap = `onoff.${gang}`;
      if (this.hasCapability(legacyCap) && legacyCap !== capability) {
        this.registerCapabilityListener(legacyCap, async (value) => {
          return this._setGangOnOff(gang, value);
        });
      }
    }
  }

  async _setGangOnOff(gang, value) {
    const capability = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
    this.log(`[SWITCH] ${capability} = ${value}`);

    if (this._isPureTuyaDP && this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.sendDP(gang, value ? 1 : 0, 'bool');
    } else {
      const endpoint = this.zclNode?.endpoints?.[gang];
      const cluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
      if (cluster) {
        await (value ? cluster.setOn() : cluster.setOff());
      }
    }
  }

  async registerCapability(capabilityId, clusterId, opts) {
    // v5.5.63: Check if ZCL is active before registering
    if (this.protocolOptimizer && !this.protocolOptimizer.isActive('zcl')) return;
    return super.registerCapability(capabilityId, clusterId, opts);
  }

  /**
   * v5.5.118: Capabilities that can be dynamically added for switches
   */
  static get DYNAMIC_CAPABILITIES() {
    return [
      'onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4', 'onoff.gang5', 'onoff.gang6',
      'measure_power', 'measure_voltage', 'measure_current'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic addition
   */
  async _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      if (HybridSwitchBase.DYNAMIC_CAPABILITIES.includes(capability)) {
        try {
          await this.addCapability(capability);
          this.log(`[CAP] ✨ DYNAMIC ADD: ${capability} (detected from DP/ZCL data)`);
        } catch (e) {
          this.log(`[CAP] ⚠️ Could not add ${capability}: ${e.message}`);
          return;
        }
      } else {
        return;
      }
    }
    this.setCapabilityValue(capability, value).catch(() => { });
  }

  async onDeleted() {
    // v5.5.63: Cleanup optimizer
    if (this.protocolOptimizer) {
      this.protocolOptimizer.destroy();
      this.protocolOptimizer = null;
    }
  }
}

module.exports = HybridSwitchBase;
