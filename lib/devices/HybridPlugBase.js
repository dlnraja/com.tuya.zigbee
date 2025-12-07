'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { BoundCluster } = require('zigbee-clusters');
const greenPower = require('../green_power');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const { getAppVersionPrefixed } = require('../utils/AppVersion');

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

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      9: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true },
      17: { capability: 'measure_current', divisor: 1000 },   // mA → A
      18: { capability: 'measure_power', divisor: 10 },       // W * 10
      19: { capability: 'measure_voltage', divisor: 10 },     // V * 10
      20: { capability: 'meter_power', divisor: 100 }         // kWh * 100
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridPlugInited) {
      this.log('[HYBRID-PLUG] ⚠️ Already initialized');
      return;
    }
    this._hybridPlugInited = true;

    // Reject phantom sub-devices
    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable(`⚠️ Phantom device (subDevice ${data.subDeviceId}). Delete this.`).catch(() => { });
      return;
    }

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

    this.log('[HYBRID-PLUG] ✅ Initialization complete (TRUE HYBRID mode)');
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const modelId = settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');

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
   * Parse raw Tuya frame
   */
  _parseTuyaRawFrame(buffer) {
    try {
      if (buffer.length < 6) return;
      let offset = 2;
      while (offset + 4 <= buffer.length) {
        const dpId = buffer.readUInt8(offset);
        const dpType = buffer.readUInt8(offset + 1);
        const length = buffer.readUInt16BE(offset + 2);
        offset += 4;
        if (offset + length > buffer.length) break;
        const dataSlice = buffer.slice(offset, offset + length);
        let value;
        switch (dpType) {
          case 0x01: value = dataSlice.readUInt8(0) === 1; break;
          case 0x02: value = dataSlice.readInt32BE(0); break;
          case 0x04: value = dataSlice.readUInt8(0); break;
          case 0x03: value = dataSlice.toString('utf8'); break;
          default: value = dataSlice;
        }
        this.log(`[TUYA-RAW] DP${dpId} = ${value}`);
        // v5.5.63: Register hit with optimizer
        if (this.protocolOptimizer) {
          this.protocolOptimizer.registerHit('tuya', dpId, value);
        }
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('tuya')) {
          this._handleDP(dpId, value);
        }
        offset += length;
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
        this.setCapabilityValue('measure_power', value).catch(() => { });
      });
    }

    if (electricalCluster) {
      electricalCluster.on('attr.activePower', (value) => {
        this.setCapabilityValue('measure_power', value / 10).catch(() => { });
      });
      electricalCluster.on('attr.rmsVoltage', (value) => {
        this.setCapabilityValue('measure_voltage', value / 10).catch(() => { });
      });
      electricalCluster.on('attr.rmsCurrent', (value) => {
        this.setCapabilityValue('measure_current', value / 1000).catch(() => { });
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

    this.log(`[DP] DP${dpId} → ${mapping.capability} = ${value}`);

    if (this.hasCapability(mapping.capability)) {
      this.setCapabilityValue(mapping.capability, value).catch(() => { });
    }
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

  async onDeleted() {
    // v5.5.63: Cleanup optimizer
    if (this.protocolOptimizer) {
      this.protocolOptimizer.destroy();
      this.protocolOptimizer = null;
    }
  }
}

module.exports = HybridPlugBase;
