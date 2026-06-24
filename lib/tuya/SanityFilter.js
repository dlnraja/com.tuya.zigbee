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
       // v9.1.2: FIX - ROC exceeded, dampen the jump
       // Use 30% of the jump (not 10% which was too aggressive, or "halfway" as comment said)
       value = state.lastValue + (value - state.lastValue) * 0.3;
    }

    // 2. EMA Smoothing
    const alpha = this._getAlpha(capability);
    state.ema = (alpha * value) + (1 - alpha) * state.ema;

    // 3. Noise Floor Suppression (Radar/Distance specific)
    if (capability.includes('distance')) {
      if (state.ema < 0.05) {state.ema = 0;} // Suppress micro-vibrations
    }

    // 4. v9.0.89: Battery replacement detection (sudden jump > 20% = new battery)
    if (capability.includes('battery') && state.count > 5) {
      const jump = Math.abs(value - state.lastValue);
      if (jump > 20) {
        // Reset EMA to new value immediately (battery replaced)
        state.ema = value;
        state.lastValue = value;
        state.lastTime = now;
        state.count++;
        return Math.round(value);
      }
    }

    // 5. v9.0.89: Hysteresis for threshold edges (prevents flapping)
    // If value is near a common threshold (10%, 20%, 50%), apply wider deadband
    if (capability.includes('battery')) {
      const thresholds = [10, 20, 50];
      for (const t of thresholds) {
        const dist = Math.abs(state.ema - t);
        if (dist < 2 && Math.abs(value - t) < 2) {
          // Within ±2% of threshold — keep previous value to prevent flapping
          return Math.round(state.ema);
        }
      }
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
      case 'measure_battery': return 0.3;     // v9.0.89: Slow-smooth battery (prevents spikes)
      case 'measure_voltage': return 0.4;
      case 'measure_current': return 0.4;
      default: return 0.5;
    }
  }

  /**
   * Get max allowable rate of change per second
   * v9.0.89: Added battery, voltage, current, CO2, PM limits
   */
  _getROCLimit(capability) {
    switch(capability) {
      case 'measure_temperature': return 0.5; // max 0.5 deg / sec
      case 'measure_humidity': return 2.0;    // max 2% / sec
      case 'measure_power': return 500;       // max 500W / sec
      case 'measure_luminance': return 1000;  // max 1000 lux / sec
      case 'measure_battery': return 1.0;     // v9.0.89: max 1% / sec (batteries change slowly)
      case 'measure_voltage': return 10;      // max 10V / sec
      case 'measure_current': return 5;       // max 5A / sec
      case 'measure_co2': return 50;          // max 50 ppm / sec
      case 'measure_pm25': return 20;         // max 20 µg/m³ / sec
      case 'measure_pm10': return 30;         // max 30 µg/m³ / sec
      default: return 100;
    }
  }

  reset(deviceId) {
    const prefix = `${deviceId}:`;
    Object.keys(this._states).forEach(key => {
      if (key.startsWith(prefix)) {delete this._states[key];}
    });
  }

  /**
   * v9.1.2: Cleanup stale entries to prevent memory leak.
   * Call periodically (e.g. every 30 minutes) from the app.
   * Removes entries not updated in the last 24 hours.
   */
  cleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let removed = 0;
    for (const key of Object.keys(this._states)) {
      if (now - this._states[key].lastTime > maxAgeMs) {
        delete this._states[key];
        removed++;
      }
    }
    return removed;
  }
}

module.exports = SanityFilter;
