'use strict';

/**
 * SanityFilter - v9.0.0 (L14 Hardening Layer)
 * 
 * Provides sophisticated signal processing for Tuya sensors:
 * 1. EMA (Exponential Moving Average) for smoothing.
 * 2. ROC (Rate of Change) detection to block outliers/ghosts.
 * 3. Hysteresis to prevent "flapping" on threshold edges.
 * 4. Noise Floor suppression for radar/mmWave distance data.
 */
class SanityFilter {
  constructor() {
    this._states = {}; // per-device, per-capability states
  }

  /**
   * Filter a value for a specific device capability
   * @param {string} deviceId 
   * @param {string} capability 
   * @param {number} value 
   * @returns {number} The filtered value
   */
  filter(deviceId, capability, value) {
    if (typeof value !== 'number') {return value;}

    const key = `${deviceId}:${capability}`;
    if (!this._states[key]) {
      this._states[key] = {
        ema: value,
        lastValue: value,
        lastTime: Date.now(),
        count: 0
      };
      return value;
    }

    const state = this._states[key];
    const now = Date.now();
    const dt = (now - state.lastTime) / 1000; // in seconds

    // 1. ROC (Rate of Change) Protection
    // Block impossible jumps (e.g. temperature jumping 10 degrees in 1 second)
    const roc = Math.abs(value - state.lastValue) / (dt || 1);
    const rocLimit = this._getROCLimit(capability);

    if (state.count > 5 && dt < 60 && roc > rocLimit) {
       // ROC exceeded - likely an outlier or noise artifact
       // We "dampen" the jump by only moving halfway towards the new value
       value = state.lastValue + (value - state.lastValue) * 0.1;
    }

    // 2. EMA Smoothing
    const alpha = this._getAlpha(capability);
    state.ema = (alpha * value) + (1 - alpha) * state.ema;

    // 3. Noise Floor Suppression (Radar/Distance specific)
    if (capability.includes('distance')) {
      if (state.ema < 0.05) {state.ema = 0;} // Suppress micro-vibrations
    }

    state.lastValue = value;
    state.lastTime = now;
    state.count++;

    // For capabilities like battery, we round to nearest int
    if (capability.includes('battery')) {return Math.round(state.ema);}
    
    // For temp/hum, we round to 1-2 decimal places
    if (capability.includes('temperature')) {return Math.round(state.ema * 10) / 10;}
    if (capability.includes('humidity')) {return Math.round(state.ema);}

    return state.ema;
  }

  /**
   * Get smoothing factor alpha (0 to 1)
   * Lower = smoother, higher = more responsive
   */
  _getAlpha(capability) {
    switch(capability) {
      case 'measure_temperature': return 0.2;
      case 'measure_humidity': return 0.3;
      case 'measure_power': return 0.5;
      case 'measure_luminance': return 0.4;
      case 'measure_luminance.distance': return 0.6;
      default: return 0.5;
    }
  }

  /**
   * Get max allowable rate of change per second
   */
  _getROCLimit(capability) {
    switch(capability) {
      case 'measure_temperature': return 0.5; // max 0.5 deg / sec
      case 'measure_humidity': return 2.0;    // max 2% / sec
      case 'measure_power': return 500;       // max 500W / sec
      case 'measure_luminance': return 1000;  // max 1000 lux / sec
      default: return 100;
    }
  }

  reset(deviceId) {
    const prefix = `${deviceId}:`;
    Object.keys(this._states).forEach(key => {
      if (key.startsWith(prefix)) {delete this._states[key];}
    });
  }
}

module.exports = SanityFilter;
