'use strict';

/**
 * DeviceAvailabilityManager — v9.0.401 (P92.104)
 *
 * Availability monitoring inspired by zigbee2mqtt's availability feature and
 * ZHA timeouts, adapted to Homey SDK3 and hardened for a 400+ driver app:
 *
 * - Every incoming frame marks the device as seen (hooked once in
 *   TuyaZigbeeDevice's universal handleFrame wrapper — zero per-driver work).
 * - Devices are classified mains vs battery (capabilities heuristic:
 *   measure_battery/alarm_battery present → battery device, else mains).
 * - Timeouts (aligned with z2m "simple" mode, ZHA is more lax):
 *     mains   15 min silent → unavailable
 *     battery 24 h   silent → unavailable
 * - State changes are emitted as events (`unavailable` / `back_online`) that
 *   FeatureFlowCards turns into flow triggers.
 * - Passive by design: NO active pinging. z2m pings mains devices before
 *   declaring them down; on Homey that would multiply mesh traffic on sleepy
 *   networks, so unavailability is declared on silence only (documented
 *   trade-off — a mains device that is electrically off will be reported
 *   after the timeout, which is exactly what users ask for).
 * - Timer uses the Rule-28 fallback (this.homey?.setInterval || globalThis).
 */

const { EventEmitter } = require('events');

const EVAL_INTERVAL_MS = 60 * 1000;        // evaluate every minute
const MAINS_TIMEOUT_MS = 15 * 60 * 1000;   // 15 min silent (mains)
const BATTERY_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 h silent (battery)

class DeviceAvailabilityManager extends EventEmitter {

  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this._devices = new Map(); // deviceId → { lastSeen, isBattery, unavailableSince, name }
    this._evalTimer = null;
    this._destroyed = false;
    this._mainsTimeoutMs = options.mainsTimeoutMs || MAINS_TIMEOUT_MS;
    this._batteryTimeoutMs = options.batteryTimeoutMs || BATTERY_TIMEOUT_MS;
    this._log = options.logger || (() => {});
  }

  /**
   * Classify a device as battery-powered from its capabilities.
   * A mains device may still have measure_battery (backup cells) but that is
   * rare enough that the capability heuristic matches z2m's behaviour.
   */
  _isBatteryDevice(device) {
    try {
      const caps = (device.getCapabilities && device.getCapabilities()) || [];
      return caps.includes('measure_battery') || caps.includes('alarm_battery');
    } catch (_e) {
      return false;
    }
  }

  registerDevice(device) {
    if (!device || this._destroyed) { return; }
    try {
      const id = (device.getData && device.getData().id) || device.id;
      if (!id || this._devices.has(id)) { return; }
      this._devices.set(id, {
        lastSeen: Date.now(),
        isBattery: this._isBatteryDevice(device),
        unavailableSince: null,
        name: (device.getName && device.getName()) || id,
        device, // SDK3: device trigger cards need the real device object
      });
    } catch (_e) { /* non-critical */ }
  }

  unregisterDevice(deviceId) {
    this._devices.delete(deviceId);
  }

  /** Called by the universal frame hook on every incoming frame. */
  markSeen(deviceId) {
    const entry = this._devices.get(deviceId);
    if (!entry) { return; }
    entry.lastSeen = Date.now();
    if (entry.unavailableSince !== null) {
      const silentMinutes = Math.round((Date.now() - entry.unavailableSince) / 60000);
      entry.unavailableSince = null;
      this._log(`[AVAIL] ✅ ${entry.name} back online after ${silentMinutes} min`);
      this.emit('back_online', { deviceId, device: entry.device, name: entry.name, minutes_silent: silentMinutes, is_battery: entry.isBattery });
    }
  }

  /** Devices registered lazily (first frame seen for an unknown id). */
  markSeenLazy(deviceId, device) {
    if (!this._devices.has(deviceId)) { this.registerDevice(device); }
    this.markSeen(deviceId);
  }

  _timeoutFor(entry) {
    return entry.isBattery ? this._batteryTimeoutMs : this._mainsTimeoutMs;
  }

  _evaluate() {
    if (this._destroyed) { return; }
    const now = Date.now();
    for (const [deviceId, entry] of this._devices) {
      if (entry.unavailableSince !== null) { continue; }
      const silentMs = now - entry.lastSeen;
      if (silentMs > this._timeoutFor(entry)) {
        entry.unavailableSince = now;
        const silentMinutes = Math.round(silentMs / 60000);
        this._log(`[AVAIL] ⚠️ ${entry.name} unavailable (${silentMinutes} min silent, ${entry.isBattery ? 'battery' : 'mains'})`);
        this.emit('unavailable', { deviceId, device: entry.device, name: entry.name, minutes_silent: silentMinutes, is_battery: entry.isBattery });
      }
    }
  }

  start() {
    if (this._destroyed || this._evalTimer) { return; }
    const scheduler = this.homey && typeof this.homey.setInterval === 'function' ? this.homey : globalThis;
    this._evalTimer = scheduler.setInterval(() => {
      if (this._destroyed) { return; }
      try { this._evaluate(); } catch (e) { this._log('[AVAIL] evaluate error:', e.message); }
    }, EVAL_INTERVAL_MS);
  }

  isUnavailable(deviceId) {
    const entry = this._devices.get(deviceId);
    return entry ? entry.unavailableSince !== null : false;
  }

  getReport() {
    const unavailable = [];
    let batteryCount = 0;
    for (const [deviceId, entry] of this._devices) {
      if (entry.isBattery) { batteryCount++; }
      if (entry.unavailableSince !== null) {
        unavailable.push({ deviceId, name: entry.name, since: entry.unavailableSince });
      }
    }
    return {
      total_devices: this._devices.size,
      battery_devices: batteryCount,
      mains_devices: this._devices.size - batteryCount,
      unavailable_count: unavailable.length,
      unavailable,
    };
  }

  destroy() {
    this._destroyed = true;
    if (this._evalTimer) {
      const scheduler = this.homey && typeof this.homey.clearInterval === 'function' ? this.homey : globalThis;
      scheduler.clearInterval(this._evalTimer);
      this._evalTimer = null;
    }
    this.removeAllListeners();
  }
}

module.exports = DeviceAvailabilityManager;
