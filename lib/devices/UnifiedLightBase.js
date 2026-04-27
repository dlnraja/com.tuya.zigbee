'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../utils/MathUtils.js');
const { CLUSTERS } = require('../constants/ZigbeeConstants.js');
const BaseUnifiedDevice = require('./BaseUnifiedDevice');
const { ensureManufacturerSettings } = require('../helpers/ManufacturerNameHelper');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { setupUniversalZCLListeners } = require('../tuya/UniversalTuyaParser');

const LEARNING_PERIOD_MS = safeMultiply(15, 60000); // 15 minutes

/**
 * HYBRID LIGHT BASE - v7.4.11 TRUE HYBRID (ZCL + Tuya DP)
 */
class UnifiedLightBase extends BaseUnifiedDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => !!v },
      2: { capability: 'dim', divisor: 10, min: 0, max: 1000 },
      3: { capability: 'light_temperature', divisor: 1000 },
      4: { capability: 'light_mode' },
      5: { capability: 'light_hue', divisor: 360 },
      6: { capability: 'light_saturation', divisor: 1000 },
      21: { capability: 'power_on_behavior', internal: true },
      25: { capability: 'dim', divisor: 1000 }
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridLightInited) return;
    this._hybridLightInited = true;

    await ensureManufacturerSettings(this).catch(() => {});
    await this._applyManufacturerConfig();

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();
    if (this._protocolInfo.isTuyaDP) this._isPureTuyaDP = true;

    this.log(`[LIGHT] Hybrid Light Base v7.4.11 initializing...`);
    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

    this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
    await this.protocolOptimizer.initialize(zclNode);

    this._protocolStats = {
      tuya: { received: 0, lastTime: 0 },
      zcl: { received: 0, lastTime: 0 }
    };

    await Promise.all([
      this._setupTuyaDPMode().catch(e => this.log('[HYBRID] Tuya DP setup error:', e.message)),
      this._setupZCLMode(zclNode).catch(e => this.log('[HYBRID] ZCL setup error:', e.message))
    ]);

    await this._registerHomeyCapabilities(zclNode);
    this._registerCapabilityListeners();

    if (!this._isPureTuyaDP) {
      await this._setupZCLReporting(zclNode).catch(() => {});
      await this._readInitialLightState(zclNode).catch(() => {});
    }

    this.homey.setTimeout(() => this._logLearningReport(), LEARNING_PERIOD_MS);
  }

  async _applyManufacturerConfig() {
    const settings = this.getSettings();
    const store = this.getStore();
    const manufacturerName = settings.zb_manufacturer_name || store.manufacturerName || 'unknown';
    const productId = settings.zb_model_id || store.modelId || 'unknown';
    
    const config = ManufacturerVariationManager.getManufacturerConfig(manufacturerName, productId, this.driver.id);
    ManufacturerVariationManager.applyManufacturerConfig(this, config);
    if (config.dpMappings) this._dynamicDpMappings = config.dpMappings;
  }

  _detectProtocol() {
    const settings = this.getSettings();
    const modelId = settings.zb_model_id || '';
    const mfr = settings.zb_manufacturer_name || '';
    const isTuyaDP = CI.equalsCI(modelId, 'TS0601') || CI.startsWithCI(mfr, '_TZE');
    return { isTuyaDP, modelId, mfr };
  }

  async _migrateCapabilities() {
    for (const cap of this.lightCapabilities) {
      if (!this.hasCapability(cap)) await this.addCapability(cap).catch(() => {});
    }
  }

  _bumpMaxListeners(zclNode) {
    if (!zclNode?.endpoints) return;
    for (const endpoint of Object.values(zclNode.endpoints)) {
      if (endpoint.setMaxListeners) endpoint.setMaxListeners(50);
      for (const cluster of Object.values(endpoint.clusters || {})) {
        if (cluster.setMaxListeners) cluster.setMaxListeners(50);
      }
    }
  }

  async _setupTuyaDPMode() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.manuSpecificTuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];

    if (tuyaCluster?.on) {
      const handler = (dp, value) => {
        this._protocolStats.tuya.received++;
        this._protocolStats.tuya.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('tuya', dp, value);
        this._handleDP(dp, value);
      };
      tuyaCluster.on('response', (s, t, dp, dt, data) => handler(dp, data));
      tuyaCluster.on('datapoint', (dp, value) => handler(dp, value));
    }
  }

  async _setupZCLMode(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const onOff = ep1.clusters?.onOff || ep1.clusters?.genOnOff;
    if (onOff) {
      onOff.on('attr.onOff', (v) => {
        this._protocolStats.zcl.received++;
        this.protocolOptimizer?.registerHit('zcl', 'onOff', v, 'onoff');
        this._safeSetCapability('onoff', !!v);
      });
    }

    const level = ep1.clusters?.levelControl || ep1.clusters?.genLevelCtrl;
    if (level) {
      level.on('attr.currentLevel', (v) => {
        this._protocolStats.zcl.received++;
        const dim = Math.round(safeDivide(v, 254) * 100) / 100;
        this.protocolOptimizer?.registerHit('zcl', 'levelControl', dim, 'dim');
        this._safeSetCapability('dim', dim);
      });
    }

    setupUniversalZCLListeners(this, zclNode, {});
  }

  _handleDP(dpId, rawValue) {
    const mapping = (this._dynamicDpMappings || this.dpMappings)[dpId];
    if (!mapping) return;

    let value = typeof rawValue === 'number' ? rawValue : Buffer.isBuffer(rawValue) ? rawValue.readIntBE(0, rawValue.length) : rawValue;
    if (mapping.divisor) value = safeDivide(value, mapping.divisor);
    if (mapping.transform) value = mapping.transform(value);

    if (mapping.capability === 'dim' || mapping.capability === 'light_temperature') {
      value = Math.max(0, Math.min(1, value));
    }

    this._safeSetCapability(mapping.capability, value);
  }

  async _registerHomeyCapabilities(zclNode) {
    if (this._isPureTuyaDP) return;
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    if (this.hasCapability('onoff') && ep1.clusters?.onOff) await super.registerCapability('onoff', 'onOff').catch(() => {});
    if (this.hasCapability('dim') && ep1.clusters?.levelControl) await super.registerCapability('dim', 'levelControl').catch(() => {});
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('onoff')) this.registerCapabilityListener('onoff', v => this._setOnOff(v));
    if (this.hasCapability('dim')) this.registerCapabilityListener('dim', v => this._setDim(v));
  }

  async _setOnOff(value) {
    if (this._isPureTuyaDP) await this._sendTuyaDPCommand(1, value ? 1 : 0, 1);
    else {
      const cluster = this.zclNode?.endpoints?.[1]?.clusters?.onOff;
      if (cluster) await (value ? cluster.setOn() : cluster.setOff());
    }
  }

  async _setDim(value) {
    if (this._isPureTuyaDP) {
      if (value > 0 && this.getCapabilityValue('onoff') === false) await this._setOnOff(true);
      await this._sendTuyaDPCommand(2, Math.round(safeMultiply(value, 1000)), 2);
    } else {
      const cluster = this.zclNode?.endpoints?.[1]?.clusters?.levelControl;
      if (cluster) {
        const level = Math.round(safeMultiply(value, 254));
        if (cluster.moveToLevelWithOnOff) await cluster.moveToLevelWithOnOff({ level, transitionTime: 0 });
        else await cluster.moveToLevel({ level, transitionTime: 0 });
      }
    }
  }

  async _sendTuyaDPCommand(dp, value, datatype) {
    const ep = this.zclNode?.endpoints?.[1];
    const tc = ep?.clusters?.tuya || ep?.clusters?.[CLUSTERS.TUYA_EF00];
    if (!tc) throw new Error('No Tuya cluster');
    const data = Buffer.alloc(datatype === 1 || datatype === 4 ? 1 : 4);
    if (data.length === 1) data.writeUInt8(value, 0); else data.writeUInt32BE(value, 0);
    const fn = tc.dataRequest || tc.setData || tc.command;
    if (fn) await fn.call(tc, { dp, datatype, data });
  }

  _logLearningReport() {
    this.log(`[LEARN] Tuya=${this._protocolStats.tuya.received}, ZCL=${this._protocolStats.zcl.received}`);
  }
}

module.exports = UnifiedLightBase;
