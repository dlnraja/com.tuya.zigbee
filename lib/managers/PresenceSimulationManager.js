'use strict';

/**
 * PresenceSimulationManager — v9.0.403 (P92.106)
 *
 * Inspired by Tuya Smart Life "random timing" schedules and Philips Hue Labs
 * "presence mimicking": toggles lights at random intervals within a daily
 * window so the home looks occupied (anti-burglar).
 *
 * Smarter than the references:
 * - Random interval AND random ON duration are re-drawn at every cycle
 *   (reference implementations use fixed jitter around one value).
 * - The original device state is restored when simulation stops.
 * - One manager per app (not per device): start/stop several devices, each
 *   with its own randomized sequence.
 * - Rule-28 safe timers, full cleanup on stop/destroy — no leaked timers.
 */

const DEFAULTS = {
  startHour: 18,          // window start (local hour)
  endHour: 23,            // window end (local hour)
  minIntervalMin: 10,     // min minutes between toggles
  maxIntervalMin: 45,     // max minutes between toggles
  minOnMin: 5,            // min minutes ON per activation
  maxOnMin: 25,           // max minutes ON per activation
};

class PresenceSimulationManager {

  constructor(homey, options = {}) {
    this.homey = homey;
    this._sessions = new Map(); // deviceId → { device, config, timer, originalState, active }
    this._destroyed = false;
    this._log = options.logger || (() => {});
    this._setDeviceState = options.setDeviceState || (async (device, onoff) => {
      if (device && typeof device.setCapabilityValue === 'function') {
        await device.setCapabilityValue('onoff', onoff).catch(() => {});
      }
    });
  }

  _rand(min, max) {
    return min + Math.random() * (max - min);
  }

  _scheduler() {
    return (this.homey && typeof this.homey.setTimeout === 'function') ? this.homey : globalThis;
  }

  _clearScheduler() {
    return (this.homey && typeof this.homey.clearTimeout === 'function') ? this.homey : globalThis;
  }

  _inWindow(config, date = new Date()) {
    const h = date.getHours();
    if (config.startHour <= config.endHour) {
      return h >= config.startHour && h < config.endHour;
    }
    // Overnight window (e.g. 22 → 6)
    return h >= config.startHour || h < config.endHour;
  }

  start(deviceId, device, options = {}) {
    if (!deviceId || this._destroyed) { return false; }
    this.stop(deviceId, { restore: false });
    const config = { ...DEFAULTS, ...options };
    const session = { device, config, timer: null, active: true, originalState: null };
    this._sessions.set(deviceId, session);
    this._log(`[PRESENCE-SIM] ▶️ started for ${device?.getName?.() || deviceId} (window ${config.startHour}h-${config.endHour}h)`);
    this._scheduleNext(deviceId, this._rand(1, 3) * 60 * 1000); // first event in 1-3 min
    return true;
  }

  async stop(deviceId, { restore = true } = {}) {
    const session = this._sessions.get(deviceId);
    if (!session) { return false; }
    session.active = false;
    if (session.timer) { this._clearScheduler().clearTimeout(session.timer); }
    this._sessions.delete(deviceId);
    if (restore && session.originalState !== null && session.originalState !== undefined) {
      await this._setDeviceState(session.device, session.originalState);
      this._log(`[PRESENCE-SIM] ⏹ stopped for ${session.device?.getName?.() || deviceId}, state restored to ${session.originalState}`);
    } else {
      this._log(`[PRESENCE-SIM] ⏹ stopped for ${session.device?.getName?.() || deviceId}`);
    }
    return true;
  }

  _scheduleNext(deviceId, delayMs) {
    const session = this._sessions.get(deviceId);
    if (!session || !session.active || this._destroyed) { return; }
    session.timer = this._scheduler().setTimeout(() => {
      this._runCycle(deviceId).catch((e) => this._log('[PRESENCE-SIM] cycle error:', e.message));
    }, delayMs);
  }

  async _runCycle(deviceId) {
    const session = this._sessions.get(deviceId);
    if (!session || !session.active) { return; }
    const { config, device } = session;

    if (this._inWindow(config)) {
      if (session.originalState === null || session.originalState === undefined) {
        try { session.originalState = device.getCapabilityValue?.('onoff') === true; } catch (_e) { session.originalState = false; }
      }
      const onMinutes = this._rand(config.minOnMin, config.maxOnMin);
      await this._setDeviceState(device, true);
      this._log(`[PRESENCE-SIM] 💡 ${device?.getName?.() || deviceId} ON for ${Math.round(onMinutes)} min`);
      session.timer = this._scheduler().setTimeout(() => {
        (async () => {
          if (!session.active) { return; }
          await this._setDeviceState(device, false);
          this._log(`[PRESENCE-SIM] 🌑 ${device?.getName?.() || deviceId} OFF`);
          this._scheduleNext(deviceId, this._rand(config.minIntervalMin, config.maxIntervalMin) * 60 * 1000);
        })().catch((e) => this._log('[PRESENCE-SIM] off error:', e.message));
      }, onMinutes * 60 * 1000);
    } else {
      // Outside the window: stay OFF, re-check every 15 min
      await this._setDeviceState(device, false);
      this._scheduleNext(deviceId, 15 * 60 * 1000);
    }
  }

  isActive(deviceId) {
    const session = this._sessions.get(deviceId);
    return !!session && session.active;
  }

  getReport() {
    const sessions = [];
    for (const [deviceId, session] of this._sessions) {
      sessions.push({ deviceId, name: session.device?.getName?.() || deviceId, window: `${session.config.startHour}h-${session.config.endHour}h` });
    }
    return { active_count: sessions.length, sessions };
  }

  async destroy() {
    this._destroyed = true;
    for (const deviceId of [...this._sessions.keys()]) {
      await this.stop(deviceId);
    }
  }
}

module.exports = PresenceSimulationManager;
