'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


const BaseUnifiedDevice = require('./BaseUnifiedDevice');
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
const { ensureManufacturerSettings } = require('../helpers/ManufacturerNameHelper');

// Learning period: 15 minutes
const LEARNING_PERIOD_MS =safeMultiply(15, 60) * 1000;

/**
 * 
 *           HYBRID LIGHT BASE - v5.5.130 TRUE HYBRID (ZCL + Tuya DP)           
 * 
 *                                                                               
 *   FEATURES:                                                                   
 *   - On / Off, Dim, Color Temperature, RGB control                               
 *   - TRUE HYBRID: Listens to BOTH ZCL AND Tuya DP simultaneously              
 *   - Protocol Auto-Optimizer: 15 min learning period                           
 *   - Intelligent capability discovery from data                                
 *   - Uses moveToLevelWithOnOff for proper dimming                              
 *                                                                               
 *   SUPPORTED LIGHT TYPES:                                                      
 *   - Dimmable bulbs, Color temperature bulbs                                   
 *   - RGB / RGBW bulbs, LED strips, LED controllers                               
 * 
 */
class UnifiedLightBase extends BaseUnifiedDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  /** Override in subclass for specific light type */
  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 10, min: 0, max: 1000 },      // 0-1000  0-1
      3: { capability: 'light_temperature', divisor: 1000 },          // 0-1000  0-1
      4: { capability: 'light_mode' },                                 // 0=white, 1=color
      5: { capability: 'light_hue', divisor: 360 },
      6: { capability: 'light_saturation', divisor: 1000 },
      21: { capability, internal: 'power_on_behavior' },
      24: { capability, internal: 'hsv_alt' },
      25: { capability: 'dim', divisor: 1000 }
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridLightInited) {
      this.log('[HYBRID-LIGHT]  Already initialized');
      return;
    }
    this._hybridLightInited = true;

    // v5.8.57: Ensure zb_manufacturer_name / zb_model_id settings populated
    await ensureManufacturerSettings(this).catch(() => {});

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable(' Phantom device. Delete this.').catch(() => { });
      return;
    }

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    // v5.11.16: Force Tuya DP for TS0601 / _TZE devices even if ManufacturerVariationManager set mixed
    if (this._protocolInfo.isTuyaDP && !this._isPureTuyaDP) {
      this._isPureTuyaDP = true;
      this._usesZCL = false;
    }

    this.log('');
    this.log('');
    this.log('     HYBRID LIGHT BASE v5.5.130 - TRUE HYBRID                 ');
    this.log(` Model: ${this._protocolInfo.modelId} | Mfr: ${this._protocolInfo.mfr}`);
    this.log('');
    this.log('  Listening to BOTH ZCL AND Tuya DP simultaneously         ');
    this.log('  15 min learning period to optimize protocol               ');
    this.log('');

    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

    // 
    // v5.5.130: Initialize Protocol Auto-Optimizer (15 min learning)
    // 
    this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
    await this.protocolOptimizer.initialize(zclNode);

    this.protocolOptimizer.on('decision', (mode, stats) => {
      this.log(`[AUTO-OPT]  Learning complete: ${mode}`);
      this.log(`[AUTO-OPT] Stats: Tuya=${stats.protocols.tuya.hits}, ZCL=${stats.protocols.zcl.hits}`);
      });

    this.protocolOptimizer.on('learning_complete', (discoveredCaps) => {
      // v5.5.202: Safe capability discovery - handle both Map and object types
      try {
        if (discoveredCaps && typeof discoveredCaps.keys === 'function') {
          this.log(`[AUTO-OPT]  Discovered capabilities: ${[...discoveredCaps.keys()].join(', ')}`);
        } else if (discoveredCaps && typeof discoveredCaps === 'object') {
          this.log(`[AUTO-OPT]  Discovered capabilities: ${Object.keys(discoveredCaps).join(', ')}`);
        } else {
          this.log('[AUTO-OPT]  Learning complete - no capabilities discovered');
        }
      } catch (err) {
        this.log('[AUTO-OPT]  Error processing discovered capabilities:', err.message);
      }
    });

    // 
    // v5.5.130: Setup BOTH protocols simultaneously - optimizer will decide later
    // 
    this._protocolStats = {
      tuya: { received: 0, lastTime },
      zcl: { received: 0, lastTime }
    };

    await Promise.all([
      this._setupTuyaDPMode().catch(e => this.log('[HYBRID] Tuya DP setup skipped:', e.message)),
      this._setupZCLMode(zclNode).catch(e => this.log('[HYBRID] ZCL setup skipped:', e.message))
    ]);

    // v5.5.291: CRITICAL FIX - Register capabilities with Homey's flow system
    // This ensures built-in flow cards ("Light turned on / off") fire correctly
    await this._registerHomeyCapabilities(zclNode);

    this._registerCapabilityListeners();

    // v5.8.49: ZCL reporting + initial state for ZCL lights
    if (!this._protocolInfo.isTuyaDP) {
      await this._setupZCLReporting(zclNode).catch(e => this.log(`[LIGHT]  ZCL reporting: ${e.message}`));
      await this._readInitialLightState(zclNode).catch(e => this.log(`[LIGHT]  Initial state read: ${e.message}`));
    }

    // Schedule capability status report after learning period
    this._learningTimer = this.homey.setTimeout(() => {
      this._logLearningReport();
    }, LEARNING_PERIOD_MS);

    this.log('[HYBRID-LIGHT]  TRUE HYBRID mode active - listening to ALL protocols');
  }

  /**
   * v5.6.0: Applique la configuration dynamique basÃ©e sur manufacturerName
   */
  async _applyManufacturerConfig() {
    // v5.5.916: Fixed manufacturer / model retrieval - use settings / store like other drivers
    const settings = this.getSettings?.() || {};const store = this.getStore?.() || {};const data = this.getData() || {};
    
    const manufacturerName = settings.zb_manufacturer_name || 
                             store.manufacturerName || 
                             data.manufacturerName || 
                             'unknown';
    const productId = settings.zb_model_id || 
                      store.modelId || 
                      data.productId || 
                      'unknown';
    const driverType = this.driver?.id || 'unknown_light';this.log(`[LIGHT]  Config: ${manufacturerName} / ${productId} (${driverType})`);

    // v5.8.80: Apply registry profile if available
    const profile = this.getDeviceProfile?.() || this._deviceProfile;if (profile && profile.dpMappings) {
      this._dynamicDpMappings = { ...this.dpMappings, ...profile.dpMappings };
      this.log(`[LIGHT]  Registry profile: ${profile.id}`);
    }
    if (profile?.quirks) this._profileQuirks = profile.quirks;

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
      this.log(`[LIGHT]  Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[LIGHT]  Protocol: ${config.protocol}`);
    this.log(`[LIGHT]  Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[LIGHT]  ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[LIGHT]  Special handling: ${config.specialHandling}`);
    }
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};const store = this.getStore?.() || {};// v5.6.0: FIX - Use correct settings keys (zb_model_id NOT zb_modelId)
    const modelId = settings.zb_model_id || settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = CI.equalsCI(modelId, 'TS0601') || CI.startsWithCI(mfr, '_TZE');

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
      ep1.clusters?.[CLUSTERS.TUYA_EF00] ||
      ep1.clusters?.[CLUSTERS.TUYA_EF00];

    if (tuyaCluster && typeof tuyaCluster.on === 'function') {
      // Listen for DP reports
      tuyaCluster.on('response', (status, transId, dp, dataType, data) => {
        this._protocolStats.tuya.received++);
        this._protocolStats.tuya.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('tuya', dp, data);
        this._handleDP(dp, data);
      });

      tuyaCluster.on('datapoint', (dp, value, dataType) => {
        this._protocolStats.tuya.received++);
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

      this.log('[TUYA-DP]  Tuya DP listeners active');
    }

    // Fallback to tuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._protocolStats.tuya.received++);
        this._protocolStats.tuya.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('tuya', dpId, value);
        this._handleDP(dpId, value);
      });
      this.log('[TUYA-DP]  tuyaEF00Manager fallback active');
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL listeners...');

    const endpoint = zclNode?.endpoints?.[1];
    const levelCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl;
    const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
    const colorCluster = endpoint?.clusters?.colorControl || endpoint?.clusters?.lightingColorCtrl;

    // On / Off with protocol tracking
    if (onOffCluster) {
      onOffCluster.on('attr.onOff', (value) => {
        this._protocolStats.zcl.received++);
        this._protocolStats.zcl.lastTime = Date.now();
        this.protocolOptimizer?.registerHit('zcl', 'onOff', value, 'onoff');
        this._safeSetCapability('onoff', value);
      });
      this.log('[ZCL]  onOff listener');
    }



    // Dim level with protocol tracking
    if (levelCluster) {
      levelCluster.on('attr.currentLevel', (value) => {
        this._protocolStats.zcl.received++);
        this._protocolStats.zcl.lastTime = Date.now();
        const dim = Math.round(safeParse(value, 254) / 254 * 100) / 100;

        this.protocolOptimizer?.registerHit('zcl', 'levelControl', dim, 'dim');
        this._safeSetCapability('dim', dim);
      });
      this.log('[ZCL]  levelControl listener');
    }

    // Color temperature with protocol tracking
    if (colorCluster) {
      colorCluster.on('attr.colorTemperatureMireds', (value) => {
        this._protocolStats.zcl.received++);
        this._protocolStats.zcl.lastTime = Date.now();
        const temp = Math.max(0, Math.min(1, (value - 153) / (500 - 153)));
        this.protocolOptimizer?.registerHit('zcl', 'colorControl', temp, 'light_temperature');
        this._safeSetCapability('light_temperature', temp);
      });

      colorCluster.on('attr.currentHue', (value) => {
        this._protocolStats.zcl.received++);
        this._protocolStats.zcl.lastTime = Date.now();
        const hue = safeParse(value, 254);
        this.protocolOptimizer?.registerHit('zcl', 'colorControl', hue, 'light_hue');
        this._safeSetCapability('light_hue', hue);
      });

      colorCluster.on('attr.currentSaturation', (value) => {
        this._protocolStats.zcl.received++);
        this._protocolStats.zcl.lastTime = Date.now();
        const sat = safeParse(value, 254);
        this.protocolOptimizer?.registerHit('zcl', 'colorControl', sat, 'light_saturation');
        this._safeSetCapability('light_saturation', sat);
      });

      this.log('[ZCL]  colorControl listeners');
    }

    // v5.5.84: Universal ZCL listeners for maximum coverage
    try {
      setupUniversalZCLListeners(this, zclNode, {});
    } catch (e) {
      this.log('[ZCL-UNIVERSAL]  Warning:', e.message);
    }
  }

  /**
   * v5.5.130: Log learning report after 15 minutes
   */
  _logLearningReport() {
    this.log('');
    this.log('');
    this.log(' LEARNING REPORT (15 min after init)');
    this.log('');
    this.log(`Tuya DP: ${this._protocolStats.tuya.received} messages`);
    this.log(`ZCL:     ${this._protocolStats.zcl.received} messages`);

    const preferred = this._protocolStats.tuya.received > this._protocolStats.zcl.received
      ? 'TUYA_DP' : this._protocolStats.zcl.received > 0 ? 'ZCL' : 'UNKNOWN';
    this.log(`Preferred protocol: ${preferred}`);

    // Log capability values
    const caps = this.getCapabilities();
    const values = caps.map(c => `${c}=${this.getCapabilityValue(c)}`).join(', ');
    this.log(`Capabilities: ${values}`);
    this.log('');
  }

  _handleDP(dpId, rawValue) {
    const mapping = this.dpMappings[dpId];
    if (!mapping) return;

    let value = typeof rawValue === 'number' ? rawValue : Buffer.isBuffer(rawValue) ? rawValue.readIntBE(0, rawValue.length) : rawValue;

    if (mapping.divisor) value = safeDivide(value, mapping.divisor);
    if (mapping.transform) value = mapping.transform(value);
    if (mapping.min !== undefined) value = Math.max(mapping.min, value);
    if (mapping.max !== undefined) value = Math.min(mapping.max, value);

    // v5.5.107: Sanity checks for light values
    if (value === null || value === undefined) return;
    if (mapping.capability === 'dim' && (value < 0 || value > 1)) {
      this.log(`[DP]  Dim out of range: ${value} - clamping`);
      value = Math.max(0, Math.min(1, value));
    }
    if (mapping.capability === 'light_temperature' && (value < 0 || value > 1)) {
      this.log(`[DP]  Color temp out of range: ${value} - clamping`);
      value = Math.max(0, Math.min(1, value));
    }

    this.log(`[DP] DP${dpId}  ${mapping.capability} = ${value}`);

    // v5.5.118: Use safe setter with dynamic capability addition
    this._safeSetCapability(mapping.capability, value);
  }


  /**
   * v5.5.291: CRITICAL FIX - Register capabilities with Homey's flow system
   * This ensures built-in flow cards ("Light turned on / off", "Brightness changed") fire correctly
   * Without this, this.setCapabilityValue() doesn't trigger Homey's flow cards!
   */
  async _registerHomeyCapabilities(zclNode) {
    // v5.11.16: Skip ZCL cluster binding for TS0601 / _TZE devices (flow triggers work via setCapabilityValue)
    if (this._isPureTuyaDP) {
      this.log('[HYBRID-LIGHT]  Tuya DP device - skipping ZCL capability registration');
      return;
    }
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[HYBRID-LIGHT]  No endpoint 1 found, skipping Homey capability registration');
      return;
    }

    try {
      // Register onoff with ON_OFF cluster (0x0006) for flow triggers
      if (this.hasCapability('onoff') && endpoint.clusters?.onOff) {
        await super.registerCapability('onoff', 'onOff').catch(e =>
          this.log('[HYBRID-LIGHT] onoff registration skipped:', e.message));
        this.log('[HYBRID-LIGHT]  onoff registered with Homey flows');
      }

      // Register dim with LEVEL_CONTROL cluster (0x0008) for flow triggers
      if (this.hasCapability('dim') && endpoint.clusters?.levelControl) {
        await super.registerCapability('dim', 'levelControl').catch(e =>
          this.log('[HYBRID-LIGHT] dim registration skipped:', e.message));
        this.log('[HYBRID-LIGHT]  dim registered with Homey flows');
      }

      // Register light_temperature with COLOR_CONTROL cluster (0x0300) for flow triggers
      if (this.hasCapability('light_temperature') && endpoint.clusters?.colorControl) {
        await super.registerCapability('light_temperature', 'colorControl').catch(e =>
          this.log('[HYBRID-LIGHT] light_temperature registration skipped:', e.message));
        this.log('[HYBRID-LIGHT]  light_temperature registered with Homey flows');
      }

      this.log('[HYBRID-LIGHT]  Homey flow capability registration complete');
    } catch (err) {
      this.log('[HYBRID-LIGHT]  Homey capability registration error:', err.message);
    }
  }

  _registerCapabilityListeners() {
    // On / Off
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

  async _sendTuyaDPCommand(dp, value, datatype) {
    if (this.tuyaEF00Manager?.sendTuyaDP) return this.tuyaEF00Manager.sendTuyaDP(dp, datatype, value);
    const ep = this.zclNode?.endpoints?.[1];
    const tc = ep?.clusters?.tuya || ep?.clusters?.[CLUSTERS.TUYA_EF00];
    if (!tc) throw new Error('No Tuya cluster');
    const len = (datatype === 1 || datatype === 4) ? 1 : 4;
    const data = Buffer.alloc(len);
    if (len === 1) data.writeUInt8(value, 0); else data.writeUInt32BE(value, 0);
    const fn = tc.dataRequest || tc.setData;
    if (fn) await fn.call(tc, { status: 0, transid: 0, dp, datatype, length: len, data });
    else throw new Error('No Tuya send method');
  }

  async _setOnOff(value) {
    this.log(`[LIGHT] onoff = ${value}`);

    if (this._isPureTuyaDP) {
      await this._sendTuyaDPCommand(1, value ? 1 : 0, 1);
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

    if (this._isPureTuyaDP) {
      // v5.12.5: Auto-on / off when dimming (Johan SDK3 pattern)
      if (value > 0 && this.getCapabilityValue('onoff') === false) {
        await this._sendTuyaDPCommand(1, 1, 1);
        this._safeSetCapability('onoff', true);
      } else if (value === 0) {
        await this._sendTuyaDPCommand(1, 0, 1);
        this._safeSetCapability('onoff', false);
        return;
      }
      const dpValue = Math.round(value  * 1000); // 0-1 to 0-1000

      await this._sendTuyaDPCommand(2, dpValue, 2);
    } else {
      const endpoint = this.zclNode?.endpoints?.[1];
      const levelCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl;

      if (levelCluster) {
        const level = Math.round(value  * 254);


        // CRITICAL: Use moveToLevelWithOnOff for proper Tuya compatibility
        if (typeof levelCluster.moveToLevelWithOnOff === 'function') {
          await levelCluster.moveToLevelWithOnOff({
            level,
            transitionTime: 0
          });
        } else {
          await levelCluster.moveToLevel({ level, transitionTime: 0 });
          // Also ensure on / off is set correctly
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

    if (this._isPureTuyaDP) {
      const dpValue = Math.round(value  * 1000);
      await this._sendTuyaDPCommand(3, dpValue, 2);
    } else {
      const endpoint = this.zclNode?.endpoints?.[1];
      const colorCluster = endpoint?.clusters?.colorControl || endpoint?.clusters?.lightingColorCtrl;

      if (colorCluster) {
        // v5.12.5: Send tuyaRgbMode disable (Johan SDK3 pattern) before color temp
        await this._tryTuyaRgbMode(0).catch(() => {});
        // Convert 0-1 to mireds (153-500 typical range)
        const mireds = Math.round(153 + value * (500  - 153));
        await colorCluster.moveToColorTemperature({ colorTemperature: mireds, transitionTime: 0 });
      }
    }
  }

  /**
   * v5.12.5: Send Tuya RGB mode enable / disable via ZCL (Johan SDK3 pattern)
   * Required for Tuya ZCL RGB bulbs (TS0505B etc.) to switch between color and white mode
   * @param {number} enable - 1 for RGB mode, 0 for white / temperature mode
   */
  async _tryTuyaRgbMode(enable) {
    const ep = this.zclNode?.endpoints?.[1];
    const colorCluster = ep?.clusters?.colorControl || ep?.clusters?.lightingColorCtrl;
    if (colorCluster?.tuyaRgbMode) {
      await colorCluster.tuyaRgbMode({ enable });
      this.log(`[LIGHT] tuyaRgbMode(${enable}) sent`);
    }
  }

  async _setupZCLReporting(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    if (!ep?.clusters) return;
    const onOff = ep.clusters.onOff || ep.clusters.genOnOff;
    if (onOff?.configureReporting) {
      await onOff.configureReporting({ onOff: { minInterval: 0, maxInterval: 300, minChange: 1 } }).catch(() => {});
    }
    const level = ep.clusters.levelControl || ep.clusters.genLevelCtrl;
    if (level?.configureReporting) {
      await level.configureReporting({ currentLevel: { minInterval: 1, maxInterval: 300, minChange: 5 } }).catch(() => {});
    }
    this.log('[LIGHT]  ZCL reporting configured');
  }


  async _readInitialLightState(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    if (!ep?.clusters) return;
    const onOff = ep.clusters.onOff || ep.clusters.genOnOff;
    if (onOff?.readAttributes && this.hasCapability('onoff')) {
      const a = await onOff.readAttributes(['onOff']).catch(() => null);
      if (a?.onOff !== undefined) await this.setCapabilityValue('onoff', a.onOff).catch(() => {});
    }

    const level = ep.clusters.levelControl || ep.clusters.genLevelCtrl;
    if (level?.readAttributes && this.hasCapability('dim')) {
      const a = await level.readAttributes(['currentLevel']).catch(() => null);
      if (a?.currentLevel !== undefined) await this.setCapabilityValue('dim', Math.max(0, Math.min(1, safeParse(a.currentLevel, 254)))).catch(() => {});

    }
  }

  // v5.8.49: Handle settings changes (SDK3 best practice)
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Call parent onSettings first (handles power_source, battery_type, optimization_mode)
    await super.onSettings({ oldSettings, newSettings, changedKeys });

    this.log(`[LIGHT] [SETTINGS] Changed: ${changedKeys.join(', ')}`);
    for (const key of changedKeys) {
      try {
        if (key === 'power_on_behavior') {
          const val = { off: 0, on: 1, memory: 2 }[newSettings[key]] ?? 2;
          if (this._isPureTuyaDP) {
            await this._sendTuyaDPCommand(21, val, 4);
          } else {
            const ep = this.zclNode?.endpoints?.[1];
            const cl = ep?.clusters?.onOff || ep?.clusters?.genOnOff;
            if (cl?.writeAttributes) await cl.writeAttributes({ startUpOnOff: val }).catch(() => {});
          }
        } else if (key === 'transition_time') {
          this._transitionTime = Math.max(0, parseInt(newSettings[key]) || 0);
        }
        this.log(`[LIGHT] [SETTINGS] Applied ${key} = ${newSettings[key]}`);
      } catch (err) {
        this.log(`[LIGHT] [SETTINGS] Error ${key}: ${err.message}`);
      }
    }
  }

  async registerCapability(capabilityId, clusterId, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(capabilityId, clusterId, opts);
  }
}

module.exports = UnifiedLightBase;



