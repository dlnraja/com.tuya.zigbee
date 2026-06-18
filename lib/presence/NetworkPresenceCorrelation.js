'use strict';

/**
 * NetworkPresenceCorrelation - WiFi / Bluetooth / router-based presence proxy
 *
 * Homey SDK3 does not expose raw WiFi RSSI, ARP tables, or Bluetooth scans,
 * so this module uses indirect signals that are available inside Homey apps:
 *
 *   - WiFi device capability events (onoff, alarm_power, etc.) on smart plugs / sensors
 *   - WiFi robot vacuum or smart appliance state changes
 *   - Bluetooth-capable device integrations that expose Homey capabilities
 *   - Router-side integrations exposed through Homey flows / other apps
 *
 * Philosophy:
 *   This module does not invent data. It correlates observable Homey capability
 *   events into a WiFi/BT proxy score that the fusion engine can consume.
 *   If the user exposes WiFi/BT router integrations to Homey, this module
 *   benefits automatically.
 */

const EventEmitter = require('events');

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Capability -> presence signal map */
const NETWORK_CAPABILITY_MAP = Object.freeze({
  alarm_motion: { signalType: 'wifi_motion', weight: 0.7 },
  alarm_tamper: { signalType: 'wifi_tamper', weight: 0.3 },
  alarm_contact: { signalType: 'wifi_contact', weight: 0.6 },
  alarmPresence: { signalType: 'wifi_bluetooth_presence', weight: 0.8 },
  alarm_presence: { signalType: 'wifi_bluetooth_presence', weight: 0.8 },
  measure_temperature: { signalType: 'wifi_environment', weight: 0.1, minDelta: 0.3 },
  measure_humidity: { signalType: 'wifi_environment', weight: 0.05, minDelta: 1.0 },
  measure_pressure: { signalType: 'wifi_environment', weight: 0.05, minDelta: 0.2 },
  measure_pm25: { signalType: 'wifi_air_quality', weight: 0.15, minDelta: 3 },
  measure_co2: { signalType: 'wifi_air_quality', weight: 0.15, minDelta: 20 },
  measure_voc: { signalType: 'wifi_air_quality', weight: 0.1, minDelta: 30 },
  measure_power: { signalType: 'wifi_power', weight: 0.25, minDelta: 8 },
  meter_power: { signalType: 'wifi_energy', weight: 0.1 },
  onoff: { signalType: 'wifi_switch', weight: 0.35 },
  dim: { signalType: 'wifi_dimmer', weight: 0.2 },
  locked: { signalType: 'wifi_lock', weight: 0.6 },
  windowcoverings_set: { signalType: 'wifi_cover', weight: 0.2 },
  thermostat_mode: { signalType: 'wifi_thermostat', weight: 0.15 },
});

class NetworkPresenceCorrelation extends EventEmitter {
  constructor(options = {}) {
    super();

    this._logger = typeof options.logger === 'function' ? options.logger : () => {};
    this._nowFn = typeof options.now === 'function' ? options.now : () => Date.now();
    this._presenceTimeoutMs = clampNumber(options.presenceTimeoutMs || 10 * 60 * 1000, 60_000, 60 * 60 * 1000);
    this._recentWindowMs = clampNumber(options.recentWindowMs || 5 * 60 * 1000, 30_000, 30 * 60 * 1000);

    // deviceId -> device state
    this._devices = new Map();

    // Aggregate proxy score
    this._score = 0;
    this._lastUpdate = 0;

    // Decay timer
    this._decayTimer = null;
  }

  /**
   * Register a network-side device for correlation.
   */
  registerDevice(deviceId, meta = {}) {
    if (!deviceId) return;
    if (!this._devices.has(deviceId)) {
      this._devices.set(deviceId, {
        meta: Object.assign({}, meta),
        signals: new Map(),
        lastEventTime: 0,
        isOnline: false,
      });
    } else {
      const entry = this._devices.get(deviceId);
      entry.meta = Object.assign({}, entry.meta, meta);
    }
  }

  /**
   * Update device metadata.
   */
  updateDeviceMeta(deviceId, meta) {
    if (!deviceId || !this._devices.has(deviceId)) return;
    const entry = this._devices.get(deviceId);
    entry.meta = Object.assign({}, entry.meta, meta);
  }

  /**
   * Remove a device.
   */
  removeDevice(deviceId) {
    return this._devices.delete(deviceId);
  }

