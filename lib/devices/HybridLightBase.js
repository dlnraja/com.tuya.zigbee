'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { getAppVersionPrefixed } = require('../utils/AppVersion');

/**
 * HybridLightBase - Base class for ALL Tuya lights/bulbs
 *
 * v5.3.63: Centralized base for lighting devices
 *
 * FEATURES:
 * - On/Off, Dim, Color Temperature, RGB control
 * - Uses moveToLevelWithOnOff for proper dimming
 * - Protocol auto-detection (ZCL vs Tuya DP)
 * - Anti-double initialization
 *
 * SUPPORTED LIGHT TYPES:
 * - Dimmable bulbs
 * - Color temperature bulbs
 * - RGB/RGBW bulbs
 * - LED strips
 * - LED controllers
 */
class HybridLightBase extends ZigBeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  /** Override in subclass for specific light type */
  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 10, min: 0, max: 1000 },      // 0-1000 → 0-1
      3: { capability: 'light_temperature', divisor: 1000 },          // 0-1000 → 0-1
      5: { capability: 'light_hue' },
      6: { capability: 'light_saturation' }
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridLightInited) {
      this.log('[HYBRID-LIGHT] ⚠️ Already initialized');
      return;
    }
    this._hybridLightInited = true;

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable(`⚠️ Phantom device. Delete this.`).catch(() => { });
      return;
    }

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log(`║          HYBRID LIGHT BASE ${getAppVersionPrefixed()}`.padEnd(62) + '║');
    this.log(`║ Model: ${this._protocolInfo.modelId} | Mode: ${this._protocolInfo.protocol}`);
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
    this.log('[HYBRID-LIGHT] ✅ Initialization complete');
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
    for (const cap of this.lightCapabilities) {
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
    this.log('[TUYA-DP] Setting up Tuya DP mode for light...');
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => this._handleDP(dpId, value));
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL mode for light...');

    const endpoint = zclNode?.endpoints?.[1];
    const levelCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl;
    const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
    const colorCluster = endpoint?.clusters?.colorControl || endpoint?.clusters?.lightingColorCtrl;

    // On/Off
    if (onOffCluster && this.hasCapability('onoff')) {
      onOffCluster.on('attr.onOff', (value) => {
        this.setCapabilityValue('onoff', value).catch(() => { });
      });
    }

    // Dim level
    if (levelCluster && this.hasCapability('dim')) {
      levelCluster.on('attr.currentLevel', (value) => {
        const dim = Math.round((value / 254) * 100) / 100;
        this.setCapabilityValue('dim', dim).catch(() => { });
      });
    }

    // Color temperature
    if (colorCluster && this.hasCapability('light_temperature')) {
      colorCluster.on('attr.colorTemperatureMireds', (value) => {
        // Convert mireds to 0-1 range (typical range: 153-500 mireds)
        const temp = Math.max(0, Math.min(1, (value - 153) / (500 - 153)));
        this.setCapabilityValue('light_temperature', temp).catch(() => { });
      });
    }
  }

  _handleDP(dpId, rawValue) {
    const mapping = this.dpMappings[dpId];
    if (!mapping) return;

    let value = typeof rawValue === 'number' ? rawValue :
      Buffer.isBuffer(rawValue) ? rawValue.readIntBE(0, rawValue.length) : rawValue;

    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);
    if (mapping.min !== undefined) value = Math.max(mapping.min, value);
    if (mapping.max !== undefined) value = Math.min(mapping.max, value);

    this.log(`[DP] DP${dpId} → ${mapping.capability} = ${value}`);

    if (this.hasCapability(mapping.capability)) {
      this.setCapabilityValue(mapping.capability, value).catch(() => { });
    }
  }

  _registerCapabilityListeners() {
    // On/Off
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._setOnOff(value);
      });
    }

    // Dim
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        return this._setDim(value);
      });
    }

    // Color temperature
    if (this.hasCapability('light_temperature')) {
      this.registerCapabilityListener('light_temperature', async (value) => {
        return this._setColorTemperature(value);
      });
    }
  }

  async _setOnOff(value) {
    this.log(`[LIGHT] onoff = ${value}`);

    if (this._isPureTuyaDP && this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.sendDP(1, value ? 1 : 0, 'bool');
    } else {
      const endpoint = this.zclNode?.endpoints?.[1];
      const cluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
      if (cluster) {
        await (value ? cluster.setOn() : cluster.setOff());
      }
    }
  }

  async _setDim(value) {
    this.log(`[LIGHT] dim = ${value}`);

    if (this._isPureTuyaDP && this.tuyaEF00Manager) {
      const dpValue = Math.round(value * 1000); // 0-1 → 0-1000
      await this.tuyaEF00Manager.sendDP(2, dpValue, 'value');
    } else {
      const endpoint = this.zclNode?.endpoints?.[1];
      const levelCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl;

      if (levelCluster) {
        const level = Math.round(value * 254);

        // CRITICAL: Use moveToLevelWithOnOff for proper Tuya compatibility
        if (typeof levelCluster.moveToLevelWithOnOff === 'function') {
          await levelCluster.moveToLevelWithOnOff({
            level,
            transitionTime: 0
          });
        } else {
          await levelCluster.moveToLevel({ level, transitionTime: 0 });
          // Also ensure on/off is set correctly
          if (value > 0) {
            const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
            if (onOffCluster) await onOffCluster.setOn();
          }
        }
      }
    }
  }

  async _setColorTemperature(value) {
    this.log(`[LIGHT] light_temperature = ${value}`);

    if (this._isPureTuyaDP && this.tuyaEF00Manager) {
      const dpValue = Math.round(value * 1000);
      await this.tuyaEF00Manager.sendDP(3, dpValue, 'value');
    } else {
      const endpoint = this.zclNode?.endpoints?.[1];
      const colorCluster = endpoint?.clusters?.colorControl || endpoint?.clusters?.lightingColorCtrl;

      if (colorCluster) {
        // Convert 0-1 to mireds (153-500 typical range)
        const mireds = Math.round(153 + value * (500 - 153));
        await colorCluster.moveToColorTemperature({ colorTemperature: mireds, transitionTime: 0 });
      }
    }
  }

  async registerCapability(capabilityId, clusterId, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(capabilityId, clusterId, opts);
  }
}

module.exports = HybridLightBase;
