'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const DeviceTypeManager = require('./DeviceTypeManager');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { getModelId, getManufacturer } = require('../helpers/DeviceDataHelper');

// v5.5.818: BSEED TS0726 FIX - Import OnOffBoundCluster for outputCluster command reception
let OnOffBoundCluster = null;
try {
  OnOffBoundCluster = require('../clusters/OnOffBoundCluster');
} catch (e) {
  console.log('[HybridSwitchBase] OnOffBoundCluster not available:', e.message);
}

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

  constructor(...args) {
    super(...args);
    // v5.5.750: Safe initialization to prevent "Cannot read 'name'" errors
    try {
      this.deviceTypeManager = new DeviceTypeManager();
    } catch (e) {
      console.error('[HybridSwitchBase] DeviceTypeManager init error:', e.message);
      this.deviceTypeManager = null;
    }
  }

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

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log('');
    // Get device type configuration
    const deviceType = this.getSetting('device_type') || 'light';
    const typeConfig = this.deviceTypeManager.getDeviceTypeConfig(deviceType);

    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log(`║          HYBRID SWITCH BASE ${getAppVersionPrefixed()}`.padEnd(62) + '║');
    this.log(`║ Model: ${this._protocolInfo.modelId} | Gangs: ${this.gangCount}`);
    this.log(`║ Mode: ${this._protocolInfo.protocol}`);
    this.log(`║ Device Type: ${typeConfig.icon} ${typeConfig.name}`);
    if (typeConfig.invertLogic) {
      this.log('║ ⚠️ LOGIQUE INVERSÉE activée (radiateur)');
    }
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

    // v5.5.812: Setup additional features
    await this._setupReporting(zclNode).catch(() => { });
    await this._setupPowerMetering(zclNode).catch(() => { });
    await this._readInitialState(zclNode).catch(() => { });

    this.log('[HYBRID-SWITCH] ✅ Initialization complete (TRUE HYBRID mode)');
  }

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    // v5.5.735: Use DeviceDataHelper for consistent manufacturer/model retrieval
    const manufacturerName = getManufacturer(this) || 'unknown';
    const productId = getModelId(this) || 'unknown';
    const driverType = `switch_${this.gangCount}gang`;

    this.log(`[SWITCH] 🔍 Analyzing config for: ${manufacturerName} / ${productId} (${driverType})`);

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
      this._dynamicDpMappings = { ...this.dpMappings, ...config.dpMappings };
      this.log(`[SWITCH] 🔄 Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[SWITCH] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[SWITCH] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[SWITCH] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[SWITCH] ⭐ Special handling: ${config.specialHandling}`);
    }
  }

  _detectProtocol() {
    // v5.5.735: Use DeviceDataHelper for consistent manufacturer/model retrieval
    const modelId = getModelId(this) || '';
    const mfr = getManufacturer(this) || '';
    
    // Also check for Tuya cluster presence (critical for first init)
    let hasTuyaCluster = false;
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      if (ep1?.clusters) {
        const clusterKeys = Object.keys(ep1.clusters);
        hasTuyaCluster = clusterKeys.some(k =>
          k === 'tuya' || k === 'manuSpecificTuya' || k === '61184' || parseInt(k) === 61184
        );
      }
    } catch (e) { /* ignore */ }
    
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE') || hasTuyaCluster;

    return { protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL', isTuyaDP, hasTuyaCluster, modelId, mfr };
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

    // v5.5.812: BSEED TS0726 FIX - Check for special handling that requires command listeners
    const needsCommandListeners = this._specialHandling === 'bseed_ts0726_4gang' ||
      this._manufacturerConfig?.specialHandling === 'bseed_ts0726_4gang';
    
    if (needsCommandListeners) {
      this.log('[ZCL] ⭐ BSEED TS0726 detected - adding ZCL command listeners for physical buttons');
    }

    // For multi-gang, each gang is on a different endpoint
    for (let gang = 1; gang <= this.gangCount; gang++) {
      const endpoint = zclNode?.endpoints?.[gang];
      const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

      if (!onOffCluster) continue;

      const capability = gang === 1 ? 'onoff' : `onoff.gang${gang}`;

      if (this.hasCapability(capability)) {
        // v5.5.818: BSEED TS0726 PHYSICAL BUTTON FIX (Hartmut #1194)
        // These devices send ZCL COMMANDS (toggle/on/off) via outputCluster 6
        // We need BoundCluster to intercept these incoming commands
        if (needsCommandListeners) {
          // Command handler for physical button presses
          const handlePhysicalButton = async (cmdName, newValue) => {
            this.log(`[ZCL-CMD] 🔘 Gang ${gang} PHYSICAL BUTTON: ${cmdName}`);
            if (this.protocolOptimizer) {
              this.protocolOptimizer.registerHit('zcl', `cmd.gang${gang}`, cmdName);
            }
            if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) {
              // For toggle, invert current value
              if (newValue === 'toggle') {
                const currentValue = this.getCapabilityValue(capability);
                newValue = !currentValue;
              }
              this.log(`[ZCL-CMD] ${capability} = ${newValue}`);
              await this.setCapabilityValue(capability, newValue).catch(() => { });
            }
          };

          // v5.5.818: CRITICAL - Use BoundCluster to receive commands from outputCluster
          // BSEED TS0726 sends button presses via onOff outputCluster (cluster 6 in outputClusters)
          if (OnOffBoundCluster && typeof endpoint.bind === 'function') {
            try {
              this.log(`[ZCL] 🔗 Installing OnOffBoundCluster on EP${gang} for physical buttons...`);
              
              const boundCluster = new OnOffBoundCluster({
                onSetOn: () => {
                  this.log(`[ZCL-BOUND] 🔘 Gang ${gang} ON command received`);
                  handlePhysicalButton('boundOn', true);
                },
                onSetOff: () => {
                  this.log(`[ZCL-BOUND] 🔘 Gang ${gang} OFF command received`);
                  handlePhysicalButton('boundOff', false);
                },
                onToggle: () => {
                  this.log(`[ZCL-BOUND] 🔘 Gang ${gang} TOGGLE command received`);
                  handlePhysicalButton('boundToggle', 'toggle');
                }
              });

              endpoint.bind('onOff', boundCluster);
              this.log(`[ZCL] ✅ OnOffBoundCluster installed on EP${gang}`);
            } catch (boundErr) {
              this.log(`[ZCL] ⚠️ BoundCluster install failed on EP${gang}: ${boundErr.message}`);
            }
          }

          // Also bind cluster for command reception (fallback)
          if (typeof onOffCluster.bind === 'function') {
            onOffCluster.bind().then(() => {
              this.log(`[ZCL] ✅ OnOff cluster bound on EP${gang}`);
            }).catch((err) => {
              this.log(`[ZCL] ⚠️ OnOff bind failed on EP${gang}: ${err.message}`);
            });
          }

          // Listen for specific command events (SDK3 pattern - fallback)
          if (typeof onOffCluster.on === 'function') {
            onOffCluster.on('commandOn', () => handlePhysicalButton('commandOn', true));
            onOffCluster.on('commandOff', () => handlePhysicalButton('commandOff', false));
            onOffCluster.on('commandToggle', () => handlePhysicalButton('commandToggle', 'toggle'));
            onOffCluster.on('setOn', () => handlePhysicalButton('setOn', true));
            onOffCluster.on('setOff', () => handlePhysicalButton('setOff', false));
            onOffCluster.on('on', () => handlePhysicalButton('on', true));
            onOffCluster.on('off', () => handlePhysicalButton('off', false));
            onOffCluster.on('toggle', () => handlePhysicalButton('toggle', 'toggle'));
            
            // Generic command handler
            onOffCluster.on('command', (cmdName, payload) => {
              this.log(`[ZCL-CMD] Gang ${gang} command: ${cmdName}`, payload);
              if (cmdName === 'on' || cmdName === 'setOn') {
                handlePhysicalButton(cmdName, true);
              } else if (cmdName === 'off' || cmdName === 'setOff') {
                handlePhysicalButton(cmdName, false);
              } else if (cmdName === 'toggle') {
                handlePhysicalButton(cmdName, 'toggle');
              }
            });
            this.log(`[ZCL] ✅ Command listeners registered for EP${gang} (9 patterns + BoundCluster)`);
          }
        }

        // Standard attribute listener (works for relay switches)
        onOffCluster.on('attr.onOff', (value) => {
          // v5.5.901: Enhanced ZCL diagnostic logging
          const now = Date.now();
          if (!this._zclStats) this._zclStats = {};
          if (!this._zclStats[gang]) this._zclStats[gang] = { count: 0, lastTime: 0 };
          const stats = this._zclStats[gang];
          const interval = stats.lastTime ? now - stats.lastTime : 0;
          stats.count++;
          stats.lastTime = now;
          
          this.log(`[ZCL] 📥 EP${gang}.onOff=${value} type=${typeof value} interval=${interval}ms count=${stats.count}`);
          
          // Register hit with optimizer
          if (this.protocolOptimizer) {
            this.protocolOptimizer.registerHit('zcl', `onOff.gang${gang}`, value);
          }
          // Only process if ZCL protocol is active
          if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) {
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

  _handleDP(dpId, value) {
    if (value === undefined || value === null) return;

    // v5.5.901: Enhanced diagnostic logging
    const now = Date.now();
    const dataType = this._detectDataType(value);
    const rawValue = Buffer.isBuffer(value) ? value.toString('hex') : value;
    
    // Track DP frequency for diagnostics
    if (!this._dpStats) this._dpStats = {};
    if (!this._dpStats[dpId]) this._dpStats[dpId] = { count: 0, lastTime: 0, values: [] };
    const stats = this._dpStats[dpId];
    const interval = stats.lastTime ? now - stats.lastTime : 0;
    stats.count++;
    stats.lastTime = now;
    stats.values.push({ value: rawValue, time: now });
    if (stats.values.length > 10) stats.values.shift(); // Keep last 10
    
    this.log(`[DP] 📥 DP${dpId} type=${dataType} raw=${JSON.stringify(rawValue)} interval=${interval}ms count=${stats.count}`);

    // v5.5.597: Always trigger DP flow for debugging exotic devices
    this._triggerDPFlow(dpId, value);

    const mapping = this.dpMappings[dpId];
    if (!mapping) {
      this.log(`[DP] ⚠️ DP${dpId} unmapped - add to dpMappings if needed`);
      return;
    }

    // Apply transformation if available
    if (mapping.transform) {
      value = mapping.transform(value);
    }

    if (mapping.divisor) {
      value = value / mapping.divisor;
    }

    if (mapping.capability) {
      // Apply device type logic (inversion for radiators)
      if (mapping.capability.startsWith('onoff')) {
        const deviceType = this.getSetting('device_type') || 'light';
        const invertManual = this.getSetting('invert_logic_manual') || false;

        if (invertManual) {
          value = !value;
          this.log(`[DP] 🔄 Manual logic inversion applied: ${!value} → ${value}`);
        } else {
          value = this.deviceTypeManager.applyDeviceLogic(value, deviceType);
          if (deviceType === 'radiator') {
            this.log(`[DP] 🔥 Radiator logic applied: ${!value} → ${value}`);
          }
        }
      }

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
    const originalValue = value;

    // Apply device type logic for outgoing commands (inversion for radiators)
    const deviceType = this.getSetting('device_type') || 'light';
    const invertManual = this.getSetting('invert_logic_manual') || false;

    if (invertManual) {
      value = !value;
      this.log(`[SWITCH] 🔄 Manual inversion: ${originalValue} → ${value}`);
    } else {
      value = this.deviceTypeManager.applyDeviceLogic(value, deviceType);
      if (deviceType === 'radiator') {
        this.log(`[SWITCH] 🔥 Radiator inversion: ${originalValue} → ${value}`);
      }
    }

    this.log(`[SWITCH] ${capability} = ${originalValue} (sent as ${value})`);

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
      'onoff.gang7', 'onoff.gang8',
      'measure_power', 'measure_voltage', 'measure_current', 'meter_power'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic addition
   * v5.5.597: Now triggers universal flow cards for sub-capabilities
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
    
    const oldValue = this.getCapabilityValue(capability);
    await this.setCapabilityValue(capability, value).catch(() => { });
    
    // v5.5.597: Trigger universal sub-capability flow cards
    if (oldValue !== value && capability.includes('.')) {
      this._triggerSubCapabilityFlow(capability, value);
    }
  }

  /**
   * v5.5.597: Trigger universal sub-capability flow card
   */
  async _triggerSubCapabilityFlow(capability, value) {
    try {
      const loader = this.homey?.app?.universalFlowLoader;
      if (loader?.triggerSubCapabilityChanged) {
        await loader.triggerSubCapabilityChanged(this, capability, value);
      }
    } catch (e) { /* Ignore flow errors */ }
  }

  /**
   * v5.5.597: Trigger DP received flow card (call from _handleDP)
   */
  async _triggerDPFlow(dp, value) {
    try {
      const loader = this.homey?.app?.universalFlowLoader;
      if (loader?.triggerDPReceived) {
        await loader.triggerDPReceived(this, dp, value);
      }
    } catch (e) { /* Ignore flow errors */ }
  }

  /**
   * v5.5.901: Detect data type for diagnostic logging
   */
  _detectDataType(value) {
    if (value === null || value === undefined) return 'null';
    if (Buffer.isBuffer(value)) return `buffer[${value.length}]`;
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value >= 0 && value <= 255 ? 'uint8' : 'int32';
      return 'float';
    }
    if (typeof value === 'string') return `str[${value.length}]`;
    if (Array.isArray(value)) return `arr[${value.length}]`;
    if (typeof value === 'object') return 'obj';
    return typeof value;
  }

  /**
   * v5.5.901: Get DP statistics for diagnostics
   */
  getDPStats() {
    return this._dpStats || {};
  }

  /**
   * v5.5.812: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`[SETTINGS] Changed: ${changedKeys.join(', ')}`);

    for (const key of changedKeys) {
      try {
        switch (key) {
          case 'power_on_behavior':
            // DP14: 0=off, 1=on, 2=memory
            const pobValue = { off: 0, on: 1, memory: 2 }[newSettings[key]] ?? 2;
            await this._sendTuyaDP(14, pobValue, 'enum');
            this.log(`[SETTINGS] Power-on behavior: ${newSettings[key]} (DP14=${pobValue})`);
            break;

          case 'led_indicator':
            // DP15: 0=off, 1=on (or inverse depending on device)
            const ledValue = newSettings[key] ? 1 : 0;
            await this._sendTuyaDP(15, ledValue, 'bool');
            this.log(`[SETTINGS] LED indicator: ${newSettings[key]} (DP15=${ledValue})`);
            break;

          case 'device_type':
            this.log(`[SETTINGS] Device type changed to: ${newSettings[key]}`);
            // Re-apply logic for current states
            break;

          case 'invert_logic_manual':
            this.log(`[SETTINGS] Manual invert logic: ${newSettings[key]}`);
            break;

          case 'backlight_mode':
            // Backlight mode: off=0, normal=1, inverted=2 (Z2M compatible)
            const backlightValue = { off: 0, normal: 1, inverted: 2 }[newSettings[key]] ?? 1;
            await this._sendTuyaDP(15, backlightValue, 'enum');
            this.log(`[SETTINGS] Backlight mode: ${newSettings[key]} (DP15=${backlightValue})`);
            break;

          case 'child_lock':
            // Child lock: true=1 (locked), false=0 (unlocked)
            const lockValue = newSettings[key] ? 1 : 0;
            await this._sendTuyaDP(16, lockValue, 'bool');
            this.log(`[SETTINGS] Child lock: ${newSettings[key]} (DP16=${lockValue})`);
            break;

          default:
            this.log(`[SETTINGS] Unknown setting: ${key} = ${newSettings[key]}`);
        }
      } catch (err) {
        this.log(`[SETTINGS] Error applying ${key}: ${err.message}`);
      }
    }
  }

  /**
   * v5.5.812: Read initial state from device
   */
  async _readInitialState(zclNode) {
    this.log('[INIT] Reading initial switch states...');

    for (let gang = 1; gang <= this.gangCount; gang++) {
      const capability = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      if (!this.hasCapability(capability)) continue;

      try {
        const endpoint = zclNode?.endpoints?.[gang];
        const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

        if (onOffCluster && typeof onOffCluster.readAttributes === 'function') {
          const attrs = await onOffCluster.readAttributes(['onOff']).catch(() => null);
          if (attrs?.onOff !== undefined) {
            await this.setCapabilityValue(capability, attrs.onOff).catch(() => { });
            this.log(`[INIT] Gang ${gang}: ${attrs.onOff ? 'ON' : 'OFF'}`);
          }
        }
      } catch (err) {
        this.log(`[INIT] Could not read gang ${gang}: ${err.message}`);
      }
    }
  }

  /**
   * v5.5.812: Setup ZCL attribute reporting for reliable state updates
   */
  async _setupReporting(zclNode) {
    this.log('[REPORTING] Configuring ZCL attribute reporting...');

    for (let gang = 1; gang <= this.gangCount; gang++) {
      try {
        const endpoint = zclNode?.endpoints?.[gang];
        const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

        if (onOffCluster && typeof onOffCluster.configureReporting === 'function') {
          await onOffCluster.configureReporting({
            onOff: {
              minInterval: 0,      // Report immediately on change
              maxInterval: 300,    // Report at least every 5 minutes
              minChange: 1         // Report on any change
            }
          }).catch(() => { });
          this.log(`[REPORTING] ✅ EP${gang} onOff reporting configured`);
        }
      } catch (err) {
        this.log(`[REPORTING] EP${gang} config failed: ${err.message}`);
      }
    }
  }

  /**
   * v5.5.812: Setup power metering if device supports it
   */
  async _setupPowerMetering(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    // Check for electrical measurement cluster (0x0B04)
    const elecCluster = endpoint.clusters.haElectricalMeasurement ||
      endpoint.clusters.electricalMeasurement ||
      endpoint.clusters[0x0B04];

    // Check for metering cluster (0x0702)
    const meterCluster = endpoint.clusters.seMetering ||
      endpoint.clusters.metering ||
      endpoint.clusters[0x0702];

    if (!elecCluster && !meterCluster) return;

    this.log('[POWER] Setting up power metering...');

    // Add capabilities if not present
    const powerCaps = ['measure_power', 'measure_voltage', 'measure_current'];
    for (const cap of powerCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }

    // Setup electrical measurement listeners
    if (elecCluster && typeof elecCluster.on === 'function') {
      elecCluster.on('attr.activePower', (value) => {
        const watts = value / 10; // Usually reported in 0.1W units
        this.setCapabilityValue('measure_power', watts).catch(() => { });
        this.log(`[POWER] Active power: ${watts}W`);
      });

      elecCluster.on('attr.rmsVoltage', (value) => {
        const volts = value / 10;
        this.setCapabilityValue('measure_voltage', volts).catch(() => { });
      });

      elecCluster.on('attr.rmsCurrent', (value) => {
        const amps = value / 1000; // Usually reported in mA
        this.setCapabilityValue('measure_current', amps).catch(() => { });
      });

      this.log('[POWER] ✅ Electrical measurement listeners configured');

      // Read initial values
      elecCluster.readAttributes(['activePower', 'rmsVoltage', 'rmsCurrent']).catch(() => { });
    }

    // Setup metering listeners for energy
    if (meterCluster && typeof meterCluster.on === 'function') {
      if (!this.hasCapability('meter_power')) {
        await this.addCapability('meter_power').catch(() => { });
      }

      meterCluster.on('attr.currentSummationDelivered', (value) => {
        const kwh = value / 1000; // Convert Wh to kWh
        this.setCapabilityValue('meter_power', kwh).catch(() => { });
        this.log(`[POWER] Energy: ${kwh} kWh`);
      });

      this.log('[POWER] ✅ Metering listeners configured');
    }
  }

  /**
   * v5.5.812: Send Tuya DP command
   */
  async _sendTuyaDP(dpId, value, dataType = 'bool') {
    // Use TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      return this.tuyaEF00Manager.sendDP(dpId, value, dataType);
    }

    // Direct cluster access
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    const tuyaCluster = endpoint.clusters.tuya ||
      endpoint.clusters.manuSpecificTuya ||
      endpoint.clusters[0xEF00] ||
      endpoint.clusters['61184'];

    if (!tuyaCluster) {
      this.log('[TUYA-DP] ⚠️ No Tuya cluster found');
      return;
    }

    // Build DP frame based on data type
    let dataBuffer;
    switch (dataType) {
      case 'bool':
        dataBuffer = Buffer.from([value ? 1 : 0]);
        break;
      case 'enum':
        dataBuffer = Buffer.from([value & 0xFF]);
        break;
      case 'value':
        dataBuffer = Buffer.alloc(4);
        dataBuffer.writeInt32BE(value, 0);
        break;
      default:
        dataBuffer = Buffer.from([value & 0xFF]);
    }

    // DP type codes: 0=raw, 1=bool, 2=value, 3=string, 4=enum, 5=bitmap
    const typeCode = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 }[dataType] ?? 1;

    try {
      // Use datapoint command if available
      if (typeof tuyaCluster.datapoint === 'function') {
        await tuyaCluster.datapoint({
          dp: dpId,
          datatype: typeCode,
          data: dataBuffer
        });
      } else if (typeof tuyaCluster.sendData === 'function') {
        await tuyaCluster.sendData({ dp: dpId, value, dataType: typeCode });
      }
      this.log(`[TUYA-DP] ✅ Sent DP${dpId} = ${value} (${dataType})`);
    } catch (err) {
      this.log(`[TUYA-DP] ❌ Failed to send DP${dpId}: ${err.message}`);
    }
  }

  /**
   * v5.5.929: Set LED backlight mode via DP15 (for flow cards)
   * @param {string} mode - 'off', 'normal', or 'inverted'
   */
  async setBacklightMode(mode) {
    const modeMap = { off: 0, normal: 1, inverted: 2 };
    const dpValue = modeMap[mode] ?? 1;
    
    this.log(`[SWITCH] 💡 Setting backlight: ${mode} (DP15=${dpValue})`);
    await this._sendTuyaDP(15, dpValue, 'enum');
    return true;
  }

  /**
   * v5.5.929: Set LED backlight color via DP103/104 (Z2M compatible)
   * Colors: red=0, blue=1, green=2, white=3, yellow=4, magenta=5, cyan=6, warm_white=7, warm_yellow=8
   * @param {string} state - 'on' or 'off' (which state to set color for)
   * @param {string} color - color name
   */
  async setBacklightColor(state, color) {
    const colorMap = { red: 0, blue: 1, green: 2, white: 3, yellow: 4, magenta: 5, cyan: 6, warm_white: 7, warm_yellow: 8 };
    const dpValue = colorMap[color] ?? 3;
    const dpId = state === 'on' ? 103 : 104;
    
    this.log(`[SWITCH] 🎨 Setting ${state}_color: ${color} (DP${dpId}=${dpValue})`);
    await this._sendTuyaDP(dpId, dpValue, 'enum');
    return true;
  }

  /**
   * v5.5.929: Set LED backlight brightness via DP102 (0-100%)
   * @param {number} brightness - 0-100
   */
  async setBacklightBrightness(brightness) {
    const value = Math.max(0, Math.min(100, Math.round(brightness)));
    this.log(`[SWITCH] 🔆 Setting backlight brightness: ${value}% (DP102)`);
    await this._sendTuyaDP(102, value, 'value');
    return true;
  }

  /**
   * v5.5.929: Toggle backlight master switch via DP16
   * @param {boolean} enabled - true to enable backlight
   */
  async setBacklightEnabled(enabled) {
    this.log(`[SWITCH] 💡 Setting backlight enabled: ${enabled} (DP16)`);
    await this._sendTuyaDP(16, enabled ? 1 : 0, 'bool');
    return true;
  }

  /**
   * v5.5.929: Set countdown timer for a gang via DP7/8/9 (Z2M compatible)
   * @param {number} gang - 1, 2, or 3
   * @param {number} seconds - countdown in seconds (0-86400)
   */
  async setCountdown(gang, seconds) {
    const dpMap = { 1: 7, 2: 8, 3: 9 };
    const dpId = dpMap[gang] || 7;
    const value = Math.max(0, Math.min(86400, Math.round(seconds)));
    
    this.log(`[SWITCH] ⏱️ Setting countdown gang ${gang}: ${value}s (DP${dpId})`);
    await this._sendTuyaDP(dpId, value, 'value');
    return true;
  }

  /**
   * v5.5.929: Set child lock via DP101
   * @param {boolean} locked - true to enable child lock
   */
  async setChildLock(locked) {
    this.log(`[SWITCH] 🔒 Setting child lock: ${locked} (DP101)`);
    await this._sendTuyaDP(101, locked ? 1 : 0, 'bool');
    return true;
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
