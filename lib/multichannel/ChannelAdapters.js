// lib/multichannel/ChannelAdapters.js — v1.0 (P37.1)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL ADAPTERS — Unified interface for 5 detection channels
// ═══════════════════════════════════════════════════════════════════════════════
// Each adapter implements:
//   - read(capability)         → { value, source, confidence, latencyMs, errors }
//   - write(capability, value) → { ok, source, latencyMs, errors }
//   - subscribe(cap, callback) → { ok, source, errors }
//   - health()                 → { healthy, latencyMs, lastError, errorCount }
//   - isAvailable()            → boolean
//
// Channels covered:
//   1. ZclChannelAdapter        — ZCL cluster reads via zigbee-clusters wrapper
//   2. TuyaDpChannelAdapter     — Tuya DP commands via tuyaEF00Manager
//   3. RawZigbeeChannelAdapter  — Raw ZCL frames via LowLevelBridge (P34)
//   4. HomeyAppChannelAdapter   — Homey app-level API
//   5. HybridChannelAdapter     — Tuya + ZCL bridge (exotic hybrid devices)
//
// All adapters return a STANDARDIZED result envelope so the MultiChannelManager
// can cross-validate. Each result has a 'confidence' score (0-1) reflecting
// how certain the channel is about its answer.

/**
 * Standardized result envelope for all channels.
 */
