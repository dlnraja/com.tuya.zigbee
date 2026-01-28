'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const greenPower = require('../green_power');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
// v5.5.84: Universal parser for intelligent multi-format support
const {
  parseTuyaFrame,
  getUniversalDPMapping,
  setupUniversalZCLListeners,
} = require('../tuya/UniversalTuyaParser');

// Learning period: 15 minutes
const LEARNING_PERIOD_MS = 15 * 60 * 1000;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          HYBRID LIGHT BASE - v5.5.130 TRUE HYBRID (ZCL + Tuya DP)           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  FEATURES:                                                                   ║
 * ║  - On/Off, Dim, Color Temperature, RGB control                               ║
 * ║  - TRUE HYBRID: Listens to BOTH ZCL AND Tuya DP simultaneously              ║
 * ║  - Protocol Auto-Optimizer: 15 min learning period                           ║
 * ║  - Intelligent capability discovery from data                                ║
 * ║  - Uses moveToLevelWithOnOff for proper dimming                              ║
 * ║                                                                              ║
 * ║  SUPPORTED LIGHT TYPES:                                                      ║
 * ║  - Dimmable bulbs, Color temperature bulbs                                   ║
 * ║  - RGB/RGBW bulbs, LED strips, LED controllers                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
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
      4: { capability: 'light_mode' },                                 // 0=white, 1=color
      5: { capability: 'light_hue', divisor: 360 },
      6: { capability: 'light_saturation', divisor: 1000 },
      21: { capability: null, internal: 'power_on_behavior' },
      24: { capability: null, internal: 'hsv_alt' },
      25: { capability: 'dim', divisor: 1000 }
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
      await this.setUnavailable('⚠️ Phantom device. Delete this.').catch(() => { });
      return;
    }

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║     HYBRID LIGHT BASE v5.5.130 - TRUE HYBRID                 ║');
    this.log(`║ Model: ${this._protocolInfo.modelId} | Mfr: ${this._protocolInfo.mfr}`);
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log('║ 🔄 Listening to BOTH ZCL AND Tuya DP simultaneously         ║');
    this.log('║ ⏰ 15 min learning period to optimize protocol               ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

    // ═══════════════════════════════════════════════════════════════════════════
    // v5.5.130: Initialize Protocol Auto-Optimizer (15 min learning)
    // ═══════════════════════════════════════════════════════════════════════════
    this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
    await this.protocolOptimizer.initialize(zclNode);

    this.protocolOptimizer.on('decision', (mode, stats) => {
      this.log(`[AUTO-OPT] ✅ Learning complete: ${mode}`);
      this.log(`[AUTO-OPT] Stats: Tuya=${stats.protocols.tuya.hits}, ZCL=${stats.protocols.zcl.hits}`);
    });

    this.protocolOptimizer.on('learning_complete', (discoveredCaps) => {
      // v5.5.202: Safe capability discovery - handle both Map and object types
      try {
        if (discoveredCaps && typeof discoveredCaps.keys === 'function') {
          this.log(`[AUTO-OPT] 📚 Discovered capabilities: ${[...discoveredCaps.keys()].join(', ')}`);
        } else if (discoveredCaps && typeof discoveredCaps === 'object') {
          this.log(`[AUTO-OPT] 📚 Discovered capabilities: ${Object.keys(discoveredCaps).join(', ')}`);
        } else {
          this.log('[AUTO-OPT] 📚 Learning complete - no capabilities discovered');
        }
      } catch (err) {
        this.log('[AUTO-OPT] ⚠️ Error processing discovered capabilities:', err.message);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // v5.5.130: Setup BOTH protocols simultaneously - optimizer will decide later
    // ═══════════════════════════════════════════════════════════════════════════
    this._protocolStats = {
      tuya: { received: 0, lastTime: null },
      zcl: { received: 0, lastTime: null }
    };

    await Promise.all([
      this._setupTuyaDPMode().catch(e => this.log('[HYBRID] Tuya DP setup skipped:', e.message)),
      this._setupZCLMode(zclNode).catch(e => this.log('[HYBRID] ZCL setup skipped:', e.message))
    ]);

    // v5.5.291: CRITICAL FIX - Register capabilities with Homey's flow system
    // This ensures built-in flow cards ("Light turned on/off") fire correctly
    await this._registerHomeyCapabilities(zclNode);

    this._registerCapabilityListeners();

    // Schedule capability status report after learning period
    this._learningTimer = this.homey.setTimeout(() => {
      this._logLearningReport();
    }, LEARNING_PERIOD_MS);

    this.log('[HYBRID-LIGHT] ✅ TRUE HYBRID mode active - listening to ALL protocols');
  }

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    // v5.5.916: Fixed manufacturer/model retrieval - use settings/store like other drivers
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData() || {};
    
    const manufacturerName = settings.zb_manufacturer_name || 
                             store.manufacturerName || 
                             data.manufacturerName || 
                             'unknown';
    const productId = settings.zb_model_id || 
                      store.modelId || 
                      data.productId || 
                      'unknown';
    const driverType = this.driver?.id || 'unknown_light';

    this.log(`[LIGHT] 🔍 Analyzing config for: ${manufacturerName} / ${productId} (${driverType})`);

    // Get dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      driverType
    );

    // Apply configuration
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    // Override DP mappings if dynamic ones are provided
    if (config.dpMappings && Object.keys(config.dpMappings).length > 0) {
      this._dynamicDpMappings = config.dpMappings;
      this.log(`[LIGHT] 🔄 Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[LIGHT] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[LIGHT] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[LIGHT] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[LIGHT] ⭐ Special handling: ${config.specialHandling}`);
    }
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
    this.log('[TUYA-DP] Setting up Tuya DP listeners...');
    const ep1 = this.zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Find Tuya cluster (multiple names)
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.manuSpecificTuya ||
      ep1.clusters?.[61184] ||
      ep1.clusters?.['0xEF00'];

    if (tuyaCluster && typeof tuyaCluster.on === 'function') {
      // Listen for DP reports
      tuyaCluster.on('response', (status, transId, dp, dataType, data) => {
        this._protocolStats.tuya.received++;
        this._protocolStats.tuya.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('tuya', dp, data);
        this._handleDP(dp, data);
      });

      tuyaCluster.on('datapoint', (dp, value, dataType) => {
        this._protocolStats.tuya.received++;
        this._protocolStats.tuya.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('tuya', dp, value);
        this._handleDP(dp, value);
      });

      tuyaCluster.on('reporting', (frame) => {
        if (frame?.data?.dp !== undefined) {
          this._protocolStats.tuya.received++;
          this._protocolStats.tuya.lastTime = Date.now();
          this.protocolOptimizer?.registerHit('tuya', frame.data.dp, frame.data.value);
          this._handleDP(frame.data.dp, frame.data.value);
        }
      });

      this.log('[TUYA-DP] ✅ Tuya DP listeners active');
    }

    // Fallback to tuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._protocolStats.tuya.received++;
        this._protocolStats.tuya.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('tuya', dpId, value);
        this._handleDP(dpId, value);
      });
      this.log('[TUYA-DP] ✅ tuyaEF00Manager fallback active');
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL listeners...');

    const endpoint = zclNode?.endpoints?.[1];
    const levelCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl;
    const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
    const colorCluster = endpoint?.clusters?.colorControl || endpoint?.clusters?.lightingColorCtrl;

    // On/Off with protocol tracking
    if (onOffCluster) {
      onOffCluster.on('attr.onOff', (value) => {
        this._protocolStats.zcl.received++;
        this._protocolStats.zcl.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('zcl', 'onOff', value, 'onoff');
        this._safeSetCapability('onoff', value);
      });
      this.log('[ZCL] ✅ onOff listener');
    }

    // Dim level with protocol tracking
    if (levelCluster) {
      levelCluster.on('attr.currentLevel', (value) => {
        this._protocolStats.zcl.received++;
        this._protocolStats.zcl.lastTime = Date.now();
        const dim = Math.round((value / 254) * 100) / 100;
        this.protocolOptimizer?.registerHit('zcl', 'levelControl', dim, 'dim');
        this._safeSetCapability('dim', dim);
      });
      this.log('[ZCL] ✅ levelControl listener');
    }

    // Color temperature with protocol tracking
    if (colorCluster) {
      colorCluster.on('attr.colorTemperatureMireds', (value) => {
        this._protocolStats.zcl.received++;
        this._protocolStats.zcl.lastTime = Date.now();
        const temp = Math.max(0, Math.min(1, (value - 153) / (500 - 153)));
        this.protocolOptimizer?.registerHit('zcl', 'colorControl', temp, 'light_temperature');
        this._safeSetCapability('light_temperature', temp);
      });

      colorCluster.on('attr.currentHue', (value) => {
        this._protocolStats.zcl.received++;
        this._protocolStats.zcl.lastTime = Date.now();
        const hue = value / 254;
        this.protocolOptimizer?.registerHit('zcl', 'colorControl', hue, 'light_hue');
        this._safeSetCapability('light_hue', hue);
      });

      colorCluster.on('attr.currentSaturation', (value) => {
        this._protocolStats.zcl.received++;
        this._protocolStats.zcl.lastTime = Date.now();
        const sat = value / 254;
        this.protocolOptimizer?.registerHit('zcl', 'colorControl', sat, 'light_saturation');
        this._safeSetCapability('light_saturation', sat);
      });

      this.log('[ZCL] ✅ colorControl listeners');
    }

    // v5.5.84: Universal ZCL listeners for maximum coverage
    try {
      setupUniversalZCLListeners(this, zclNode, {});
    } catch (e) {
      this.log('[ZCL-UNIVERSAL] ⚠️ Warning:', e.message);
    }
  }

  /**
   * v5.5.130: Log learning report after 15 minutes
   */
  _logLearningReport() {
    this.log('');
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('📊 LEARNING REPORT (15 min after init)');
    this.log('═══════════════════════════════════════════════════════════════');
    this.log(`Tuya DP: ${this._protocolStats.tuya.received} messages`);
    this.log(`ZCL:     ${this._protocolStats.zcl.received} messages`);

    const preferred = this._protocolStats.tuya.received > this._protocolStats.zcl.received
      ? 'TUYA_DP' : this._protocolStats.zcl.received > 0 ? 'ZCL' : 'UNKNOWN';
    this.log(`Preferred protocol: ${preferred}`);

    // Log capability values
    const caps = this.getCapabilities();
    const values = caps.map(c => `${c}=${this.getCapabilityValue(c)}`).join(', ');
    this.log(`Capabilities: ${values}`);
    this.log('═══════════════════════════════════════════════════════════════');
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

    // v5.5.107: Sanity checks for light values
    if (value === null || value === undefined) return;
    if (mapping.capability === 'dim' && (value < 0 || value > 1)) {
      this.log(`[DP] ⚠️ Dim out of range: ${value} - clamping`);
      value = Math.max(0, Math.min(1, value));
    }
    if (mapping.capability === 'light_temperature' && (value < 0 || value > 1)) {
      this.log(`[DP] ⚠️ Color temp out of range: ${value} - clamping`);
      value = Math.max(0, Math.min(1, value));
    }

    this.log(`[DP] DP${dpId} → ${mapping.capability} = ${value}`);

    // v5.5.118: Use safe setter with dynamic capability addition
    this._safeSetCapability(mapping.capability, value);
  }

  /**
   * v5.5.118: Capabilities that can be dynamically added for lights
   */
  static get DYNAMIC_CAPABILITIES() {
    return [
      'onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation',
      'light_mode'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic addition
   */
  async _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      if (HybridLightBase.DYNAMIC_CAPABILITIES.includes(capability)) {
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

  /**
   * v5.5.291: CRITICAL FIX - Register capabilities with Homey's flow system
   * This ensures built-in flow cards ("Light turned on/off", "Brightness changed") fire correctly
   * Without this, setCapabilityValue() doesn't trigger Homey's flow cards!
   */
  async _registerHomeyCapabilities(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[HYBRID-LIGHT] ⚠️ No endpoint 1 found, skipping Homey capability registration');
      return;
    }

    try {
      // Register onoff with ON_OFF cluster (0x0006) for flow triggers
      if (this.hasCapability('onoff') && endpoint.clusters?.onOff) {
        await super.registerCapability('onoff', 'onOff').catch(e =>
          this.log('[HYBRID-LIGHT] onoff registration skipped:', e.message));
        this.log('[HYBRID-LIGHT] ✅ onoff registered with Homey flows');
      }

      // Register dim with LEVEL_CONTROL cluster (0x0008) for flow triggers
      if (this.hasCapability('dim') && endpoint.clusters?.levelControl) {
        await super.registerCapability('dim', 'levelControl').catch(e =>
          this.log('[HYBRID-LIGHT] dim registration skipped:', e.message));
        this.log('[HYBRID-LIGHT] ✅ dim registered with Homey flows');
      }

      // Register light_temperature with COLOR_CONTROL cluster (0x0300) for flow triggers
      if (this.hasCapability('light_temperature') && endpoint.clusters?.colorControl) {
        await super.registerCapability('light_temperature', 'colorControl').catch(e =>
          this.log('[HYBRID-LIGHT] light_temperature registration skipped:', e.message));
        this.log('[HYBRID-LIGHT] ✅ light_temperature registered with Homey flows');
      }

      this.log('[HYBRID-LIGHT] ✅ Homey flow capability registration complete');
    } catch (err) {
      this.log('[HYBRID-LIGHT] ⚠️ Homey capability registration error:', err.message);
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
