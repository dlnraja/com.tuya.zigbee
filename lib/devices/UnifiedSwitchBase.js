'use strict';

const TuyaZigbeeDevice = require('../tuya/TuyaZigbeeDevice');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const DeviceTypeManager = require('./DeviceTypeManager');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { getModelId, getManufacturer } = require('../helpers/DeviceDataHelper');
const { ensureManufacturerSettings } = require('../helpers/ManufacturerNameHelper');
const { capabilityForGang, setGangOnOff } = require('../drivers/FlowGangControl');
const { registerNamedButtonFallbacks } = require('../mixins/NamedButtonFallback');
const { sendTuyaMagicPacket } = require('../zigbee/TuyaMagicPacket');
const { getRegistry, isUnsupportedError } = require('../zigbee/UnsupportedRegistry');
const VirtualEnergyMeterMixin = require('../mixins/VirtualEnergyMeterMixin');
const { capabilityForOnOffEndpoint } = require('../utils/endpointCapability');
const { coalesceIfBurst, afterBurst, isBursting } = require('../layers/ReconnectBurstCoalescer');
const {
  POWER_ON_TO_ZCL,
  POWER_ON_FROM_ZCL,
  BACKLIGHT_TO_ZCL,
  SWITCH_MODE_TO_ZCL,
  SWITCH_MODE_FROM_ZCL,
  resolveConfigAttr,
  samePowerOn,
  isConfigSettingKey,
} = require('../zigbee/ZclSwitchConfigPolicy');
const { commitCapabilityCatch } = require('../layers/commitCapability');
const { paceZigbeeCommand, sleepMs } = require('../zigbee/ZigbeeCommandPacer');

// v5.5.818: BSEED TS0726 FIX - Import OnOffBoundCluster for outputCluster command reception
let OnOffBoundCluster = null;
try {
  OnOffBoundCluster = require('../clusters/OnOffBoundCluster');
} catch (e) {
  // Optional cluster — not available in all builds
}

// v5.8.18: Universal unknown cluster support
let UnknownClusterHandler = null;
try {
  UnknownClusterHandler = require('../clusters/UnknownClusterHandler');
} catch (e) {
  // Optional cluster — not available in all builds
}

// v5.13.1: Tuya extended OnOff cluster (Johan Bendz pattern)
// Adds childLock(0x8000), indicatorMode(0x8001), relayStatus(0x8002) as ZCL attributes
let TuyaOnOffCluster = null;
try {
  TuyaOnOffCluster = require('../clusters/TuyaOnOffCluster');
  const { Cluster } = require('zigbee-clusters');
  Cluster.addCluster(TuyaOnOffCluster);
} catch (e) {
  // Optional cluster — not available in all builds
}

