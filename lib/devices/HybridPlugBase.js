'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { BoundCluster } = require('zigbee-clusters');
const greenPower = require('../green_power');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { ProductValueValidator } = require('../ProductValueValidator');
// v5.5.84: Universal parser for intelligent multi-format support
const {
  parseTuyaFrame,
  getUniversalDPMapping,
  setupUniversalZCLListeners,
} = require('../tuya/UniversalTuyaParser');

/**
 * HybridPlugBase - Base class for ALL Tuya smart plugs
 *
 * v5.5.63: TRUE HYBRID - Listens to BOTH Tuya DP AND ZCL simultaneously
 *          After 15 min, pauses unused protocol methods
 *
 * FEATURES:
 * - On/Off control (ZCL or Tuya DP)
 * - Energy monitoring (power, voltage, current, energy)
 * - Anti-double initialization
 * - MaxListeners bump
 * - Protocol auto-detection
 * - v5.5.49: MULTI-FALLBACK Tuya DP handling
 *
 * FALLBACK CHAIN:
 * - P1: BoundCluster.bind() (Athom SDK)
 * - P2: cluster.on('response') (Community)
 * - P3: endpoint.on('frame') (Raw)
 * - P4: TuyaEF00Manager (Legacy)
 *
 * SUPPORTED PLUG TYPES:
 * - Smart plug (basic on/off)
 * - Energy monitoring plug
 * - USB outlets
 * - Power strips (single device, not multi-gang)
 */
class HybridPlugBase extends ZigBeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  get plugCapabilities() {
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS011F/TS0121 documentation
   * https://www.zigbee2mqtt.io/devices/TS011F_plug_1.html
   */
  get dpMappings() {
    return {
      // Core control
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      9: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true },

      // Child lock / Button lock
      7: { capability: null, setting: 'child_lock' }, // true/false

      // Countdown timer (seconds)
      11: { capability: null, internal: 'countdown', writable: true },

      // Power on behavior (0=off, 1=on, 2=previous)
      14: { capability: null, setting: 'power_on_behavior' },
      121: { capability: null, setting: 'power_on_behavior' }, // Alternative DP

      // Energy monitoring
      17: { capability: 'measure_current', divisor: 1000 },   // mA → A
      18: { capability: 'measure_power', divisor: 10 },       // W * 10
      19: { capability: 'measure_voltage', divisor: 10 },     // V * 10
      20: { capability: 'meter_power', divisor: 100 },        // kWh * 100
      21: { capability: null, internal: 'frequency', divisor: 100 }, // Hz

      // LED indicator mode (0=off, 1=on/off_state, 2=position)
      26: { capability: null, setting: 'indicator_mode' },
      27: { capability: null, setting: 'indicator_mode' }, // Alternative DP

      // Advanced energy
      101: { capability: null, internal: 'power_factor', divisor: 10 },
      102: { capability: null, setting: 'max_power_alert' }, // W threshold
      103: { capability: null, setting: 'energy_reset' }, // Reset meter
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridPlugInited) {
      this.log('[HYBRID-PLUG] ⚠️ Already initialized');
      return;
    }
    this._hybridPlugInited = true;

    // v5.6.2: Initialize intelligent value validator
    const driverType = this.driver?.id || 'plug_smart';
    const productType = ProductValueValidator.detectProductType(driverType);
    this._valueValidator = ProductValueValidator.createDeviceValidator(this, productType);
    this.log(`[VALIDATOR] 🎯 Initialized for productType: ${productType}`);