  /**
   * Ingest a capability change event from a device.
   * Works best when the caller supplies the previous value so delta logic works.
   */
  ingestCapabilityEvent(event) {
    const {
      deviceId,
      capability,
      value,
      previousValue,
      capabilityMeta,
      timestamp = this._nowFn(),
    } = event || {};

    if (!deviceId || !capability) return;
    this.registerDevice(deviceId);

    const mapping = NETWORK_CAPABILITY_MAP[capability] || NETWORK_CAPABILITY_MAP[capabilityMeta];
    if (!mapping) return;

    const entry = this._devices.get(deviceId);
    const numericValue = typeof value === 'number' ? value : value === true ? 1 : value === false ? 0 : null;
    const numericPrev = typeof previousValue === 'number' ? previousValue : previousValue === true ? 1 : previousValue === false ? 0 : null;

    let accept = true;
    if (mapping.minDelta !== undefined && numericValue !== null && numericPrev !== null) {
      accept = Math.abs(numericValue - numericPrev) >= mapping.minDelta;
    }

    if (!accept) return;

    entry.signals.set(mapping.signalType, {
      weight: mapping.weight,
      timestamp,
      value: numericValue,
    });
    entry.lastEventTime = Math.max(entry.lastEventTime, timestamp);
    entry.isOnline = true;

    this._recalcScore(timestamp);
    this._emitProxyUpdate(deviceId, mapping.signalType, timestamp);
  }

  /**
   * Ingest device online/offline event.
   */
  ingestOnlineState(deviceId, isOnline, timestamp = this._nowFn()) {
    if (!deviceId) return;
    this.registerDevice(deviceId);
    const entry = this._devices.get(deviceId);
    entry.isOnline = !!isOnline;
    entry.lastEventTime = timestamp;

    this._recalcScore(timestamp);
    this._emitProxyUpdate(deviceId, 'online_state', timestamp);
  }

  /**
   * Ingest an external router-side presence hint, e.g. from another app or flow.
   * This allows optional WiFi/BT bridge apps to feed data into presence.
   */
  ingestExternalHint(hint) {
    const {
      zoneId,
      deviceId,
      confidence = 0.5,
      source = 'external',
      timestamp = this._nowFn(),
    } = hint || {};

    if (!deviceId && !zoneId) return;

    const key = zoneId || deviceId;
    this.registerDevice(key, { zoneId, source });

    const entry = this._devices.get(key);
    entry.signals.set('external_hint', {
      weight: clampNumber(confidence, 0, 1),
      timestamp,
      value: confidence,
    });
    entry.lastEventTime = timestamp;
    entry.isOnline = true;

    this._recalcScore(timestamp);
    this._emitProxyUpdate(key, 'external_hint', timestamp);
  }

  /**
   * Get current WiFi/BT proxy score.
   */
  getScore() {
    return {
      score: Math.round(this._score * 1000) / 1000,
      lastUpdate: this._lastUpdate,
      deviceCount: this._devices.size,
      activeDevices: this._activeDeviceCount(),
    };
  }

  /**
   * Get diagnostics.
   */
  getDiagnostics() {
    const devices = [];
    for (const [deviceId, entry] of this._devices.entries()) {
      devices.push({
        deviceId,
        meta: entry.meta,
        isOnline: entry.isOnline,
        lastEventTime: entry.lastEventTime,
        signals: Object.fromEntries(entry.signals.entries()),
      });
    }

    return {
      score: this.getScore(),
      devices,
    };
  }

  /**
   * Start periodic decay timer.
   */
  startDecayTimer() {
    if (this._decayTimer) return;
    this._decayTimer = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._recalcScore(this._nowFn());
    }, 30_000);
  }

  /**
   * Stop decay timer.
   */
  stopDecayTimer() {
    if (this._decayTimer) {
      clearInterval(this._decayTimer);
      this._decayTimer = null;
    }
  }

  destroy() {
    this.stopDecayTimer();
    this._devices.clear();
    this._score = 0;
    this.removeAllListeners();
  }

  // --- internals ---

  _activeDeviceCount() {
    let count = 0;
    const now = this._nowFn();
    for (const entry of this._devices.values()) {
      if (entry.isOnline || (entry.lastEventTime > 0 && now - entry.lastEventTime <= this._recentWindowMs)) {
        count += 1;
      }
    }
    return count;
  }

  _recalcScore(timestamp) {
    let total = 0;
    let count = 0;
    const now = timestamp || this._nowFn();

    for (const entry of this._devices.values()) {
      for (const signal of entry.signals.values()) {
        const ageMs = now - signal.timestamp;
        if (ageMs > this._presenceTimeoutMs) continue;
        const decay = Math.pow(0.5, ageMs / this._presenceTimeoutMs);
        total += signal.weight * decay;
        count += 1;
      }
    }

    this._score = count > 0 ? clampNumber(total, 0, 1) : 0;
    this._lastUpdate = now;
  }

  _emitProxyUpdate(deviceId, signalType, timestamp) {
    this.emit('proxy_update', {
      deviceId,
      signalType,
      score: Math.round(this._score * 1000) / 1000,
      timestamp,
    });
  }
}

module.exports = NetworkPresenceCorrelation;
module.exports.NETWORK_CAPABILITY_MAP = NETWORK_CAPABILITY_MAP;