/**
 *UnifiedSwitchBase - Base class for Tuya wall switches
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
class UnifiedSwitchBase extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  constructor(...args) {
    super(...args);
    // v5.5.750: Safe initialization to prevent "Cannot read 'name'" errors
    try {
      this.deviceTypeManager = new DeviceTypeManager();
    } catch (e) {
      this.error('[UnifiedSwitchBase] DeviceTypeManager init error:', e.message);
      this.deviceTypeManager = null;
    }
  }

  /** Number of gangs (override in subclass) */
  get gangCount() { return 1; }

  // WHY: TB25 / Homey sub-devices share one MCU. LED, switch mode and
  // power-on live on EP1 — writes from gang 2 cross-link the wall.
  _isSwitchSubDevice() {
    try {
      if (typeof this.isSubDevice === 'function' && this.isSubDevice()) {return true;}
    } catch (_e) { /* SDK optional */ }
    if (this._isSubDevice) {return true;}
    try {
      return Boolean(this.getData && this.getData().subDeviceId);
    } catch (_e) {
      return false;
    }
  }

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
      14: { capability: 'power_on_behavior', transform: (v) => ({ 0: 'off', 1: 'on', 2: 'previous' }[v] ?? 'previous') },  // Power-on state
      15: { capability: null, setting: 'led_indicator' }       // LED indicator
    };
  }

  async onNodeInit({ zclNode }) {
    if (this.SwitchInited) {
      this.log('[HYBRID-SWITCH] ⚠️ Already initialized');
      return;
    }
    this.SwitchInited = true;

    // v5.8.57: Ensure zb_manufacturer_name / zb_model_id settings populated
    await ensureManufacturerSettings(this).catch(() => {});

    // v5.11.182: CRITICAL — Wrap entire init chain in try/finally
    // _registerCapabilityListeners() MUST always run, even if earlier steps crash.
    // Root cause of "Driver Not Initialized: switch_1gang" (Wiosenna_26 forum)
    // and "Missing Capability Listener: onoff" (Rikjes _TZ3000_jl7qyupf forum)
    this.zclNode = zclNode;
    let initError = null;
    try {
      // 🔌 P102: I/O façade available even though this base skips super.onNodeInit
      if (typeof this._initDeviceIO === 'function') {
        await this._initDeviceIO(zclNode).catch(() => {});
      }

      // v9.0.413 (P92.121): Tuya magic packet FIRST — Tuya's own docs
      // (tuyaos.com #1651) confirm third-party gateways must read the
      // genBasic attribute set in this format or multi-gang switches
      // toggle ALL gangs at once instead of per-gang. Idempotent,
      // sleepy-tolerant, never blocks init.
      await sendTuyaMagicPacket(this, zclNode, 1, { force: true }).catch(() => {});

      // v5.6.0: Apply dynamic manufacturerName configuration
      await this._applyManufacturerConfig().catch(e => this.log(`[HYBRID-SWITCH] ⚠️ Config: ${e.message}`));

      this._protocolInfo = this._detectProtocol();

      // v5.11.80: Override _isPureTuyaDP based on actual protocol detection
      this._isPureTuyaDP = this._protocolInfo.isTuyaDP;

      // v5.8.18: Scan and bind unknown clusters
      if (UnknownClusterHandler) {
        try {
          const bound = UnknownClusterHandler.scanAndBind(zclNode, this);
          if (bound.length > 0) {
            this.log(`[HYBRID-SWITCH] 🔗 Bound ${bound.length} dynamic clusters`);
          }
        } catch (e) { /* ignore */ }
      }

      this.log('');
      // Get device type configuration
      const deviceType = this.getSetting('device_type') || 'light';
      let typeConfig;
      try {
        typeConfig = this.deviceTypeManager.getDeviceTypeConfig(deviceType);
      } catch (e) {
        typeConfig = { icon: '💡', name: deviceType, invertLogic: false };
      }

      this.log('╔══════════════════════════════════════════════════════════════╗');
      this.log(`${`║          HYBRID SWITCH BASE ${getAppVersionPrefixed()}`.padEnd(62)  }║`);
      this.log(`║ Model: ${this._protocolInfo?.modelId || '?'} | Gangs: ${this.gangCount}`);
      this.log(`║ Mode: ${this._protocolInfo?.protocol || '?'}`);
      this.log(`║ Device Type: ${typeConfig.icon} ${typeConfig.name}`);
      if (typeConfig.invertLogic) {
        this.log('║ ⚠️ LOGIQUE INVERSÉE activée (radiateur)');
      }
      this.log('╚══════════════════════════════════════════════════════════════╝');

      await this._migrateCapabilities().catch(e => this.log(`[HYBRID-SWITCH] ⚠️ Migrate: ${e.message}`));
      this._bumpMaxListeners(zclNode);

      // v5.5.63: Initialize Protocol Auto-Optimizer
      try {
        this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
        await this.protocolOptimizer.initialize(zclNode);

        this.protocolOptimizer.on('decision', (mode, stats) => {
          this.log(`[AUTO-OPT] ✅ Decision: ${mode} (Tuya=${stats.protocols.tuya.hits}, ZCL=${stats.protocols.zcl.hits})`);
        });
      } catch (e) {
        this.log(`[HYBRID-SWITCH] ⚠️ ProtocolOptimizer: ${e.message}`);
      }

      // v5.13.2: UNIVERSAL TX/RX FALLBACK HANDLER
      this._setupRawFrameFallback();

      // WHY: leftover 0xEF00 on TS000x ZCL switches remaps gang reports after
      // re-pair. Skip DP RX when protocol is zcl_only / standard ZCL.
      const skipDpRx = this._protocolInfo?.protocol === 'zcl_only'
        || this._protocolInfo?.isStandardZCL === true;
      await Promise.all([
        skipDpRx ? Promise.resolve() : this._setupTuyaDPMode().catch(() => { }),
        this._setupZCLMode(zclNode).catch(() => { }),
      ]);
      this._startMcuKeepAlive();
    } catch (err) {
      initError = err;
      this.error(`[HYBRID-SWITCH] ❌ Init chain error: ${err.message}`);
    }

    // v5.11.182: ALWAYS register capability listeners — this is the absolute minimum
    // that MUST succeed for the device to be controllable (prevents "Driver Not Initialized")
    try {
      this._registerCapabilityListeners();
    } catch (e) {
      this.error(`[HYBRID-SWITCH] ❌ Capability listeners: ${e.message}`);
    }

    try {
      this._registerButtonCapabilityListeners();
    } catch (e) {
      this.error(`[HYBRID-SWITCH] ❌ Button capability listeners: ${e.message}`);
    }

    // v9.0.413 (P92.121): re-apply persisted LED/backlight/child-lock
    // settings at boot (onSettings only fires on change).
    try {
      await this._pushConfiguredSwitchSettings('boot');
    } catch (e) {
      this.error(`[HYBRID-SWITCH] ⚠️ Stored onoff settings: ${e.message}`);
    }

    // v9.0.418 / P205: virtual energy when hardware has no metering.
    // Prefer VirtualEnergyMeterMixin for plug/socket/switch mains; keep
    // VirtualEnergyEstimator as fallback for other classes.
    try {
      const hasRealMetering = Object.values(zclNode?.endpoints || {}).some((ep) =>
        ep?.clusters && (ep.clusters.haElectricalMeasurement || ep.clusters.electricalMeasurement
          || ep.clusters.seMetering || ep.clusters.metering
          || ep.clusters[0x0B04] || ep.clusters[0x0702]));
      const mappings = this.dpMappings || {};
      const hasEnergyDp = Object.values(mappings).some((m) => m
        && ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'].includes(m.capability));
      const estimationEnabled = typeof this.getSetting !== 'function'
        || this.getSetting('enable_power_estimation') !== false;
      const driverId = String(this.driver?.id || '');
      const plugLike = /plug|socket|switch|outlet|relay/i.test(driverId);
      if (!hasRealMetering && !hasEnergyDp && estimationEnabled) {
        if (plugLike && typeof this._initVirtualEnergy === 'function' && !this._virtualEnergyActive) {
          await this._initVirtualEnergy();
          this.log('[VIRTUAL-ENERGY] ⚡ mixin estimate enabled (no hardware metering)');
        } else if (!this.virtualEnergyEstimator) {
          const VirtualEnergyEstimator = require('../managers/VirtualEnergyEstimator');
          this.virtualEnergyEstimator = new VirtualEnergyEstimator(this);
          await this.virtualEnergyEstimator.initialize();
          this.log('[VIRTUAL-ENERGY] ⚡ estimator enabled (no hardware metering)');
        }
      }
    } catch (e) {
      this.log(`[VIRTUAL-ENERGY] ⚠️ estimator init: ${e.message}`);
    }

    // v9.0.410 (P92.114): physical button detection for ALL UnifiedSwitchBase
    // subclasses — this base does NOT chain to TuyaZigbeeDevice.onNodeInit
    // (where initPhysicalButtonDetection lives), so 18 switch drivers had dead
    // physical-button flows (same root cause as wall_switch_4gang_1way #2099).
    try {
      if (typeof this.initPhysicalButtonDetection === 'function') {
        await this.initPhysicalButtonDetection(zclNode);
      }
    } catch (e) {
      this.error(`[HYBRID-SWITCH] ❌ Physical button detection: ${e.message}`);
    }

    // v5.5.812: Setup additional features (non-critical)
    await this._setupReporting(zclNode).catch(() => { });
    await this._setupPowerMetering(zclNode).catch(() => { });
    await this._readInitialState(zclNode).catch(() => { });

    // v5.11.30: Read E001 attributes (powerOnBehavior, switchMode) and sync to settings
    await this._readE001Attributes().catch(() => { });

    if (initError) {
      this.log('[HYBRID-SWITCH] ⚠️ Initialization completed with errors (device may have limited functionality)');
    } else {
      this.log('[HYBRID-SWITCH] ✅ Initialization complete (TRUE HYBRID mode)');
    }

    try {
      await this._refreshConnectedSwitchLabels();
    } catch (_e) { /* label optional */ }
  }

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    // v5.5.735: Use DeviceDataHelper for consistent manufacturer/model retrieval
    const manufacturerName = getManufacturer(this) || 'unknown';
    const productId = getModelId(this) || 'unknown';
    const driverType = `switch_${this.gangCount}gang`;

    this.log(`[SWITCH] 🔍 Config: ${manufacturerName} / ${productId} (${driverType})`);

    // v5.8.80: Apply registry profile if available
    const profile = this.getDeviceProfile?.() || this._deviceProfile;
    if (profile && profile.dpMappings) {
      this._dynamicDpMappings = { ...this.dpMappings, ...profile.dpMappings };
      this.log(`[SWITCH] 📋 Registry profile: ${profile.id}`);
    }
    if (profile?.quirks) {this._profileQuirks = profile.quirks;}

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
    // P214: single intelligent ZCL ↔ EF00 detector (hybrid listen by default)
    const { applyIntelligentProtocol } = require('../protocol/IntelligentProtocolDetect');
    return applyIntelligentProtocol(this, this.zclNode);
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
      if (!zclNode?.endpoints) {return;}
      for (const endpoint of Object.values(zclNode.endpoints)) {
        if (typeof endpoint.setMaxListeners === 'function') {endpoint.setMaxListeners(50);}
        for (const cluster of Object.values(endpoint?.clusters || {})) {
          if (typeof cluster?.setMaxListeners === 'function') {cluster.setMaxListeners(50);}
        }
      }
    } catch (e) { this.log('[MAX-LISTENERS] Failed to bump:', e.message); }
  }

  async _setupTuyaDPMode() {
    this.log('[TUYA-DP] Setting up Tuya DP listeners for switch...');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {return;}

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
        } catch (e) { this.log(`[TUYA-DP] Failed to bind event '${evt}':`, e.message); }
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
    if (!data) {return;}

    // Parse DP from various formats
    if (data.dp !== undefined && data.value !== undefined) {
      this._handleDP(data.dp, data.value);
    } else if (data.dpId !== undefined) {
      this._handleDP(data.dpId, data.value ?? data.data);
    } else if (Buffer.isBuffer(data) && data.length >= 5) {
      // Parse raw Tuya frame: [seq:2][dp:1][type:1][len:2][data:len]
      const dp = data[2];
      const len = data.readUInt16BE(4);
      let value;
      if (len === 1) {value = data[6];}
      else if (len === 4) {value = data.readInt32BE(6);}
      else {value = data.slice(6, 6 + len);}
      this._handleDP(dp, value);
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL listeners for switch...');

    // FIX: Skip if PhysicalButtonMixin is active (avoids double-processing)
    if (this._hasPhysicalButtonMixin) {
      this.log('[ZCL] ⏭️ Skipping ZCL command listeners (PhysicalButtonMixin active)');
      return;
    }

    // v5.7.37: UNIVERSAL PHYSICAL BUTTON FIX - Command listeners for ALL switches
    // Root cause: Physical buttons don't trigger flows because command listeners were only for BSEED
    // Many devices send ZCL COMMANDS (toggle/on/off) for physical button presses
    // Setting up these listeners is a no-op if device doesn't use them, but missing them breaks physical buttons
    // Forum reports: Freddyboy #1333, multiple users reporting "virtual works, physical doesn't"
    const needsCommandListeners = true; // v5.7.37: ALWAYS setup for ALL switches

    // Log special handling if detected
    const isBSEED = this._specialHandling === 'bseed_ts0726_4gang' ||
      this._manufacturerConfig?.specialHandling === 'bseed_ts0726_4gang';
    if (isBSEED) {
      this.log('[ZCL] ⭐ BSEED TS0726 detected');
    }
    this.log('[ZCL] 🔘 v5.7.37: Universal command listeners ENABLED for physical button detection');

    // For multi-gang, each gang is on a different endpoint
    if (!this._zclOnOffListenersBound) {this._zclOnOffListenersBound = new Set();}
    for (let gang = 1; gang <= this.gangCount; gang++) {
      const endpoint = zclNode?.endpoints?.[gang];
      const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

      if (!onOffCluster) {continue;}

      const capability = capabilityForOnOffEndpoint(gang, this.gangCount);
      const listenKey = `onoff:${gang}`;
      if (this._zclOnOffListenersBound.has(listenKey)) {continue;}
      this._zclOnOffListenersBound.add(listenKey);

      if (capability && this.hasCapability(capability)) {
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
              commitCapabilityCatch(this, capability, newValue, 'zcl');
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
          if (!this._zclStats) {this._zclStats = {};}
          if (!this._zclStats[gang]) {this._zclStats[gang] = { count: 0, lastTime: 0 };}
          const stats = this._zclStats[gang];
          const interval = stats.lastTime ? now - stats.lastTime : 0;
          stats.count++;
          stats.lastTime = now;

          const isolated = capabilityForOnOffEndpoint(gang, this.gangCount);
          if (!isolated || isolated !== capability) {
            this.log(`[ZCL] 🛑 drop EP${gang}.onOff — would bleed onto ${capability}`);
            return;
          }
          
          this.log(`[ZCL] 📥 EP${gang}.onOff=${value} type=${typeof value} interval=${interval}ms count=${stats.count}`);
          
          // Register hit with optimizer
          if (this.protocolOptimizer) {
            this.protocolOptimizer.registerHit('zcl', `onOff.gang${gang}`, value);
          }
          // Only process if ZCL protocol is active
          if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) {
            coalesceIfBurst(this, capability, value, (v) => {
              commitCapabilityCatch(this, capability, v, 'zcl');
            });
            if (isBursting(this)) {
              afterBurst(this, 'reforce-settings', () => {
                this._pushConfiguredSwitchSettings('zcl-reconnect-burst').catch(() => {});
                try {
                  const avail = this.homey?.app?.availabilityManager;
                  if (avail && typeof avail.noteBootDump === 'function') {
                    avail.noteBootDump(this);
                  }
                } catch (_e) { /* optional */ }
              });
            }
          }
        });
        this.log(`[ZCL] ✅ Listener: EP${gang}.onOff`);

        // Read initial state
        onOffCluster.readAttributes(['onOff']).then(async data => {
          if (data?.onOff != null) {
            commitCapabilityCatch(this, capability, data.onOff, 'zcl');
          }
        }).catch(() => { });
      }
    }
  }

  _handleDP(dpId, value) {
    if (value === undefined || value === null) {return;}

    // v5.5.901: Enhanced diagnostic logging
    const now = Date.now();
    const dataType = this._detectDataType(value);
    const rawValue = Buffer.isBuffer(value) ? value.toString('hex') : value;
    
    // Track DP frequency for diagnostics
    if (!this._dpStats) {this._dpStats = {};}
    if (!this._dpStats[dpId]) {this._dpStats[dpId] = { count: 0, lastTime: 0, values: [] };}
    const stats = this._dpStats[dpId];
    const interval = stats.lastTime ? now - stats.lastTime : 0;
    stats.count++;
    stats.lastTime = now;
    stats.values.push({ value: rawValue, time: now });
    if (stats.values.length > 10) {stats.values.shift();} // Keep last 10
    
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
      const _xf = typeof mapping.transform === 'object' && typeof mapping.transform.fromDevice === 'function'
        ? mapping.transform.fromDevice : mapping.transform;
      value = _xf(value);
    }

    // v9.1: SmartDivisorManager auto-detection (replaces hardcoded divisor)
    if (mapping.smartDivisor === true) {
      const { smartParse } = require('../managers/SmartDivisorManager');
      value = smartParse(value, dpId, {
        manufacturerName: this.getSetting('zb_manufacturer_name') || '',
        capability: mapping.capability,
        deviceId: this.getData()?.id || '',
      });
    } else if (mapping.divisor) {
      value = value / mapping.divisor;
    }

    if (mapping.setting && isConfigSettingKey(mapping.setting) && isBursting(this)) {
      this.log(`[DP] skip ${mapping.setting} during reconnect burst (keep Homey setting)`);
      return;
    }
    if (mapping.capability === 'power_on_behavior' && isBursting(this)) {
      this.log('[DP] skip power_on_behavior during reconnect burst (keep Homey setting)');
      return;
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
      if (String(mapping.capability).startsWith('onoff')) {
        const expected = capabilityForOnOffEndpoint(dpId, this.gangCount);
        if (expected && mapping.capability !== expected && mapping.capability !== `onoff.${dpId}`) {
          this.log(`[DP] 🛑 refuse DP${dpId} → ${mapping.capability} (expected ${expected})`);
          return;
        }
      }
      commitCapabilityCatch(this, mapping.capability, value, 'tuya-dp');
    }

    if (mapping.setting) {
      this.log(`[DP] DP${dpId} → setting ${mapping.setting} = ${value}`);
      this.setSettings({ [mapping.setting]: value }).catch(() => { });
    }
  }

  _registerCapabilityListeners() {
    if (this._capListenersRegistered) {return;}
    this._capListenersRegistered = true;

    // v9.0.40: Collect all onoff capabilities for potential multi-capability registration
    const onoffCaps = [];

    for (let gang = 1; gang <= this.gangCount; gang++) {
      const capability = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      const dpId = gang;

      if (this.hasCapability(capability)) {
        this.registerCapabilityListener(capability, async (value) => {
          return this._setGangOnOff(gang, value);
        });
        onoffCaps.push(capability);
      }

      // v5.5.24: Support legacy onoff.X naming (onoff.1, onoff.2, etc.)
      const legacyCap = `onoff.${gang}`;
      if (this.hasCapability(legacyCap) && legacyCap !== capability) {
        this.registerCapabilityListener(legacyCap, async (value) => {
          return this._setGangOnOff(gang, value);
        });
        onoffCaps.push(legacyCap);
      }
    }

    // Power On Behavior capability listener
    if (this.hasCapability('power_on_behavior')) {
      this.registerCapabilityListener('power_on_behavior', async (value) => {
        const pobMap = { off: 0, on: 1, previous: 2 };
        const dpValue = pobMap[value] ?? 2;
        this.log(`[CAP] power_on_behavior → ${value} (DP14=${dpValue})`);
        await this._sendTuyaDP(14, dpValue, 'enum');
        // Also sync to device settings for consistency
        await this.setSettings({ power_on_behavior: value }).catch(() => {});
        return true;
      });
    }
  }

  _registerButtonCapabilityListeners() {
    // v9.0.410: if the universal TuyaZigbeeDevice version already ran (boolean
    // flag), don't register twice. Otherwise use our per-capability Set.
    if (this._buttonCapListenersRegistered === true) { return; }
    if (!this._buttonCapListenersRegistered) {this._buttonCapListenersRegistered = new Set();}

    for (let gang = 1; gang <= this.gangCount; gang++) {
      const capability = `button.${gang}`;
      if (!this.hasCapability(capability) || this._buttonCapListenersRegistered.has(capability)) {
        continue;
      }

      this.registerCapabilityListener(capability, async () => {
        this.log(`[BUTTON-UI] ${capability} pressed; routing to gang ${gang}`);

        const now = Date.now();
        if (!this._virtualPhysicalDedup) {
          this._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
        }
        const lastPhysical = this._virtualPhysicalDedup.lastPhysicalPress[gang] || 0;
        if (now - lastPhysical < this._virtualPhysicalDedup.dedupWindow) {
          this.log(`[DEDUP] Skipping virtual press (physical ${now - lastPhysical}ms ago)`);
          return true;
        }
        this._virtualPhysicalDedup.lastVirtualPress[gang] = now;

        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(gang, 'single', { source: 'virtual', _internalTrigger: true });
        }

        await setGangOnOff(this, gang, 'toggle');

        return true;
      });

      this._buttonCapListenersRegistered.add(capability);
      this.log(`[HYBRID-SWITCH] ✅ Registered ${capability} listener`);
    }

    // v9.0.411 (P92.119): named maintenance buttons (button.toggle,
    // button.identify, button.push, ...). VirtualButtonMixin's richer
    // versions always win — see NamedButtonFallback.
    try {
      registerNamedButtonFallbacks(this);
    } catch (e) {
      this.log(`[HYBRID-SWITCH] ⚠️ named-button fallback: ${e.message}`);
    }
  }

  async _setGangOnOff(gang, value) {
    const capability = capabilityForOnOffEndpoint(gang, this.gangCount) || (gang === 1 ? 'onoff' : `onoff.gang${gang}`);
    const originalValue = value;

    // v5.8.95: BIDIRECTIONAL FIX — mark app command BEFORE sending to device
    // This prevents PhysicalButtonMixin from treating the device's response as a physical press.
    // Consolidated here so ALL switch drivers (1gang-8gang) get it automatically.
    // Previously only switch_1gang, switch_4gang, wall_switch_1gang_1way had local _markAppCommand().
    if (typeof this.markAppCommand === 'function') {
      // Important: even when per-endpoint control is enabled, we must not
      // stamp *all* gangs as "app-command pending", otherwise a real
      // physical press on another gang can be misclassified as "app".
      this.markAppCommand(gang, value);
    }

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

    this.log(`[SWITCH] ${capability} = ${originalValue} (sent as ${value}) protocol=${this._isPureTuyaDP ? 'DP' : 'ZCL'} gang=${gang}`);

    // Low-level cascade: ZCL named → raw numeric → Tuya DP.
    // ZCL-only: never parallel-probe leftover EF00 (cross-links gang 1/2).
    // Multi-gang: serialize TX (15–50 ms spacing) then retry no-ack at 350 ms.
    try {
      const { writeCapabilityWithFallbacks } = require('../zigbee/CapabilityCommandRouter');
      this._capabilityEndpointHint = gang;
      const r = await paceZigbeeCommand(this, () => writeCapabilityWithFallbacks(this, capability, value, {
        endpoint: gang,
        dpId: gang,
        dpType: 'bool',
        skipDp: this.gangCount > 1 && this._isPureTuyaDP !== true,
        parallelDiscover: this._isPureTuyaDP === true && gang === 1,
      }), { enabled: this.gangCount > 1 });
      if (r.ok) {return;}
      if (r.error) {throw r.error;}
    } catch (cascadeErr) {
      this.log(`[TX-FALLBACK] cascade failed for ${capability}: ${cascadeErr.message}`);
      throw cascadeErr;
    } finally {
      this._capabilityEndpointHint = null;
    }
  }

  async registerCapability(capabilityId, clusterId, opts = {}) {
    // v5.5.63: Check if ZCL is active before registering
    if (this.protocolOptimizer && !this.protocolOptimizer.isActive('zcl')) {return;}

    // v5.12.12: Explicitly map multi-gang capabilities to their respective endpoints
    // This prevents Homey SDK from defaulting commands to Endpoint 1 or throwing undefined endpoint errors
    // Covers onoff.2, dim.2, measure_power.3, onoff.gang4, etc.
    const match = capabilityId.match(/\.(?:gang)?(\d+)$/);
    if (match) {
      const gang = parseInt(match[1], 10);
      if (!isNaN(gang)) {
        opts.endpoint = opts.endpoint || gang;
      }
    } else if (['onoff', 'dim', 'measure_power', 'measure_current', 'measure_voltage'].includes(capabilityId)) {
      opts.endpoint = opts.endpoint || 1;
    }

    return super.registerCapability(capabilityId, clusterId, opts);
  }

  /**
   * Keep Homey SDK cluster lookup on the gang being commanded, not a random EP1.
   */
  getClusterEndpoint(cluster) {
    if (this._capabilityEndpointHint != null) {
      return this._capabilityEndpointHint;
    }
    if (typeof super.getClusterEndpoint === 'function') {
      return super.getClusterEndpoint(cluster);
    }
    return 1;
  }

  /**
   * 🛡️ UNIVERSAL RAW FRAME HANDLER
   * Intercepts unhandled ZigBee frames before Homey SDK routing
   */
  _setupRawFrameFallback() {
    if (!this.node) {return;}
    
    // Check if handleFrame is already hijacked to prevent infinite loop
    if (this.node._rawFrameFallbackInjected) {return;}

    this.log('🛡️ [RX/TX] Setup Universal Raw Frame Fallback (UnifiedSwitchBase)');
    const originalHandleFrame = this.node.handleFrame;
    
    this.node.handleFrame = (endpointId, clusterId, frame, meta) => {
      let handled = false;
      
      if (typeof this.onZigBeeMessage === 'function') {
        try {
          if (this.onZigBeeMessage(this.zclNode, frame) === true) {
            handled = true;
          }
        } catch (e) {
          this.log(`⚠️ [RX] Driver handling error (onZigBeeMessage): ${e.message}`);
        }
      }

      // Track incoming report directly here using helper inherited from ZigBeeDevice if exists
      if (typeof this.trackIncomingReport === 'function') {
        this.trackIncomingReport();
      }

      if (handled) {return;}

      if (typeof originalHandleFrame === 'function') {
        return originalHandleFrame.call(this.node, endpointId, clusterId, frame, meta);
      }
    };
    
    this.node._rawFrameFallbackInjected = true;
  }

  /**
   * v5.13.0: RX FALLBACK — Catch raw ZigBee frames not natively handled by SDK
   * Addresses forum issues #5417/5418 regarding silent failures on ZCL fallback
   */
  async onZigBeeMessage(zclNode, frame) {
    if (!frame || !frame.ClusterID) {return;}
    try {
      const clusterId = frame.ClusterID;
      const endpointId = frame.SourceEndpoint;
      // Skip known noisy clusters to avoid log spam (e.g. basic, time)
      if (clusterId === 0 || clusterId === 10) {return;}
      
      this.log(`[RX-FALLBACK] Raw ZCL Frame | EP: ${endpointId} | Cluster: ${clusterId} | Command: ${frame.CommandID} | Data: `, frame.Data);
      
      // Basic OnOff Cluster fallback checking
      if (clusterId === 6 || clusterId === 0x0006) {
        // Just log the state, the attr listener usually catches this, but if it fails we see it here
        this.log(`[RX-FALLBACK] OnOff command detected on EP${endpointId}, Ensure endpoint mapping is correct.`);
      }
    } catch (e) {
      this.log(`[RX-FALLBACK] Error parsing frame: ${e.message}`);
    }
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
   * Override safeSetCapabilityValue to include dynamic capability guards and flow triggers for switches
   */
  async safeSetCapabilityValue(capability, value, meta) {
    if (!this.hasCapability(capability)) {
      if (this.constructor.DYNAMIC_CAPABILITIES && this.constructor.DYNAMIC_CAPABILITIES.includes(capability)) {
        try {
          await this.addCapability(capability);
          this.log(`[CAP] ✨ DYNAMIC ADD: ${capability} (detected from DP/ZCL data)`);
        } catch (e) {
          this.log(`[CAP] ⚠️ Could not add ${capability}: ${e.message}`);
          return false;
        }
      } else {
        return false;
      }
    }
    
    const oldValue = this.getCapabilityValue(capability);
    const result = await super.safeSetCapabilityValue(capability, value, meta);
    
    // v5.5.597: Trigger universal sub-capability flow cards
    if (oldValue !== value) {
      if (capability.includes('.')) {
        this._triggerSubCapabilityFlow(capability, value);
      }
      
      // v5.12.16: Explicitly trigger custom workflow trigger cards for gangs (Issue #170)
      if (capability.startsWith('onoff')) {
        try {
          const gangMatch = capability.match(/gang(\d+)/);
          const legacyMatch = capability.match(/\.(\d+)$/);
          
          let gangNum = 1;
          if (gangMatch) {gangNum = parseInt(gangMatch[1]);}
          else if (legacyMatch) {gangNum = parseInt(legacyMatch[1]);}
          
          const driverId = this.driver.id; // e.g. switch_3gang
          const stateStr = value ? 'on' : 'off';
          const triggerId = `${driverId}_gang${gangNum}_turned_${stateStr}`;
          
          // Trigger the specific turned ON/OFF flow card for this device
          const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);
          if (triggerCard) {
            await triggerCard.trigger(this, {}, {});
            this.log(`[FLOW] ⚡ Triggered ${triggerId}`);
          }
        } catch (err) {
          // Card might not exist for some drivers, this is safe to ignore
        }
      }
    }
    return result;
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
    if (value === null || value === undefined) {return 'null';}
    if (Buffer.isBuffer(value)) {return `buffer[${value.length}]`;}
    if (typeof value === 'boolean') {return 'bool';}
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {return value >= 0 && value <= 255 ? 'uint8' : 'int32';}
      return 'float';
    }
    if (typeof value === 'string') {return `str[${value.length}]`;}
    if (Array.isArray(value)) {return `arr[${value.length}]`;}
    if (typeof value === 'object') {return 'obj';}
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
    // Call parent onSettings first (handles power_source, battery_type, optimization_mode)
    await super.onSettings({ oldSettings, newSettings, changedKeys });

    this.log(`[SETTINGS] Changed: ${changedKeys.join(', ')}`);

    for (const key of changedKeys) {
      try {
        if (this._isSwitchSubDevice() && isConfigSettingKey(key)) {
          this.log(`[SETTINGS] skip ${key} on sub-device (EP1 config lives on main gang)`);
          continue;
        }
        if (/^inching(_mode|_duration)?(_\d+)?$/.test(String(key))) {
          await this._pushConfiguredInching('settings');
          continue;
        }
        switch (key) {
        case 'power_on_behavior':
          // v5.8.22: Try TuyaE001Cluster first for ZCL-only devices, then Tuya DP
          const pobValue = { off: 0, on: 1, memory: 2, previous: 2 }[newSettings[key]] ?? 2;
          if (await this._writeE001Attribute('powerOnBehavior', pobValue)) {
            this.log(`[SETTINGS] Power-on behavior: ${newSettings[key]} (0xE001.0xD010=${pobValue})`);
          } else {
            await this._sendTuyaDP(14, pobValue, 'enum');
            this.log(`[SETTINGS] Power-on behavior: ${newSettings[key]} (DP14=${pobValue})`);
          }
          // Sync to capability if present
          if (this.hasCapability('power_on_behavior')) {
            const capVal = { off: 'off', on: 'on', memory: 'previous' }[newSettings[key]] ?? 'previous';
            await this.safeSetCapabilityValue('power_on_behavior', capVal).catch(() => {});
          }
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
          // v5.8.22: Try ZCL OnOff.0x8001 first, then Tuya DP15
          const backlightValue = { off: 0, normal: 1, inverted: 2 }[newSettings[key]] ?? 1;
          if (await this._writeOnOffAttribute('backlightMode', backlightValue)) {
            this.log(`[SETTINGS] Backlight mode: ${newSettings[key]} (OnOff.0x8001=${backlightValue})`);
          } else {
            await this._sendTuyaDP(15, backlightValue, 'enum');
            this.log(`[SETTINGS] Backlight mode: ${newSettings[key]} (DP15=${backlightValue})`);
          }
          break;

        case 'switch_mode':
          // v5.11.30: External switch type via E001 cluster (0xD030)
          const smValue = { toggle: 0, state: 1, momentary: 2 }[newSettings[key]] ?? 0;
          if (await this._writeE001Attribute('switchMode', smValue)) {
            this.log(`[SETTINGS] Switch mode: ${newSettings[key]} (0xE001.0xD030=${smValue})`);
          } else {
            this.log('[SETTINGS] Switch mode: E001 not available for this device');
          }
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
   * v5.11.30: Read E001 on EP1. Homey settings win over a power-restore dump.
   */
  async _readE001Attributes() {
    if (this._isSwitchSubDevice()) {return;}
    try {
      const ep = this.zclNode?.endpoints?.[1];
      const cluster = ep?.clusters?.tuyaE001 || ep?.clusters?.[0xE001] || ep?.clusters?.[57345];
      if (!cluster || typeof cluster.readAttributes !== 'function') {return;}
      const data = await cluster.readAttributes(['powerOnBehavior', 'switchMode']).catch(() => ({}));
      if (!data) {return;}

      const pob = resolveConfigAttr(
        typeof this.getSetting === 'function' ? this.getSetting('power_on_behavior') : null,
        data.powerOnBehavior,
        POWER_ON_FROM_ZCL,
        samePowerOn,
      );
      if (pob.action === 'write') {
        this.log(`[E001] powerOnBehavior dump=${data.powerOnBehavior} ≠ Homey ${pob.stored} — re-force`);
        await this._writeE001Attribute('powerOnBehavior', POWER_ON_TO_ZCL[pob.stored] ?? 2);
      } else if (pob.action === 'seed') {
        this.log(`[E001] Read powerOnBehavior=${data.powerOnBehavior} → ${pob.stored}`);
        await this.setSettings({ power_on_behavior: pob.stored }).catch(() => {});
        if (this.hasCapability('power_on_behavior')) {
          const capVal = { off: 'off', on: 'on', memory: 'previous' }[pob.stored] ?? 'previous';
          await this.safeSetCapabilityValue('power_on_behavior', capVal).catch(() => {});
        }
      }

      const sm = resolveConfigAttr(
        typeof this.getSetting === 'function' ? this.getSetting('switch_mode') : null,
        data.switchMode,
        SWITCH_MODE_FROM_ZCL,
      );
      if (sm.action === 'write') {
        this.log(`[E001] switchMode dump=${data.switchMode} ≠ Homey ${sm.stored} — re-force`);
        await this._writeE001Attribute('switchMode', SWITCH_MODE_TO_ZCL[sm.stored] ?? 0);
      } else if (sm.action === 'seed') {
        this.log(`[E001] Read switchMode=${data.switchMode} → ${sm.stored}`);
        await this.setSettings({ switch_mode: sm.stored }).catch(() => {});
      }
    } catch (e) {
      this.log(`[E001] Read attributes failed: ${e.message}`);
    }
  }

  /**
   * v5.8.22: Write attribute to TuyaE001Cluster (0xE001) - ZCL-only devices
   * Returns true if successful, false if cluster not available
   */
  async _writeE001Attribute(attrName, value) {
    try {
      const ep = this.zclNode?.endpoints?.[1];
      const cluster = ep?.clusters?.tuyaE001 || ep?.clusters?.[0xE001] || ep?.clusters?.[57345];
      if (!cluster || typeof cluster.writeAttributes !== 'function') {return false;}
      await cluster.writeAttributes({ [attrName]: value });
      return true;
    } catch (e) {
      this.log(`[E001] Write ${attrName} failed: ${e.message}`);
      return false;
    }
  }

  /**
   * v5.8.23: Write extended OnOff attribute using raw attribute IDs
   * ZHA/Z2M compatible: 0x8001=backlightMode, 0x8002=powerOnState, 0x8004=switchMode
   * Returns true if successful, false if not supported
   */
  async _writeOnOffAttribute(attrName, value) {
    const ATTR_IDS = {
      backlightMode: 0x8001,
      powerOnState: 0x8002,
      switchMode: 0x8004,
      childLock: 0x8000,
    };
    // v9.0.413 (P92.121): skip silently once known unsupported on this
    // device (persisted negative cache) — caller falls back to Tuya DP.
    if (getRegistry(this).isKnown('genOnOff', attrName)) { return false; }
    try {
      const ep = this.zclNode?.endpoints?.[1];
      const cluster = ep?.clusters?.onOff || ep?.clusters?.genOnOff;
      if (!cluster) {return false;}

      const attrId = ATTR_IDS[attrName];
      if (attrId && typeof cluster.writeAttributesRaw === 'function') {
        await cluster.writeAttributesRaw([{ id: attrId, value }]);
        return true;
      } else if (typeof cluster.writeAttributes === 'function') {
        await cluster.writeAttributes({ [attrName]: value });
        return true;
      }
      return false;
    } catch (e) {
      // v9.0.413: mark unsupported once — no per-boot/per-change log flood
      if (isUnsupportedError(e)) {
        getRegistry(this).mark('genOnOff', attrName, 'tuya-dp');
      }
      this.log(`[OnOff] Write ${attrName} failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Push Homey backlight / power-on / switch-mode onto EP1.
   * Used at boot and after a ZCL reconnect burst so the device dump cannot
   * overwrite what the user configured.
   */
  async _pushConfiguredSwitchSettings(reason = 'boot') {
    if (this._isSwitchSubDevice()) {return;}
    const now = Date.now();
    if (this._lastConfigPushAt && (now - this._lastConfigPushAt) < 4000) {return;}
    this._lastConfigPushAt = now;
    try {
      const backlight = typeof this.getSetting === 'function' ? this.getSetting('backlight_mode') : null;
      if (backlight) {
        const value = BACKLIGHT_TO_ZCL[backlight] ?? 1;
        if (!(await this._writeOnOffAttribute('backlightMode', value))) {
          if (typeof this._sendTuyaDP === 'function') {
            await this._sendTuyaDP(15, value, 'enum').catch(() => {});
          }
        }
        this.log(`[SETTINGS] backlight_mode applied (${reason}): ${backlight}`);
      }
      const pob = typeof this.getSetting === 'function' ? this.getSetting('power_on_behavior') : null;
      if (pob) {
        const value = POWER_ON_TO_ZCL[pob] ?? 2;
        if (!(await this._writeE001Attribute('powerOnBehavior', value))) {
          if (!(await this._writeOnOffAttribute('powerOnState', value)) && typeof this._sendTuyaDP === 'function') {
            await this._sendTuyaDP(14, value, 'enum').catch(() => {});
          }
        }
        this.log(`[SETTINGS] power_on_behavior applied (${reason}): ${pob}`);
      }
      const switchMode = typeof this.getSetting === 'function' ? this.getSetting('switch_mode') : null;
      if (switchMode) {
        await this._writeE001Attribute('switchMode', SWITCH_MODE_TO_ZCL[switchMode] ?? 0);
        this.log(`[SETTINGS] switch_mode applied (${reason}): ${switchMode}`);
      }
      const childLock = typeof this.getSetting === 'function' ? this.getSetting('child_lock') : null;
      if (childLock !== undefined && childLock !== null && childLock !== '') {
        const locked = childLock === true || childLock === 'on' || childLock === 1;
        await this._writeOnOffAttribute('childLock', locked ? 1 : 0);
        this.log(`[SETTINGS] child_lock applied (${reason}): ${locked}`);
      }
      await this._pushConfiguredInching(reason);
    } catch (e) {
      this.log(`[SETTINGS] ⚠️ stored onoff settings (${reason}): ${e.message}`);
    }
  }

  async _pushConfiguredInching(reason = 'boot') {
    const settings = typeof this.getSettings === 'function' ? this.getSettings() : {};
    const gangCount = Math.max(1, Number(this.gangCount) || 1);
    const inchingConfigs = [];
    for (let gang = 1; gang <= gangCount; gang++) {
      const enabled = settings[`inching_mode_${gang}`];
      if (enabled === undefined || enabled === null || enabled === '') {continue;}
      const duration = parseInt(settings[`inching_duration_${gang}`] || settings.inching_duration || 60, 10);
      inchingConfigs.push({
        gang,
        enabled: enabled === true || enabled === 'on' || enabled === 1 || enabled === 'ENABLE',
        duration: Number.isFinite(duration) ? duration : 60,
      });
    }
    if (inchingConfigs.length === 0) {
      const globalOn = settings.inching || settings.inching_mode;
      if (globalOn === true || globalOn === 'on' || globalOn === 1 || globalOn === 'ENABLE') {
        const duration = parseInt(settings.inching_duration || 60, 10);
        for (let gang = 1; gang <= gangCount; gang++) {
          inchingConfigs.push({
            gang,
            enabled: true,
            duration: Number.isFinite(duration) ? duration : 60,
          });
        }
      }
    }
    if (inchingConfigs.length === 0) {return;}
    if (this.tuyaMultiGang && typeof this.tuyaMultiGang.setInchingMode === 'function') {
      await this.tuyaMultiGang.setInchingMode(inchingConfigs);
      this.log(`[SETTINGS] inching applied (${reason}): ${inchingConfigs.length} gang(s)`);
    }
  }

  async _applyStoredOnOffSettings() {
    return this._pushConfiguredSwitchSettings('boot');
  }

  /**
   * WHY: Gabriel #2182 — show live sibling names instead of a static
   * "connected switches" placeholder. Homey cannot rename capability instances.
   */
  async _refreshConnectedSwitchLabels() {
    if (typeof this.setSettings !== 'function') {return;}
    try {
      const devices = (this.driver && this.driver.getDevices && this.driver.getDevices()) || [];
      const parts = [];
      for (const d of devices) {
        let name = '—';
        try { name = (d.getName && d.getName()) || name; } catch (_e) { /* skip */ }
        let sub = null;
        try { sub = d.getData && d.getData().subDeviceId; } catch (_e) { /* skip */ }
        const role = sub ? `gang (${sub})` : 'main';
        parts.push(`${name} [${role}]`);
      }
      const text = parts.length ? parts.join(' · ') : '—';
      const patch = { connected_siblings: text };
      try {
        const app = this.homey && this.homey.__tuyaApp;
        const mgr = app && app.availabilityManager;
        const id = (this.getData && this.getData().id) || this.id;
        if (mgr && typeof mgr.formatTrafficLabel === 'function' && id) {
          patch.traffic_stats = mgr.formatTrafficLabel(id);
        }
      } catch (_e) { /* optional */ }
      await this.setSettings(patch).catch(() => {});
    } catch (_e) { /* setting may be absent on this driver */ }
  }

  async onEndDeviceAnnounce() {
    try {
      if (typeof super.onEndDeviceAnnounce === 'function') {
        await super.onEndDeviceAnnounce();
      }
    } catch (_e) { /* parent optional */ }
    // WHY: after power loss Tuya dumps backlight/power-on; Homey settings win.
    try {
      await this._pushConfiguredSwitchSettings('rejoin');
    } catch (_e) { /* non-fatal */ }
    try {
      await this._refreshConnectedSwitchLabels();
    } catch (_e) { /* non-fatal */ }
  }

  /**
   * v5.5.812: Read initial state from device
   */
  async _readInitialState(zclNode) {
    this.log('[INIT] Reading initial switch states...');

    // v5.11.99: Tuya DP switches - send dataQuery for immediate state
    if (this._protocolInfo?.isTuyaDP) {
      await this._sendInitialDataQuery?.().catch(() => {});
    }

    for (let gang = 1; gang <= this.gangCount; gang++) {
      const capability = capabilityForOnOffEndpoint(gang, this.gangCount);
      if (!capability || !this.hasCapability(capability)) {continue;}

      try {
        if (gang > 1) {await sleepMs(this, 20 + Math.floor(Math.random() * 30));}
        const endpoint = zclNode?.endpoints?.[gang];
        const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

        if (onOffCluster && typeof onOffCluster.readAttributes === 'function') {
          const attrs = await onOffCluster.readAttributes(['onOff']).catch(() => null);
          if (attrs?.onOff !== undefined) {
            await this.safeSetCapabilityValue(capability, attrs.onOff, { source: 'zcl' }).catch(() => { });
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

    // v5.13.1: User-configurable reporting intervals (Forum: Rudi TX/RX #5417)
    // Tuya plugs can flood the Zigbee mesh with reports — allow users to control this
    const settings = this.getSettings() || {};
    const minReportInterval = parseInt(settings.report_min_interval) || 0;      // Default: immediate
    const maxReportInterval = parseInt(settings.report_max_interval) || 300;    // Default: 5 min

    for (let gang = 1; gang <= this.gangCount; gang++) {
      try {
        const endpoint = zclNode?.endpoints?.[gang];
        const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

        if (onOffCluster && typeof onOffCluster.configureReporting === 'function') {
          let maxIv = maxReportInterval;
          try {
            const { applyReportingJitter } = require('../zigbee/ZclClusterLexicon');
            maxIv = applyReportingJitter(maxReportInterval, 10);
          } catch (_e) { /* optional */ }
          await onOffCluster.configureReporting({
            onOff: {
              minInterval: minReportInterval,
              maxInterval: maxIv,
              minChange: 1
            }
          }).catch(() => { });
          this.log(`[REPORTING] ✅ EP${gang} onOff reporting configured (min=${minReportInterval}s, max=${maxIv}s)`);
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
    if (!endpoint?.clusters) {return;}

    // Check for electrical measurement cluster (0x0B04)
    const elecCluster = endpoint.clusters.haElectricalMeasurement ||
      endpoint.clusters.electricalMeasurement ||
      endpoint.clusters[0x0B04];

    // Check for metering cluster (0x0702)
    const meterCluster = endpoint.clusters.seMetering ||
      endpoint.clusters.metering ||
      endpoint.clusters[0x0702];

    if (!elecCluster && !meterCluster) {return;}

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
      elecCluster.on('attr.activePower', async (value) => {
        const watts = value / 10; // Usually reported in 0.1W units
        await this.safeSetCapabilityValue('measure_power', watts).catch(() => { });
        this.log(`[POWER] Active power: ${watts}W`);
      });

      elecCluster.on('attr.rmsVoltage', async (value) => {
        const volts = value / 10;
        await this.safeSetCapabilityValue('measure_voltage', volts).catch(() => { });
      });

      elecCluster.on('attr.rmsCurrent', async (value) => {
        const amps = value / 1000; // Usually reported in mA
        await this.safeSetCapabilityValue('measure_current', amps).catch(() => { });
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

      meterCluster.on('attr.currentSummationDelivered', async (value) => {
        const kwh = value / 1000; // Convert Wh to kWh
        await this.safeSetCapabilityValue('meter_power', kwh).catch(() => { });
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
    if (!endpoint?.clusters) {return;}

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

  /**
   * Mains EF00 MCUs stop accepting commands if the bus goes quiet
   * (Z2M queryIntervalSeconds, ZHA #5212). Keep a slow dataQuery on
   * real Tuya-DP switches only — never leftover 0xEF00 on ZCL units.
   */
  _startMcuKeepAlive() {
    if (this._mcuKeepAlive || this._isPureTuyaDP !== true || !this.tuyaEF00Manager) {return;}
    const { safeSetInterval } = require('../utils/safe-timers');
    this._mcuKeepAlive = safeSetInterval(this, () => {
      if (this._destroyed) {return;}
      const mgr = this.tuyaEF00Manager;
      const q = mgr && (mgr.queryAllDatapoints || mgr.requestAllDPs);
      if (typeof q === 'function') {
        Promise.resolve(q.call(mgr)).catch(() => {});
      }
    }, 180000);
    this.log('[TUYA-DP] MCU keep-alive every 180s');
  }

  _stopMcuKeepAlive() {
    if (!this._mcuKeepAlive) {return;}
    try {
      const { safeClearInterval } = require('../utils/safe-timers');
      safeClearInterval(this, this._mcuKeepAlive);
    } catch (_e) { /* no-op */ }
    this._mcuKeepAlive = null;
  }

  _teardownSwitchResources() {
    if (this._switchTeardownDone) {return;}
    this._switchTeardownDone = true;
    if (this.protocolOptimizer) {
      try { this.protocolOptimizer.destroy(); } catch (_e) { /* no-op */ }
      this.protocolOptimizer = null;
    }
    if (this.virtualEnergyEstimator && typeof this.virtualEnergyEstimator.destroy === 'function') {
      try { this.virtualEnergyEstimator.destroy(); } catch (_e) { /* no-op */ }
      this.virtualEnergyEstimator = null;
    }
    if (typeof this._cleanupVirtualEnergy === 'function') {
      try { this._cleanupVirtualEnergy(); } catch (_e) { /* no-op */ }
    }
    if (this.smartEnergy && typeof this.smartEnergy.destroy === 'function') {
      try { this.smartEnergy.destroy(); } catch (_e) { /* no-op */ }
      this.smartEnergy = null;
    }
    this._stopMcuKeepAlive();
    this._zclStats = null;
  }

  async onUninit() {
    this._teardownSwitchResources();
    if (super.onUninit) { await super.onUninit(); }
  }

  async onDeleted() {
    this._destroyed = true;
    this._teardownSwitchResources();
    if (super.onDeleted) { await super.onDeleted(); }
  }
}

UnifiedSwitchBase.UnifiedSwitchBase = UnifiedSwitchBase;
Object.assign(UnifiedSwitchBase.prototype, VirtualEnergyMeterMixin);
module.exports = UnifiedSwitchBase;
