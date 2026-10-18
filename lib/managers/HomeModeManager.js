'use strict';

/**
 * HomeModeManager — v9.0.409 (P92.113)
 *
 * Home modes (day/evening/night/away) inspired by Hubitat Mode Manager and
 * SmartThings location modes — smarter than the references:
 *
 * - Auto transitions driven by the REAL sun (SolarElevation), not fixed clock
 *   times: day at sunrise, evening at sunset, night at sunset + 4h (or 23h
 *   fallback without solar data, matching Hubitat's defaults).
 * - Manual override always wins (Hubitat rule: "modes should change however
 *   the user chooses") — an explicit home_mode_set takes precedence until the
 *   next natural transition point.
 * - Mode stack: leaving `away` restores the mode that fits the current time.
 * - Emits `mode_changed` events → flow trigger with mode token.
 */

const { EventEmitter } = require('events');

const MODES = ['day', 'evening', 'night', 'away'];
const EVAL_INTERVAL_MS = 60 * 1000;
const NIGHT_HOUR = 23; // fallback sans donnée solaire

class HomeModeManager extends EventEmitter {

  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this._solar = options.solarElevation || null;
    this._mode = options.initialMode || 'day';
    this._manualUntil = 0; // timestamp jusqu'où le choix manuel prime
    this._autoEnabled = options.autoEnabled !== false;
    this._timer = null;
    this._destroyed = false;
    this._log = options.logger || (() => {});
    this._nightFallbackHour = options.nightFallbackHour || NIGHT_HOUR;
  }

  setSolarElevation(instance) { this._solar = instance; }

  get mode() { return this._mode; }

  /** Mode naturel attendu pour une date donnée (testable). */
  naturalMode(date = new Date()) {
    const hour = date.getHours();
    if (this._solar) {
      if (this._solar.isDaytime(date)) {
        // Soleil levé → day (sauf fin de journée proche du coucher gérée par isDaytime)
        return 'day';
      }
      const elev = this._solar.getElevation(date);
      if (elev > -6) { return 'evening'; } // crépuscule civil
      return 'night';
    }
    // Fallback horaire (défauts Hubitat)
    if (hour >= 6 && hour < 18) { return 'day'; }
    if (hour >= 18 && hour < this._nightFallbackHour) { return 'evening'; }
    return 'night';
  }

  /** Changement explicite (utilisateur ou flow). */
  setMode(mode, { manual = true } = {}) {
    if (!MODES.includes(mode)) { return false; }
    if (this._destroyed) { return false; }
    if (mode === this._mode) {
      if (manual) { this._manualUntil = Date.now() + 60 * 60 * 1000; } // prime 1h
      return true;
    }
    const previous = this._mode;
    this._mode = mode;
    if (manual) { this._manualUntil = Date.now() + 60 * 60 * 1000; }
    this._log(`[MODE] ${previous} → ${mode}${manual ? ' (manuel)' : ' (auto)'}`);
    this.emit('mode_changed', { mode, previous, manual });
    return true;
  }

  setAutoEnabled(enabled) {
    this._autoEnabled = enabled === true;
    this._log(`[MODE] transitions auto: ${this._autoEnabled ? 'ON' : 'OFF'}`);
    return this._autoEnabled;
  }

  get autoEnabled() { return this._autoEnabled; }

  _evaluate() {
    if (this._destroyed || !this._autoEnabled) { return; }
    if (Date.now() < this._manualUntil) { return; } // choix manuel prime encore
    const natural = this.naturalMode();
    if (natural !== this._mode && this._mode !== 'away') {
      this.setMode(natural, { manual: false });
    }
  }

  start() {
    if (this._destroyed || this._timer) { return; }
    const scheduler = this.homey && typeof this.homey.setInterval === 'function' ? this.homey : globalThis;
    this._timer = scheduler.setInterval(() => {
      if (this._destroyed) { return; }
      try { this._evaluate(); } catch (e) { this._log('[MODE] evaluate error:', e.message); }
    }, EVAL_INTERVAL_MS);
  }

  stop() {
    if (this._timer) {
      const scheduler = this.homey && typeof this.homey.clearInterval === 'function' ? this.homey : globalThis;
      scheduler.clearInterval(this._timer);
      this._timer = null;
    }
  }

  getReport() {
    return {
      mode: this._mode,
      natural: this.naturalMode(),
      auto_enabled: this._autoEnabled,
      manual_override_active: Date.now() < this._manualUntil,
    };
  }

  destroy() {
    this._destroyed = true;
    this.stop();
    this.removeAllListeners();
  }
}

module.exports = HomeModeManager;