    // Reject phantom sub-devices
    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable(`⚠️ Phantom device (subDevice ${data.subDeviceId}). Delete this.`).catch(() => { });
      return;
    }

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log(`║          HYBRID PLUG BASE ${getAppVersionPrefixed()}`.padEnd(62) + '║');
    this.log(`║ Model: ${this._protocolInfo.modelId} | Mode: ${this._protocolInfo.protocol}`);
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

    // Register on/off capability listener
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._setOnOff(value);
      });
    }

    // v5.5.163: Start energy capability watchdog - removes unused energy caps after 15min
    this._startEnergyCapabilityWatchdog();

    this.log('[HYBRID-PLUG] ✅ Initialization complete (TRUE HYBRID mode)');
  }

  /**
   * v5.5.340: MEMORY LEAK PREVENTION - Cleanup lifecycle method
   * Inspired by JohanBendz/com.philips.hue.zigbee PR#679
   */
  async onUninit() {
    this.log('[HYBRID-PLUG] 🧹 onUninit() - Cleaning up resources...');

    // Clear energy watchdog timer
    if (this._energyWatchdogTimer) {
      this.homey.clearTimeout(this._energyWatchdogTimer);
      this._energyWatchdogTimer = null;
      this.log('[CLEANUP] ✓ Cleared energy watchdog timer');
    }

    // Cleanup Protocol Auto-Optimizer
    if (this.protocolOptimizer) {
      this.protocolOptimizer.removeAllListeners?.();
      this.protocolOptimizer = null;
      this.log('[CLEANUP] ✓ Cleaned up Protocol Auto-Optimizer');
    }

    // Clear stored references
    this.zclNode = null;
    this._energyCapReceived = null;

    this.log('[HYBRID-PLUG] 🧹 Cleanup complete');
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
    const driverType = this.driver?.id || 'unknown_plug';

    this.log(`[PLUG] 🔍 Analyzing config for: ${manufacturerName} / ${productId} (${driverType})`);

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
      this.log(`[PLUG] 🔄 Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[PLUG] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[PLUG] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[PLUG] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[PLUG] ⭐ Special handling: ${config.specialHandling}`);
    }
  }

  /**
   * v5.5.163: Energy capability watchdog
   * Removes measure_power, measure_voltage, measure_current, meter_power
   * if they haven't received any value after 15 minutes
   */
  _startEnergyCapabilityWatchdog() {
    const WATCHDOG_DELAY = 15 * 60 * 1000; // 15 minutes
    const ENERGY_CAPABILITIES = ['measure_power', 'measure_voltage', 'measure_current', 'meter_power'];

    // Track which capabilities received values
    this._energyCapReceived = {};

    this.log('[WATCHDOG] 🕐 Energy capability watchdog started (15 min timeout)');

    this._energyWatchdogTimer = this.homey.setTimeout(async () => {
      this.log('[WATCHDOG] ⏰ Checking energy capabilities after 15 minutes...');

      for (const cap of ENERGY_CAPABILITIES) {
        if (!this.hasCapability(cap)) continue;

        const value = this.getCapabilityValue(cap);
        const received = this._energyCapReceived[cap];

        // Remove capability if: no value received AND current value is null/undefined/0
        if (!received && (value === null || value === undefined || value === 0)) {
          try {
            await this.removeCapability(cap);
            this.log(`[WATCHDOG] 🗑️ Removed unused capability: ${cap} (no data received)`);
          } catch (e) {
            this.log(`[WATCHDOG] ⚠️ Could not remove ${cap}: ${e.message}`);
          }
        } else {
          this.log(`[WATCHDOG] ✅ Keeping ${cap} (value=${value}, received=${received})`);
        }
      }
    }, WATCHDOG_DELAY);
  }

  /**
   * v5.5.922: FIXED - Use correct settings keys (zb_model_id, zb_manufacturer_name)
   * Previous version used wrong keys causing TS0601 to be detected as ZCL instead of TUYA_DP
   */
  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData?.() || {};
    
    // v5.5.922: Try multiple sources for model ID
    const modelId = settings.zb_model_id || settings.zb_modelId || 
                    store.modelId || store.productId || 
                    data.modelId || data.productId || '';
    
    // v5.5.922: Try multiple sources for manufacturer name
    const mfr = settings.zb_manufacturer_name || settings.zb_manufacturerName || 
                store.manufacturerName || data.manufacturerName || '';
    
    // TS0601 devices ALWAYS use Tuya DP protocol
    const isTuyaDP = modelId.toUpperCase() === 'TS0601' || modelId.toUpperCase().startsWith('TS0601') || 
                     mfr.toUpperCase().startsWith('_TZE');

    this.log(`[PLUG] 🔍 Protocol detection: model=${modelId}, mfr=${mfr}, isTuyaDP=${isTuyaDP}`);
    return {
      protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL',
      isTuyaDP,
      modelId,
      mfr
    };
  }

  async _migrateCapabilities() {
    const required = ['onoff'];
    for (const cap of required) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  _bumpMaxListeners(zclNode) {
    try {
      const max = this.maxListeners;
      if (!zclNode?.endpoints) return;

      // v5.5.57: Log Green Power analysis and filter usable endpoints
      greenPower.logEndpointAnalysis(zclNode, this.log.bind(this));
      const usableEndpoints = greenPower.getUsableEndpoints(zclNode);

      for (const { endpoint } of usableEndpoints) {
        if (typeof endpoint.setMaxListeners === 'function') {
          endpoint.setMaxListeners(max);
        }
        for (const cluster of Object.values(endpoint?.clusters || {})) {
          if (typeof cluster?.setMaxListeners === 'function') {
            cluster.setMaxListeners(max);
          }
        }
      }
    } catch (e) { }
  }

  /**
   * v5.5.49: MULTI-FALLBACK Tuya DP mode
   */
  async _setupTuyaDPMode() {
    this.log('[TUYA] ════════════════════════════════════════════════════');
    this.log('[TUYA] Setting up MULTI-FALLBACK Tuya DP mode for plug...');
    this.log('[TUYA] ════════════════════════════════════════════════════');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[TUYA] ⚠️ No endpoint 1');
      return;
    }

    // Track which methods succeeded
    this._tuyaListeners = {
      boundCluster: false,
      clusterEvents: false,
      rawFrames: false,
      legacyManager: false,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 1: BoundCluster (Athom SDK pattern)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this._setupTuyaBoundCluster(endpoint);
    } catch (e) {
      this.log('[TUYA-P1] BoundCluster failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 2: Cluster event listeners (Community pattern)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this._setupTuyaClusterEvents(endpoint);
    } catch (e) {
      this.log('[TUYA-P2] Cluster events failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 3: Raw frame listener
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this._setupRawFrameListener(endpoint);
    } catch (e) {
      this.log('[TUYA-P3] Raw frames failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 4: Legacy TuyaEF00Manager
    // ═══════════════════════════════════════════════════════════════════════
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this.log(`[TUYA-P4] 📥 DP${dpId} = ${value}`);
        this._handleDP(dpId, value);
      });
      this._tuyaListeners.legacyManager = true;
      this.log('[TUYA-P4] ✅ TuyaEF00Manager listener registered');
    }

    // Log summary
    this.log('[TUYA] ════════════════════════════════════════════════════');
    this.log('[TUYA] FALLBACK STATUS:');
    this.log(`[TUYA]   P1 BoundCluster:   ${this._tuyaListeners.boundCluster ? '✅' : '❌'}`);
    this.log(`[TUYA]   P2 ClusterEvents:  ${this._tuyaListeners.clusterEvents ? '✅' : '❌'}`);
    this.log(`[TUYA]   P3 RawFrames:      ${this._tuyaListeners.rawFrames ? '✅' : '❌'}`);
    this.log(`[TUYA]   P4 LegacyManager:  ${this._tuyaListeners.legacyManager ? '✅' : '❌'}`);
    this.log('[TUYA] ════════════════════════════════════════════════════');
  }

  /**
   * P1: Setup TuyaBoundCluster (Athom SDK pattern)
   */
  async _setupTuyaBoundCluster(endpoint) {
    this.log('[TUYA-P1] Setting up BoundCluster...');

    const device = this;

    class TuyaPlugBoundCluster extends BoundCluster {
      response(payload) {
        device.log('[TUYA-BOUND] 📥 response');
        device._processTuyaPayload(payload);
      }
      reporting(payload) {
        device.log('[TUYA-BOUND] 📥 reporting');
        device._processTuyaPayload(payload);
      }
      dataReport(payload) {
        device.log('[TUYA-BOUND] 📥 dataReport');
        device._processTuyaPayload(payload);
      }
    }

    const clusterNames = ['tuya', 'tuyaSpecific', 'manuSpecificTuya', 61184, 0xEF00];

    for (const name of clusterNames) {
      try {
        endpoint.bind(name, new TuyaPlugBoundCluster());
        this.log(`[TUYA-P1] ✅ BoundCluster bound: ${name}`);
        this._tuyaListeners.boundCluster = true;
        return;
      } catch (e) { /* try next */ }
    }
    this.log('[TUYA-P1] ⚠️ Could not bind BoundCluster');
  }

  /**
   * P2: Setup cluster event listeners
   */
  async _setupTuyaClusterEvents(endpoint) {
    this.log('[TUYA-P2] Setting up cluster events...');

    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.tuyaSpecific
      || endpoint.clusters?.[61184]
      || endpoint.clusters?.[0xEF00];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[TUYA-P2] Tuya cluster not found or no .on()');
      return;
    }

    const events = ['response', 'reporting', 'dataReport', 'dp'];
    for (const eventName of events) {
      tuyaCluster.on(eventName, (data, ...args) => {
        this.log(`[TUYA-P2] 📥 ${eventName} event`);
        if (eventName === 'dp' && args.length >= 1) {
          this._handleDP(data, args[0]);
        } else {
          this._processTuyaPayload(data);
        }
      });
    }
    this.log('[TUYA-P2] ✅ Event listeners registered');
    this._tuyaListeners.clusterEvents = true;
  }

  /**
   * P3: Setup raw frame listener
   */
  _setupRawFrameListener(endpoint) {
    this.log('[TUYA-P3] Setting up raw frame listener...');

    if (typeof endpoint.on !== 'function') return;

    endpoint.on('frame', (frame) => {
      if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
        this.log('[TUYA-P3] 📥 Raw frame received');
        if (frame.data && frame.data.length > 2) {
          this._parseTuyaRawFrame(frame.data);
        }
      }
    });
    this.log('[TUYA-P3] ✅ Raw frame listener registered');
    this._tuyaListeners.rawFrames = true;
  }

  /**
   * Process Tuya payload from BoundCluster or events
   */
  _processTuyaPayload(data) {
    if (!data) return;
    if (data.dpValues && Buffer.isBuffer(data.dpValues)) {
      this._parseTuyaRawFrame(Buffer.concat([Buffer.alloc(2), data.dpValues]));
    } else if (data.dp !== undefined) {
      this._handleDP(data.dp, data.value || data.data);
    }
  }

  /**
   * v5.5.84: Parse raw Tuya frame with multi-format support
   * Uses UniversalTuyaParser for intelligent parsing
   */
  _parseTuyaRawFrame(buffer) {
    try {
      // Use universal multi-format parser
      const results = parseTuyaFrame(buffer, this.log.bind(this));

      for (const { dpId, value } of results) {
        // v5.5.63: Register hit with optimizer
        if (this.protocolOptimizer) {
          this.protocolOptimizer.registerHit('tuya', dpId, value);
        }
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('tuya')) {
          this._handleDP(dpId, value);
        }
      }
    } catch (e) {
      this.log('[TUYA-RAW] Parse error:', e.message);
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL mode for plug...');

    const endpoint = zclNode?.endpoints?.[1];
    const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

    if (onOffCluster && this.hasCapability('onoff')) {
      onOffCluster.on('attr.onOff', (value) => {
        // v5.5.63: Register hit with optimizer
        if (this.protocolOptimizer) {
          this.protocolOptimizer.registerHit('zcl', 'onOff', value);
        }
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) {
          this.log(`[ZCL] onoff = ${value}`);
          this.setCapabilityValue('onoff', value).catch(() => { });
        }
      });

      // Read initial state
      onOffCluster.readAttributes(['onOff']).then(data => {
        if (data?.onOff != null) {
          this.setCapabilityValue('onoff', data.onOff).catch(() => { });
        }
      }).catch(() => { });
    }

    // Energy monitoring clusters
    const meteringCluster = endpoint?.clusters?.seMetering;
    const electricalCluster = endpoint?.clusters?.haElectricalMeasurement;

    if (meteringCluster) {
      meteringCluster.on('attr.instantaneousDemand', (value) => {
        this.log(`[ZCL] power = ${value}W`);
        this.setCapabilityValue('measure_power', parseFloat(value)).catch(() => { });
      });
    }

    if (electricalCluster) {
      electricalCluster.on('attr.activePower', (value) => {
        // Z2M-style: activePower is in deciWatts, convert to Watts
        const watts = value / 10;
        if (watts >= 0 && watts <= 50000) {
          this.setCapabilityValue('measure_power', parseFloat(watts)).catch(() => { });
        }
      });
      electricalCluster.on('attr.rmsVoltage', (value) => {
        // v5.5.198: Z2M-style voltage handling
        // ZCL reports in deciVolts (2300 = 230V), but some devices report in mV
        let volts = value;
        if (value > 3000) {
          // Value in millivolts (e.g., 230000 mV = 230V)
          volts = value / 1000;
        } else if (value > 300) {
          // Value in decivolts (e.g., 2300 = 230V)
          volts = value / 10;
        }
        // Sanity check for EU/US voltage ranges
        if (volts >= 80 && volts <= 280) {
          this.setCapabilityValue('measure_voltage', parseFloat(volts)).catch(() => { });
        }
      });
      electricalCluster.on('attr.rmsCurrent', (value) => {
        // Z2M-style: rmsCurrent is in milliAmps, convert to Amps
        const amps = value / 1000;
        if (amps >= 0 && amps <= 100) {
          this.setCapabilityValue('measure_current', parseFloat(amps)).catch(() => { });
        }
      });
    }

    // v5.5.84: Universal ZCL listeners for maximum coverage
    try {
      setupUniversalZCLListeners(this, zclNode, {});
    } catch (e) {
      this.log('[ZCL-UNIVERSAL] ⚠️ Warning:', e.message);
    }
  }

  _handleDP(dpId, rawValue) {
    const mapping = this.dpMappings[dpId];
    if (!mapping) {
      // v5.8.5: PERMISSIVE MODE - Log and attempt auto-inference for unknown DPs
      this._handleUnknownDP(dpId, rawValue);
      return;
    }

    let value = typeof rawValue === 'number' ? rawValue :
      Buffer.isBuffer(rawValue) ? rawValue.readIntBE(0, rawValue.length) : rawValue;

    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);

    // v5.6.1: Apply manufacturer-specific energy scaling
    value = this._applyEnergyScaling(mapping.capability, value);

    // v5.6.2: Use intelligent validator for auto-correction
    if (this._valueValidator && mapping.capability) {
      const validation = this._valueValidator.validate(value, mapping.capability);

      if (!validation.isValid) {
        this.log(`[VALIDATOR] ❌ ${mapping.capability}: ${validation.message}`);
        return; // Reject invalid value
      }

      if (validation.correction) {
        this.log(`[VALIDATOR] 🔧 ${mapping.capability}: ${validation.message}`);
        value = validation.correctedValue;
      }
    }

    // v5.5.107: Fallback sanity checks (if validator not available)
    if (value === null || value === undefined) return;

    this.log(`[DP] DP${dpId} → ${mapping.capability} = ${value}`);

    // v5.5.118: Use safe setter with dynamic capability addition
    this._safeSetCapability(mapping.capability, value);
  }

  _handleUnknownDP(dpId, rawValue) {
    let v = typeof rawValue === 'number' ? rawValue :
      Buffer.isBuffer(rawValue) ? rawValue.readIntBE(0, rawValue.length) : rawValue;
    this.log(`[DP-PERMISSIVE] ❓ DP${dpId} = ${v} (${typeof v})`);
    if (typeof v !== 'number' || v <= 1) return;
    if (v > 100 && v < 300000 && [101,105,112].includes(dpId))
      this._safeSetCapability('measure_power', v / 10);
    else if (v > 1000 && v < 2800000 && [102,106,113].includes(dpId))
      this._safeSetCapability('measure_voltage', v / 10);
    else if (v > 0 && v < 200000 && [103,107,114].includes(dpId))
      this._safeSetCapability('measure_current', v / 1000);
  }

  /**
   * v5.6.1: Apply manufacturer-specific energy scaling
   * Handles brands like Lidl Silvercrest that report Wh instead of kWh
   */
  _applyEnergyScaling(capability, value) {
    const config = this._manufacturerConfig;
    if (!config?.energyScaling) return value;

    const scaling = config.energyScaling;

    // Apply energy multiplier (e.g., 0.001 for Wh→kWh conversion)
    if (capability === 'meter_power' && scaling.energy_multiplier !== 1) {
      const scaled = value * scaling.energy_multiplier;
      this.log(`[SCALING] meter_power: ${value} × ${scaling.energy_multiplier} = ${scaled} kWh`);
      return scaled;
    }

    return value;
  }

  /**
   * v5.5.118: Capabilities that can be dynamically added for plugs
   */
  static get DYNAMIC_CAPABILITIES() {
    return [
      'onoff', 'measure_power', 'measure_voltage', 'measure_current',
      'meter_power', 'measure_temperature'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic addition
   * v5.5.163: Track energy capability reception for watchdog
   */
  async _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      if (HybridPlugBase.DYNAMIC_CAPABILITIES.includes(capability)) {
        try {
          await this.addCapability(capability);
          this.log(`[CAP] ✨ DYNAMIC ADD: ${capability} (detected from DP/ZCL data)`);
        } catch (e) {
          this.log(`[CAP] ⚠️ Could not add ${capability}: ${e.message}`);
          return;
        }
      } else {
        return; // Silent for non-dynamic
      }
    }

    // v5.5.163: Mark energy capability as received for watchdog
    if (this._energyCapReceived && ['measure_power', 'measure_voltage', 'measure_current', 'meter_power'].includes(capability)) {
      this._energyCapReceived[capability] = true;
    }

    this.setCapabilityValue(capability, value).catch(() => { });
  }

  async _setOnOff(value) {
    this.log(`[PLUG] Setting onoff = ${value}`);

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

  async registerCapability(capabilityId, clusterId, opts) {
    // v5.5.63: Check if ZCL is active
    if (this.protocolOptimizer && !this.protocolOptimizer.isActive('zcl')) return;
    return super.registerCapability(capabilityId, clusterId, opts);
  }

  /**
   * v5.5.929: Handle settings changes for LED indicator and power-on behavior
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    for (const key of changedKeys) {
      try {
        switch (key) {
          case 'indicator_mode':
            await this.setIndicatorMode(newSettings[key]);
            break;
          case 'power_on_behavior':
            await this.setPowerOnBehavior(newSettings[key]);
            break;
        }
      } catch (e) {
        this.error(`[SETTINGS] Failed to apply ${key}:`, e.message);
      }
    }
  }

  /**
   * v5.5.929: Set LED indicator mode via DP26/27
   * @param {string} mode - 'off', 'relay', 'inverted', 'always_on'
   */
  async setIndicatorMode(mode) {
    const modeMap = { off: 0, relay: 1, inverted: 2, always_on: 3 };
    const dpValue = modeMap[mode] ?? 1;
    
    this.log(`[PLUG] 💡 Setting LED indicator: ${mode} (DP26=${dpValue})`);
    
    if (this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.sendDP(26, dpValue, 'enum');
    } else {
      // Try direct cluster access
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya || endpoint?.clusters?.[0xEF00];
      if (tuyaCluster?.datapoint) {
        await tuyaCluster.datapoint({ dp: 26, datatype: 4, data: Buffer.from([dpValue]) });
      }
    }
    return true;
  }

  /**
   * v5.5.929: Set power-on behavior via DP14/121
   * @param {string} behavior - 'off', 'on', 'memory'
   */
  async setPowerOnBehavior(behavior) {
    const behaviorMap = { off: 0, on: 1, memory: 2 };
    const dpValue = behaviorMap[behavior] ?? 2;
    
    this.log(`[PLUG] ⚡ Setting power-on behavior: ${behavior} (DP14=${dpValue})`);
    
    if (this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.sendDP(14, dpValue, 'enum');
    } else {
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya || endpoint?.clusters?.[0xEF00];
      if (tuyaCluster?.datapoint) {
        await tuyaCluster.datapoint({ dp: 14, datatype: 4, data: Buffer.from([dpValue]) });
      }
    }
    return true;
  }

  async onDeleted() {
    // v5.5.63: Cleanup optimizer
    if (this.protocolOptimizer) {
      this.protocolOptimizer.destroy();
      this.protocolOptimizer = null;
    }
    // v5.5.163: Cleanup watchdog timer
    if (this._energyWatchdogTimer) {
      this.homey.clearTimeout(this._energyWatchdogTimer);
      this._energyWatchdogTimer = null;
    }
  }
}

module.exports = HybridPlugBase;