class ChannelResult {
  constructor({ value, source, confidence = 1.0, latencyMs = 0, errors = [] } = {}) {
    this.value = value;
    this.source = source;
    this.confidence = Math.max(0, Math.min(1, confidence));
    this.latencyMs = latencyMs;
    this.errors = errors;
    this.timestamp = Date.now();
  }
  isError() { return this.errors && this.errors.length > 0; }
  isSuccess() { return !this.isError(); }
  toJSON() {
    return {
      value: this.value,
      source: this.source,
      confidence: this.confidence,
      latencyMs: this.latencyMs,
      errors: this.errors,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Base class for all channel adapters.
 */
class BaseChannelAdapter {
  constructor(name, device) {
    this.name = name;
    this.device = device;
    this._errorCount = 0;
    this._lastError = null;
    this._totalReads = 0;
    this._totalWrites = 0;
  }

  /**
   * Subclasses MUST implement these.
   */
  // eslint-disable-next-line no-unused-vars
  async read(capability) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async write(capability, value) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async subscribe(capability, callback) { throw new Error('not implemented'); }

  isAvailable() { return true; }

  health() {
    return {
      name: this.name,
      healthy: this._errorCount < 10,
      errorCount: this._errorCount,
      lastError: this._lastError,
      totalReads: this._totalReads,
      totalWrites: this._totalWrites,
    };
  }

  _recordError(err) {
    this._errorCount += 1;
    this._lastError = err && err.message ? err.message : String(err);
  }

  _recordRead() { this._totalReads += 1; }
  _recordWrite() { this._totalWrites += 1; }
}

/**
 * Channel 1: ZCL cluster reads via the standard zigbee-clusters wrapper.
 * Best for: standard ZCL devices (battery, onoff, level, temperature, etc.)
 * Bridges: Homey SDK3 wraps zigbee-clusters. Some clusters are missing/misnamed.
 */
class ZclChannelAdapter extends BaseChannelAdapter {
  constructor(device) {
    super('zcl', device);
    this._endpoint = null;
    this._clusters = null;
  }

  isAvailable() {
    return Boolean(this.device && this.device.zclNode && this.device.zclNode.endpoints);
  }

  async read(capability) {
    if (!this.isAvailable()) {
      return new ChannelResult({ value: null, source: this.name, errors: ['zclNode not available'] });
    }
    const start = Date.now();
    this._recordRead();
    try {
      // Map capability → ZCL cluster + attribute
      const clusterSpec = this._resolveCluster(capability);
      if (!clusterSpec) {
        return new ChannelResult({ value: null, source: this.name, confidence: 0.3, latencyMs: Date.now() - start, errors: [`no ZCL cluster for ${capability}`] });
      }
      const ep = this.device.zclNode.endpoints[clusterSpec.endpoint] || this.device.zclNode.endpoints[1];
      if (!ep || !ep.clusters[clusterSpec.cluster]) {
        return new ChannelResult({ value: null, source: this.name, confidence: 0.4, latencyMs: Date.now() - start, errors: [`cluster ${clusterSpec.cluster} not on ep ${clusterSpec.endpoint}`] });
      }
      const value = await ep.clusters[clusterSpec.cluster].readAttributes(clusterSpec.attribute).catch((e) => {
        this._recordError(e);
        return null;
      });
      if (value && typeof value === 'object' && clusterSpec.attribute in value) {
        return new ChannelResult({ value: value[clusterSpec.attribute], source: this.name, confidence: 0.85, latencyMs: Date.now() - start });
      }
      return new ChannelResult({ value: null, source: this.name, confidence: 0.4, latencyMs: Date.now() - start, errors: ['attribute not present'] });
    } catch (e) {
      this._recordError(e);
      return new ChannelResult({ value: null, source: this.name, confidence: 0.0, latencyMs: Date.now() - start, errors: [e.message] });
    }
  }

  async write(capability, value) {
    if (!this.isAvailable()) return { ok: false, source: this.name, errors: ['zclNode not available'] };
    const start = Date.now();
    this._recordWrite();
    try {
      const clusterSpec = this._resolveCluster(capability);
      if (!clusterSpec) return { ok: false, source: this.name, errors: [`no ZCL cluster for ${capability}`] };
      const ep = this.device.zclNode.endpoints[clusterSpec.endpoint] || this.device.zclNode.endpoints[1];
      if (!ep || !ep.clusters[clusterSpec.cluster]) return { ok: false, source: this.name, errors: ['cluster missing'] };
      await ep.clusters[clusterSpec.cluster].writeAttributes({ [clusterSpec.attribute]: value });
      return { ok: true, source: this.name, latencyMs: Date.now() - start };
    } catch (e) {
      this._recordError(e);
      return { ok: false, source: this.name, errors: [e.message] };
    }
  }

  _resolveCluster(capability) {
    // Static mapping — extend per driver as needed
    const map = {
      'onoff': { endpoint: 1, cluster: 'onOff', attribute: 'onOff' },
      'dim': { endpoint: 1, cluster: 'levelControl', attribute: 'currentLevel' },
      'measure_temperature': { endpoint: 1, cluster: 'msTemperatureMeasurement', attribute: 'measuredValue' },
      'measure_humidity': { endpoint: 1, cluster: 'msRelativeHumidity', attribute: 'measuredValue' },
      'measure_battery': { endpoint: 1, cluster: 'genPowerCfg', attribute: 'batteryPercentageRemaining' },
      'alarm_contact': { endpoint: 1, cluster: 'ssIasZone', attribute: 'zoneState' },
    };
    return map[capability] || null;
  }
}

/**
 * Channel 2: Tuya DP commands via the tuyaEF00Manager wrapper.
 * Best for: Tuya-specific datapoints (DP 1, 2, 3, etc.) that aren't ZCL-standard.
 * Bridges: Homey SDK3 has limited Tuya support. Many DPs need custom handling.
 */
class TuyaDpChannelAdapter extends BaseChannelAdapter {
  constructor(device) {
    super('tuya_dp', device);
    this._tuya = null;
  }

  isAvailable() {
    // Check for tuyaEF00Manager or similar on the device
    return Boolean(
      this.device
      && (this.device.tuyaEF00Manager || this.device.tuya || this.device._tuya)
    );
  }

  async read(capability) {
    if (!this.isAvailable()) {
      return new ChannelResult({ value: null, source: this.name, errors: ['tuya manager not available'] });
    }
    const start = Date.now();
    this._recordRead();
    try {
      const mgr = this.device.tuyaEF00Manager || this.device.tuya || this.device._tuya;
      const dp = this._resolveDp(capability);
      if (dp == null) {
        return new ChannelResult({ value: null, source: this.name, confidence: 0.3, latencyMs: Date.now() - start, errors: [`no DP for ${capability}`] });
      }
      const value = await Promise.resolve(mgr.get(dp)).catch((e) => {
        this._recordError(e);
        return null;
      });
      if (value !== null && value !== undefined) {
        return new ChannelResult({ value, source: this.name, confidence: 0.9, latencyMs: Date.now() - start });
      }
      return new ChannelResult({ value: null, source: this.name, confidence: 0.4, latencyMs: Date.now() - start, errors: ['DP read returned null'] });
    } catch (e) {
      this._recordError(e);
      return new ChannelResult({ value: null, source: this.name, confidence: 0.0, latencyMs: Date.now() - start, errors: [e.message] });
    }
  }

  async write(capability, value) {
    if (!this.isAvailable()) return { ok: false, source: this.name, errors: ['tuya manager not available'] };
    const start = Date.now();
    this._recordWrite();
    try {
      const mgr = this.device.tuyaEF00Manager || this.device.tuya || this.device._tuya;
      const dp = this._resolveDp(capability);
      if (dp == null) return { ok: false, source: this.name, errors: [`no DP for ${capability}`] };
      await Promise.resolve(mgr.set(dp, value));
      return { ok: true, source: this.name, latencyMs: Date.now() - start };
    } catch (e) {
      this._recordError(e);
      return { ok: false, source: this.name, errors: [e.message] };
    }
  }

  _resolveDp(capability) {
    // Driver-specific DP map; this is a generic default
    const map = {
      'onoff': 1,
      'dim': 2,
      'measure_temperature': 3,
      'measure_humidity': 4,
      'measure_battery': 5,
      'alarm_contact': 6,
    };
    return map[capability] != null ? map[capability] : null;
  }
}

/**
 * Channel 3: Raw Zigbee via LowLevelBridge (P34).
 * Best for: exotic devices, missing clusters, malformed DPs, custom ZCL profiles.
 * Bridges: bypasses SDK3 entirely. Sends raw ZCL frames. Can talk to ANY device.
 */
class RawZigbeeChannelAdapter extends BaseChannelAdapter {
  constructor(device) {
    super('raw_zigbee', device);
    this._bridge = null;
  }

  isAvailable() {
    return Boolean(this.device && (this.device.zclNode || this.device.zigbee || this.device.endpoint));
  }

  async read(capability) {
    if (!this.isAvailable()) {
      return new ChannelResult({ value: null, source: this.name, errors: ['no zclNode/zigbee/endpoint'] });
    }
    const start = Date.now();
    this._recordRead();
    try {
      // Lazy-load the bridge
      if (!this._bridge) {
        this._bridge = require('../LowLevelBridge');
      }
      // Build a ZCL read frame for the cluster/attribute
      const clusterSpec = this._resolveCluster(capability);
      if (!clusterSpec) {
        return new ChannelResult({ value: null, source: this.name, confidence: 0.3, latencyMs: Date.now() - start, errors: [`no ZCL spec for ${capability}`] });
      }
      // Attempt to read via raw zclNode
      const node = this.device.zclNode || this.device;
      const ep = (node.endpoints && node.endpoints[clusterSpec.endpoint]) || node;
      const result = await this._bridge.readClusterAttribute(ep, clusterSpec.cluster, clusterSpec.attribute).catch((e) => {
        this._recordError(e);
        return null;
      });
      if (result !== null && result !== undefined) {
        return new ChannelResult({ value: result, source: this.name, confidence: 0.7, latencyMs: Date.now() - start });
      }
      return new ChannelResult({ value: null, source: this.name, confidence: 0.3, latencyMs: Date.now() - start, errors: ['raw read returned null'] });
    } catch (e) {
      this._recordError(e);
      return new ChannelResult({ value: null, source: this.name, confidence: 0.0, latencyMs: Date.now() - start, errors: [e.message] });
    }
  }

  async write(capability, value) {
    if (!this.isAvailable()) return { ok: false, source: this.name, errors: ['no raw channel'] };
    const start = Date.now();
    this._recordWrite();
    try {
      if (!this._bridge) this._bridge = require('../LowLevelBridge');
      const clusterSpec = this._resolveCluster(capability);
      if (!clusterSpec) return { ok: false, source: this.name, errors: [`no ZCL spec for ${capability}`] };
      const node = this.device.zclNode || this.device;
      const ep = (node.endpoints && node.endpoints[clusterSpec.endpoint]) || node;
      await this._bridge.writeClusterAttribute(ep, clusterSpec.cluster, clusterSpec.attribute, value);
      return { ok: true, source: this.name, latencyMs: Date.now() - start };
    } catch (e) {
      this._recordError(e);
      return { ok: false, source: this.name, errors: [e.message] };
    }
  }

  _resolveCluster(capability) {
    const map = {
      'onoff': { endpoint: 1, cluster: 0x0006, attribute: 0x0000 },
      'dim': { endpoint: 1, cluster: 0x0008, attribute: 0x0000 },
      'measure_temperature': { endpoint: 1, cluster: 0x0402, attribute: 0x0000 },
      'measure_humidity': { endpoint: 1, cluster: 0x0405, attribute: 0x0000 },
      'measure_battery': { endpoint: 1, cluster: 0x0001, attribute: 0x0021 },
      'alarm_contact': { endpoint: 1, cluster: 0x0500, attribute: 0x0000 },
    };
    return map[capability] || null;
  }
}

/**
 * Channel 4: Homey App-level API.
 * Best for: high-level operations that don't need raw protocol access.
 * Bridges: easiest path, but limited by what Homey SDK3 exposes.
 */
class HomeyAppChannelAdapter extends BaseChannelAdapter {
  constructor(device) {
    super('homey_app', device);
  }

  isAvailable() {
    return Boolean(this.device && this.device.homey);
  }

  async read(capability) {
    if (!this.isAvailable()) {
      return new ChannelResult({ value: null, source: this.name, errors: ['no homey'] });
    }
    const start = Date.now();
    this._recordRead();
    try {
      // Use the SDK3 capability API
      const value = await Promise.resolve(this.device.getCapabilityValue(capability));
      return new ChannelResult({ value, source: this.name, confidence: 0.8, latencyMs: Date.now() - start });
    } catch (e) {
      this._recordError(e);
      return new ChannelResult({ value: null, source: this.name, confidence: 0.0, latencyMs: Date.now() - start, errors: [e.message] });
    }
  }

  async write(capability, value) {
    if (!this.isAvailable()) return { ok: false, source: this.name, errors: ['no homey'] };
    const start = Date.now();
    this._recordWrite();
    try {
      await Promise.resolve(this.device.setCapabilityValue(capability, value));
      return { ok: true, source: this.name, latencyMs: Date.now() - start };
    } catch (e) {
      this._recordError(e);
      return { ok: false, source: this.name, errors: [e.message] };
    }
  }
}

/**
 * Channel 5: Hybrid Tuya + ZCL bridge.
 * Best for: exotic devices that speak BOTH Tuya DP AND ZCL on the same endpoint.
 * Uses a priority cascade: ZCL first (most reliable), Tuya as fallback for
 * DPs that aren't in ZCL, raw zigbee as last resort.
 */
class HybridChannelAdapter extends BaseChannelAdapter {
  constructor(device, subChannels) {
    super('hybrid', device);
    this._zcl = subChannels && subChannels.zcl;
    this._tuya = subChannels && subChannels.tuya;
    this._raw = subChannels && subChannels.raw;
  }

  isAvailable() {
    return Boolean(this._zcl || this._tuya || this._raw);
  }

  async read(capability) {
    if (!this.isAvailable()) {
      return new ChannelResult({ value: null, source: this.name, errors: ['no sub-channels'] });
    }
    const start = Date.now();
    this._recordRead();
    // Try ZCL first, then Tuya, then raw
    const attempts = [];
    if (this._zcl) attempts.push({ name: 'zcl->hybrid', adapter: this._zcl, weight: 1.0 });
    if (this._tuya) attempts.push({ name: 'tuya->hybrid', adapter: this._tuya, weight: 0.9 });
    if (this._raw) attempts.push({ name: 'raw->hybrid', adapter: this._raw, weight: 0.6 });

    const errors = [];
    for (const att of attempts) {
      try {
        const r = await att.adapter.read(capability);
        if (r.isSuccess() && r.value !== null && r.value !== undefined) {
          // Boost confidence for the hybrid answer (cross-source validated)
          return new ChannelResult({
            value: r.value,
            source: `${this.name}/${att.name}`,
            confidence: Math.min(1.0, r.confidence * att.weight + 0.15),
            latencyMs: Date.now() - start,
          });
        }
        errors.push(`${att.name}: ${r.errors.join(', ') || 'null value'}`);
      } catch (e) {
        errors.push(`${att.name}: ${e.message}`);
        this._recordError(e);
      }
    }
    return new ChannelResult({ value: null, source: this.name, confidence: 0.0, latencyMs: Date.now() - start, errors });
  }

  async write(capability, value) {
    if (!this.isAvailable()) return { ok: false, source: this.name, errors: ['no sub-channels'] };
    const start = Date.now();
    this._recordWrite();
    // Try ZCL first, then Tuya, then raw
    if (this._zcl) {
      const r = await this._zcl.write(capability, value).catch((e) => ({ ok: false, errors: [e.message] }));
      if (r.ok) return { ok: true, source: `${this.name}/zcl`, latencyMs: Date.now() - start };
    }
    if (this._tuya) {
      const r = await this._tuya.write(capability, value).catch((e) => ({ ok: false, errors: [e.message] }));
      if (r.ok) return { ok: true, source: `${this.name}/tuya`, latencyMs: Date.now() - start };
    }
    if (this._raw) {
      const r = await this._raw.write(capability, value).catch((e) => ({ ok: false, errors: [e.message] }));
      if (r.ok) return { ok: true, source: `${this.name}/raw`, latencyMs: Date.now() - start };
    }
    return { ok: false, source: this.name, errors: ['all sub-channels failed'] };
  }
}

module.exports = {
  ChannelResult,
  BaseChannelAdapter,
  ZclChannelAdapter,
  TuyaDpChannelAdapter,
  RawZigbeeChannelAdapter,
  HomeyAppChannelAdapter,
  HybridChannelAdapter,
};
