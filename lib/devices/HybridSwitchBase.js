'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridSwitchBase - Base class for Tuya wall switches
 *
 * v5.3.63: Centralized base for switch devices
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
      caps.push(`onoff.${i}`);
    }
    return caps;
  }

  get dpMappings() {
    // Standard Tuya multi-gang DP mappings
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'onoff.2', transform: (v) => v === 1 || v === true },
      3: { capability: 'onoff.3', transform: (v) => v === 1 || v === true },
      4: { capability: 'onoff.4', transform: (v) => v === 1 || v === true },
      5: { capability: 'onoff.5', transform: (v) => v === 1 || v === true },
      6: { capability: 'onoff.6', transform: (v) => v === 1 || v === true },
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
    this.log('║          HYBRID SWITCH BASE v5.3.63                         ║');
    this.log(`║ Model: ${this._protocolInfo.modelId} | Gangs: ${this.gangCount}`);
    this.log(`║ Mode: ${this._protocolInfo.protocol}`);
    this.log('╚══════════════════════════════════════════════════════════════╝');

    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

    if (this._protocolInfo.isTuyaDP) {
      this._isPureTuyaDP = true;
      await this._setupTuyaDPMode();
    } else {
      await this._setupZCLMode(zclNode);
    }

    this._registerCapabilityListeners();
    this.log('[HYBRID-SWITCH] ✅ Initialization complete');
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
    this.log('[TUYA-DP] Setting up Tuya DP mode for switch...');
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => this._handleDP(dpId, value));
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL mode for switch...');

    // For multi-gang, each gang is on a different endpoint
    for (let gang = 1; gang <= this.gangCount; gang++) {
      const endpoint = zclNode?.endpoints?.[gang];
      const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

      if (!onOffCluster) continue;

      const capability = gang === 1 ? 'onoff' : `onoff.${gang}`;

      if (this.hasCapability(capability)) {
        onOffCluster.on('attr.onOff', (value) => {
          this.log(`[ZCL] ${capability} = ${value}`);
          this.setCapabilityValue(capability, value).catch(() => { });
        });

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

    if (mapping.capability && this.hasCapability(mapping.capability)) {
      this.log(`[DP] DP${dpId} → ${mapping.capability} = ${value}`);
      this.setCapabilityValue(mapping.capability, value).catch(() => { });
    }

    if (mapping.setting) {
      this.log(`[DP] DP${dpId} → setting ${mapping.setting} = ${value}`);
      this.setSettings({ [mapping.setting]: value }).catch(() => { });
    }
  }

  _registerCapabilityListeners() {
    for (let gang = 1; gang <= this.gangCount; gang++) {
      const capability = gang === 1 ? 'onoff' : `onoff.${gang}`;
      const dpId = gang;

      if (this.hasCapability(capability)) {
        this.registerCapabilityListener(capability, async (value) => {
          return this._setGangOnOff(gang, value);
        });
      }
    }
  }

  async _setGangOnOff(gang, value) {
    const capability = gang === 1 ? 'onoff' : `onoff.${gang}`;
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
    if (this._isPureTuyaDP) return;
    return super.registerCapability(capabilityId, clusterId, opts);
  }
}

module.exports = HybridSwitchBase;
