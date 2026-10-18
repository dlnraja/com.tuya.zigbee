'use strict';

/**
 * SensorSuppressionManager — v9.0.402 (P92.105)
 *
 * Inspired by the Philips Hue app's "suppress sensor" flow action: temporarily
 * mute a motion/presence sensor's flow triggers (e.g. disable hallway motion
 * while watching a movie) without unpairing or changing any setting.
 *
 * Improvements over the reference implementation:
 * - Central enforcement in TuyaZigbeeDevice.triggerFlowCard (single choke
 *   point for every Zigbee device) instead of per-driver flags.
 * - Auto-expiry with Rule-28 safe timers (no leaked timers on app stop).
 * - Pattern-based scoping: only motion/presence-style cards are blocked;
 *   battery, tamper and health alerts still fire while a sensor is muted.
 */

const SUPPRESSIBLE_RX = /motion|presence|occupancy|movement|pir/i;

class SensorSuppressionManager {

  constructor(homey, options = {}) {
    this.homey = homey;
    this._suppressed = new Map(); // deviceId → { until, timer, name }
    this._destroyed = false;
    this._log = options.logger || (() => {});
  }

  suppress(deviceId, minutes, name) {
    if (!deviceId || this._destroyed) { return false; }
    const durationMs = Math.max(1, Math.round(minutes)) * 60 * 1000;
    const existing = this._suppressed.get(deviceId);
    if (existing) { this._clearTimer(existing); }

    const scheduler = this.homey && typeof this.homey.setTimeout === 'function' ? this.homey : globalThis;
    const entry = {
      until: Date.now() + durationMs,
      name: name || deviceId,
      timer: scheduler.setTimeout(() => {
        this._suppressed.delete(deviceId);
        this._log(`[SUPPRESS] ✅ ${entry.name} suppression expired (motion flows active again)`);
      }, durationMs),
    };
    this._suppressed.set(deviceId, entry);
    this._log(`[SUPPRESS] 🔇 ${entry.name} motion flows muted for ${Math.round(minutes)} min`);
    return true;
  }

  unsuppress(deviceId) {
    const existing = this._suppressed.get(deviceId);
    if (!existing) { return false; }
    this._clearTimer(existing);
    this._suppressed.delete(deviceId);
    this._log(`[SUPPRESS] 🔊 ${existing.name} suppression lifted manually`);
    return true;
  }

  _clearTimer(entry) {
    if (!entry.timer) { return; }
    const scheduler = this.homey && typeof this.homey.clearTimeout === 'function' ? this.homey : globalThis;
    scheduler.clearTimeout(entry.timer);
  }

  isSuppressed(deviceId) {
    return this._suppressed.has(deviceId);
  }

  /** True when a flow card is motion/presence-related and may be muted. */
  isSuppressibleCard(cardId) {
    return typeof cardId === 'string' && SUPPRESSIBLE_RX.test(cardId);
  }

  getReport() {
    const list = [];
    for (const [deviceId, entry] of this._suppressed) {
      list.push({ deviceId, name: entry.name, remaining_minutes: Math.max(0, Math.round((entry.until - Date.now()) / 60000)) });
    }
    return { suppressed_count: list.length, suppressed: list };
  }

  destroy() {
    this._destroyed = true;
    for (const [, entry] of this._suppressed) { this._clearTimer(entry); }
    this._suppressed.clear();
  }
}

module.exports = SensorSuppressionManager;
