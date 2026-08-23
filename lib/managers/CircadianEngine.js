'use strict';

/**
 * CircadianEngine — Solar Sync for enrolled lights (P92.110 / L99 smart features)
 *
 * Driven by DaylightAtmosphere + SolarElevation (real sun), not a clock guess.
 * Fade steps keep Zigbee calm. Commercial product names never appear in UI.
 */

const { EventEmitter } = require('events');
const DaylightAtmosphere = require('../features/DaylightAtmosphere');

const EVAL_INTERVAL_MS = 5 * 60 * 1000;
const MAX_STEP_KELVIN = 400;
const MAX_STEP_BRIGHT = 0.10;

class CircadianEngine extends EventEmitter {

  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this._solar = options.solarElevation || null;
    this._devices = new Map(); // deviceId → { device, currentKelvin, currentBright }
    this._timer = null;
    this._destroyed = false;
    this._log = options.logger || (() => {});
    this._colorConverter = null;
  }

  setSolarElevation(instance) { this._solar = instance; }

  enable(deviceId, device) {
    if (!deviceId || this._destroyed) { return false; }
    this._devices.set(deviceId, { device, currentKelvin: null, currentBright: null });
    this._log(`[CIRCADIAN] ▶️ enabled for ${device?.getName?.() || deviceId}`);
    this.start();
    return true;
  }

  disable(deviceId) {
    const had = this._devices.delete(deviceId);
    if (had) { this._log(`[CIRCADIAN] ⏹ disabled for ${deviceId}`); }
    if (this._devices.size === 0) { this.stop(); }
    return had;
  }

  isEnabled(deviceId) { return this._devices.has(deviceId); }

  /** Compute { kelvin, bright, elevation } — SSOT DaylightAtmosphere. */
  computeTargets(date = new Date()) {
    const curve = DaylightAtmosphere.compute({
      date,
      solar: this._solar,
    });
    return {
      kelvin: curve.kelvin,
      bright: curve.bright,
      elevation: curve.elevation != null ? curve.elevation : 0,
      temperature: curve.temperature,
      source: curve.source,
    };
  }

  _fade(current, target, maxStep) {
    if (current === null || current === undefined) { return target; }
    const diff = target - current;
    if (Math.abs(diff) <= maxStep) { return target; }
    return current + Math.sign(diff) * maxStep;
  }

  async _applyToDevice(device, kelvin, bright) {
    // Only adapt lights that are ON
    if (device.hasCapability?.('onoff') && device.getCapabilityValue?.('onoff') !== true) { return; }

    if (device.hasCapability?.('light_color_temp')) {
      const homeyVal = Math.max(0, Math.min(1, (6500 - kelvin) / 4500)); // 0 cold → 1 warm
      if (typeof device.setCapabilityValue === 'function') {
        await device.setCapabilityValue('light_color_temp', homeyVal).catch(() => {});
      }
    } else if (device.hasCapability?.('light_hue') && device.hasCapability?.('light_saturation')) {
      if (!this._colorConverter) { this._colorConverter = require('../helpers/ColorConverter'); }
      const mireds = Math.round(1000000 / kelvin);
      const rgb = this._colorConverter.miredToRgb(mireds);
      const hsv = this._colorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);
      if (typeof device.setCapabilityValue === 'function') {
        await device.setCapabilityValue('light_hue', hsv.h).catch(() => {});
        await device.setCapabilityValue('light_saturation', hsv.s).catch(() => {});
      }
    }

    if (device.hasCapability?.('dim') && typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue('dim', bright).catch(() => {});
    }
  }

  async applyNow() {
    const targets = this.computeTargets();
    if (!targets) { return { applied: 0, reason: 'no_solar_provider' }; }
    let applied = 0;
    for (const [, entry] of this._devices) {
      if (this._destroyed) { break; }
      const k = this._fade(entry.currentKelvin, targets.kelvin, MAX_STEP_KELVIN);
      const b = this._fade(entry.currentBright, targets.bright, MAX_STEP_BRIGHT);
      try {
        await this._applyToDevice(entry.device, k, b);
        entry.currentKelvin = k;
        entry.currentBright = b;
        applied++;
      } catch (e) {
        this._log('[CIRCADIAN] apply error:', e.message);
      }
    }
    return { applied, kelvin: targets.kelvin, bright: Math.round(targets.bright * 100), elevation: Math.round(targets.elevation * 10) / 10 };
  }

  start() {
    if (this._destroyed || this._timer) { return; }
    const scheduler = this.homey && typeof this.homey.setInterval === 'function' ? this.homey : globalThis;
    this._timer = scheduler.setInterval(() => {
      if (this._destroyed) { return; }
      this.applyNow().catch((e) => this._log('[CIRCADIAN] cycle error:', e.message));
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
      enabled_count: this._devices.size,
      devices: [...this._devices.entries()].map(([id, e]) => ({
        id,
        name: e.device?.getName?.() || id,
        kelvin: e.currentKelvin,
        bright: e.currentBright,
      })),
    };
  }

  destroy() {
    this._destroyed = true;
    this.stop();
    this.removeAllListeners();
    this._devices.clear();
  }
}

module.exports = CircadianEngine;
