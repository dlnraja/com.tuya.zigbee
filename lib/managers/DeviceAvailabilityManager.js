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
const BOOT_GRACE_MS = 5 * 60 * 1000;       // mesh settle after app restart
const LAST_SEEN_STORE_KEY = 'avail_last_seen_ts';
const LAST_SEEN_PERSIST_MIN_MS = 30 * 1000;

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

  _restoreLastSeen(device) {
    try {
      const raw = device.getStoreValue && device.getStoreValue(LAST_SEEN_STORE_KEY);
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0 && n <= Date.now() + 5000) {
        return n;
      }
    } catch (_e) { /* store optional */ }
    return Date.now();
  }

  _persistLastSeen(entry, force = false) {
    if (!entry || !entry.device) {return;}
    const now = Date.now();
    if (!force && entry._lastPersistAt && (now - entry._lastPersistAt) < LAST_SEEN_PERSIST_MIN_MS) {
      return;
    }
    entry._lastPersistAt = now;
    try {
      if (typeof entry.device.setStoreValue === 'function') {
        const p = entry.device.setStoreValue(LAST_SEEN_STORE_KEY, entry.lastSeen);
        if (p && typeof p.catch === 'function') {p.catch(() => {});}
      }
    } catch (_e) { /* store optional */ }
  }

  registerDevice(device) {
    if (!device || this._destroyed) { return; }
    try {
      const id = (device.getData && device.getData().id) || device.id;
      if (!id || this._devices.has(id)) { return; }
      this._devices.set(id, {
        lastSeen: this._restoreLastSeen(device),
        registeredAt: Date.now(),
        isBattery: this._isBatteryDevice(device),
        unavailableSince: null,
        name: (device.getName && device.getName()) || id,
        device, // SDK3: device trigger cards need the real device object
        intervalEma: null,
        lastRejoinAt: 0,
        pollFailStreak: 0,
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
    const now = Date.now();
    const gapMs = now - (entry.lastSeen || now);
    entry.lastSeen = now;
    if (gapMs > 2000 && gapMs < 30 * 60 * 1000 && !entry.isBattery) {
      entry.intervalEma = entry.intervalEma == null
        ? gapMs
        : (0.2 * gapMs) + (0.8 * entry.intervalEma);
    }
    entry.pollFailStreak = 0;
    this._persistLastSeen(entry);
    if (gapMs >= 30000 && entry.unavailableSince === null) {
      this._emitRejoin(entry, deviceId, gapMs, 'power_restore');
    }
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

  /**
   * Boot-dump burst (backlight + power-on + relay state in a few dozen ms).
   * Fires even for a 1s outage that never reached the unavailable timeout.
   * Ignores the first 90s after register (app-start dump) and duplicate bursts.
   */
  noteBootDump(device) {
    if (!device || this._destroyed) {return false;}
    try {
      const id = (device.getData && device.getData().id) || device.id;
      if (!id) {return false;}
      if (!this._devices.has(id)) {this.registerDevice(device);}
      const entry = this._devices.get(id);
      if (!entry || entry.isBattery) {return false;}
      const now = Date.now();
      if (now - (entry.registeredAt || now) < 90 * 1000) {return false;}
      if (now - (entry.lastRejoinAt || 0) < 120 * 1000) {return false;}
      const gapMs = now - (entry.lastSeen || now);
      this._emitRejoin(entry, id, Math.max(gapMs, 0), 'boot_dump');
      return true;
    } catch (_e) {
      return false;
    }
  }

  _emitRejoin(entry, deviceId, gapMs, reason) {
    const now = Date.now();
    if (entry.lastRejoinAt && (now - entry.lastRejoinAt) < 120 * 1000) {
      return;
    }
    entry.lastRejoinAt = now;
    entry.lastSilenceClass = reason;
    entry.powerRestoreCount = (entry.powerRestoreCount || 0) + 1;
    this._log(`[AVAIL] 🔌 ${entry.name} rejoin (${reason}) after ${Math.round(gapMs / 1000)}s`);
    this.emit('rejoined', {
      deviceId,
      device: entry.device,
      name: entry.name,
      gap_ms: gapMs,
      is_battery: entry.isBattery,
      reason,
    });
    try {
      if (entry.device && typeof entry.device._pushConfiguredSwitchSettings === 'function') {
        entry.device._pushConfiguredSwitchSettings(`avail-${reason}`).catch(() => {});
      }
    } catch (_e) { /* optional */ }
  }

  /** Stop hammering a plug that was unplugged: 5s, 10s, 20s … cap 5 min. */
  nextPollDelayMs(deviceId) {
    const entry = this._devices.get(deviceId);
    if (!entry) {return 0;}
    if (entry.unavailableSince) {
      const streak = Math.min(entry.pollFailStreak || 0, 6);
      return Math.min(5000 * (2 ** streak), 5 * 60 * 1000);
    }
    return 0;
  }

  notePollFailure(deviceId) {
    const entry = this._devices.get(deviceId);
    if (!entry) {return;}
    entry.pollFailStreak = Math.min((entry.pollFailStreak || 0) + 1, 8);
  }

  _timeoutFor(entry) {
    if (entry.isBattery) {return this._batteryTimeoutMs;}
    if (entry.intervalEma && entry.intervalEma > 0) {
      const adaptive = Math.round(2 * entry.intervalEma);
      return Math.min(Math.max(adaptive, 3 * 60 * 1000), 20 * 60 * 1000);
    }
    return this._mainsTimeoutMs;
  }

  _evaluate() {
    if (this._destroyed) { return; }
    const now = Date.now();
    for (const [deviceId, entry] of this._devices) {
      if (entry.unavailableSince !== null) { continue; }
      // Mesh settle after app restart: keep previous available until grace ends,
      // then use the restored lastSeen (pre-restart offline is then visible).
      if ((now - (entry.registeredAt || now)) < BOOT_GRACE_MS) { continue; }
      const silentMs = now - entry.lastSeen;
      if (silentMs > this._timeoutFor(entry)) {
        entry.unavailableSince = now;
        const silentMinutes = Math.round(silentMs / 60000);
        this._log(`[AVAIL] ⚠️ ${entry.name} unavailable (${silentMinutes} min silent, ${entry.isBattery ? 'battery' : 'mains'})`);
        entry.lastSilenceClass = 'silence_timeout';
        this.emit('unavailable', { deviceId, device: entry.device, name: entry.name, minutes_silent: silentMinutes, is_battery: entry.isBattery, reason: 'silence_timeout' });
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
    let powerRestoreCount = 0;
    for (const [deviceId, entry] of this._devices) {
      if (entry.isBattery) { batteryCount++; }
      powerRestoreCount += entry.powerRestoreCount || 0;
      if (entry.unavailableSince !== null) {
        unavailable.push({
          deviceId,
          name: entry.name,
          since: entry.unavailableSince,
          silence_class: entry.lastSilenceClass || 'silence_timeout',
        });
      }
    }
    return {
      total_devices: this._devices.size,
      battery_devices: batteryCount,
      mains_devices: this._devices.size - batteryCount,
      unavailable_count: unavailable.length,
      unavailable,
      power_restore_count: powerRestoreCount,
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
module.exports.BOOT_GRACE_MS = BOOT_GRACE_MS;
module.exports.LAST_SEEN_STORE_KEY = LAST_SEEN_STORE_KEY;
