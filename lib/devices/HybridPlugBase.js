'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridPlugBase - Base class for ALL Tuya smart plugs
 *
 * v5.3.63: Centralized base for plugs with energy monitoring
 *
 * FEATURES:
 * - On/Off control (ZCL or Tuya DP)
 * - Energy monitoring (power, voltage, current, energy)
 * - Anti-double initialization
 * - MaxListeners bump
 * - Protocol auto-detection
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
    this.log('║          HYBRID PLUG BASE v5.3.63                           ║');
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

    // Register on/off capability listener
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._setOnOff(value);
      });
    }

    this.log('[HYBRID-PLUG] ✅ Initialization complete');
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

      for (const endpoint of Object.values(zclNode.endpoints)) {
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

  async _setupTuyaDPMode() {
    this.log('[TUYA-DP] Setting up Tuya DP mode for plug...');

    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleDP(dpId, value);
      });
    }
  }

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] Setting up ZCL mode for plug...');

    const endpoint = zclNode?.endpoints?.[1];
    const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;

    if (onOffCluster && this.hasCapability('onoff')) {
      onOffCluster.on('attr.onOff', (value) => {
        this.log(`[ZCL] onoff = ${value}`);
        this.setCapabilityValue('onoff', value).catch(() => { });
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
    if (this._isPureTuyaDP) return;
    return super.registerCapability(capabilityId, clusterId, opts);
  }
}

module.exports = HybridPlugBase;
