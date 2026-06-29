'use strict';

/**
 * SolarElevation - NOAA Solar Position Calculator
 * FEATURE #80
 *
 * Calculates solar elevation angle for a given geographic location
 * and timestamp using the NOAA Solar Calculator algorithm:
 *   https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 *
 * Use cases:
 *   - Sunset/sunrise based automations (no cloud dependency)
 *   - Circadian lighting transitions
 *   - Night-mode activation thresholds
 *   - Seasonal thermostat setpoint adjustments
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const DAY_MS = 86400000;

class SolarElevation extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} options.latitude   - Decimal degrees,  -90..90
   * @param {number} options.longitude  - Decimal degrees, -180..180
   * @param {number} [options.elevation=0] - Meters above sea level
   * @param {Function} [options.logger]    - Injected logger
   */
  constructor(options = {}) {
    super();
    this.homey = options.homey || null;
    this.latitude = options.latitude ?? 51.5;
    this.longitude = options.longitude ?? -0.1;
    this.elevation = options.elevation ?? 0;
    this._logger = typeof options.logger === 'function' ? options.logger : () => {};
    this._destroyed = false;

    // Optional: sunrise/sunset callback timers
    this._sunsetTimer = null;
    this._sunriseTimer = null;
    this._observerInterval = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Core solar calculations (NOAA simplified equations)                */
  /* ------------------------------------------------------------------ */

  /**
   * Calculate solar elevation angle for a Date/timestamp.
   * @param {Date|number} [date]  - Defaults to now
   * @returns {number} Elevation in degrees (negative = below horizon)
   */
  getElevation(date) {
    const jd = this._toJulianDay(date);
    const eqTime = this._equationOfTime(jd);
    const decl = this._solarDeclination(jd);
    const hourAngle = this._hourAngle(jd, eqTime);
    const cosZenith = Math.sin(this.latitude * DEG2RAD) * Math.sin(decl * DEG2RAD)
      + Math.cos(this.latitude * DEG2RAD) * Math.cos(decl * DEG2RAD) * Math.cos(hourAngle * DEG2RAD);
    return Math.asin(cosZenith) * RAD2DEG;
  }

  /**
   * Calculate solar azimuth angle for a Date/timestamp.
   * @param {Date|number} [date]
   * @returns {number} Azimuth in degrees (0 = North, 90 = East, 180 = South)
   */
  getAzimuth(date) {
    const jd = this._toJulianDay(date);
    const eqTime = this._equationOfTime(jd);
    const decl = this._solarDeclination(jd);
    const hourAngle = this._hourAngle(jd, eqTime);
    const elev = this.getElevation(date);
    const cosAz = (Math.sin(decl * DEG2RAD) - Math.sin(this.latitude * DEG2RAD) * Math.sin(elev * DEG2RAD))
      / (Math.cos(this.latitude * DEG2RAD) * Math.cos(elev * DEG2RAD));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD2DEG;
    if (hourAngle > 0) azimuth = 360 - azimuth;
    return azimuth;
  }

  /**
   * Determine if the sun is above the horizon.
   * @param {Date|number} [date]
   * @param {number} [horizonDegrees=0] - Custom horizon offset (negative = civil twilight)
   * @returns {boolean}
   */
  isDaytime(date, horizonDegrees = 0) {
    return this.getElevation(date) > horizonDegrees;
  }

  /**
   * Find the next sunrise time from a given date.
   * Uses binary search for efficiency.
   * @param {Date|number} [date]
   * @returns {Date}
   */
  getNextSunrise(date) {
    const now = date instanceof Date ? date.getTime() : Date.now();
    // Find sunrise within next 48 hours
    return this._findHorizonCrossing(now, now + 48 * 3600 * 1000, true);
  }

  /**
   * Find the next sunset time from a given date.
   * @param {Date|number} [date]
   * @returns {Date}
   */
  getNextSunset(date) {
    const now = date instanceof Date ? date.getTime() : Date.now();
    return this._findHorizonCrossing(now, now + 48 * 3600 * 1000, false);
  }

  /**
   * Get a summary of today's solar data.
   * @param {Date|number} [date]
   * @returns {Object}
   */
  getDailySummary(date) {
    const target = date instanceof Date ? date : new Date(date || Date.now());
    const midnight = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0).getTime();
    const noon = midnight + 12 * 3600000;

    // Find elevation peak (near solar noon)
    let peakElevation = -90;
    let peakTime = noon;
    for (let t = midnight; t < midnight + DAY_MS; t += 300000) {
      const elev = this.getElevation(t);
      if (elev > peakElevation) {
        peakElevation = elev;
        peakTime = t;
      }
    }

    return {
      sunrise: this.getNextSunrise(midnight - 3600000),
      sunset: this.getNextSunset(midnight + 6 * 3600000),
      solarNoon: new Date(peakTime),
      peakElevation: Math.round(peakElevation * 100) / 100,
      currentElevation: Math.round(this.getElevation() * 100) / 100,
      currentAzimuth: Math.round(this.getAzimuth() * 100) / 100,
      isDaytime: this.isDaytime(),
      isCivilTwilight: this.getElevation() > -6,
      latitude: this.latitude,
      longitude: this.longitude
    };
  }

  /**
   * Get elevation category for flow card matching.
   * @param {Date|number} [date]
   * @returns {string} One of: 'night', 'astronomical_twilight', 'nautical_twilight',
   *   'civil_twilight', 'day', 'golden_hour', 'solar_noon'
   */
  getElevationCategory(date) {
    const elev = this.getElevation(date);
    const hour = new Date(date || Date.now()).getHours();

    if (elev < -18) return 'night';
    if (elev < -12) return 'astronomical_twilight';
    if (elev < -6) return 'nautical_twilight';
    if (elev < 0) return 'civil_twilight';
    if (elev < 10) return 'golden_hour'; // Rough golden hour
    if (elev > 80) return 'solar_noon';
    return 'day';
  }

  /* ------------------------------------------------------------------ */
  /*  Observer: periodic checks for sunrise/sunset events                */
  /* ------------------------------------------------------------------ */

  /**
   * Start periodic observation (checks every minute).
   * @param {Object} [options]
   * @param {number} [options.checkIntervalMs=60000]
   */
  startObserving(options = {}) {
    if (this._observerInterval) return;

    const intervalMs = options.checkIntervalMs || 60000;
    let wasDaytime = this.isDaytime();

    this._observerInterval = this._setInterval(() => {
      if (this._destroyed) { this.stopObserving(); return; }

      const isNowDaytime = this.isDaytime();
      if (wasDaytime && !isNowDaytime) {
        this.emit('sunset', { timestamp: new Date(), elevation: this.getElevation() });
      } else if (!wasDaytime && isNowDaytime) {
        this.emit('sunrise', { timestamp: new Date(), elevation: this.getElevation() });
      }
      wasDaytime = isNowDaytime;
    }, intervalMs);

    this._logger('[SolarElevation] Observing started');
  }

  /**
   * Stop periodic observation.
   */
  stopObserving() {
    if (this._observerInterval) {
      this._clearInterval(this._observerInterval);
      this._observerInterval = null;
    }
  }

  _setInterval(fn, ms) {
    if (typeof this.homey?.setInterval === 'function') {
      return this.homey.setInterval(fn, ms);
    }
    return globalThis.setInterval(fn, ms);
  }

  _clearInterval(timer) {
    if (typeof this.homey?.clearInterval === 'function') {
      return this.homey.clearInterval(timer);
    }
    return globalThis.clearInterval(timer);
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helper methods                                            */
  /* ------------------------------------------------------------------ */

  _toJulianDay(date) {
    const ms = date instanceof Date ? date.getTime() : (date || Date.now());
    return ms / DAY_MS + 2440587.5;
  }

  _equationOfTime(jd) {
    const n = jd - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * DEG2RAD;
    const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG2RAD;
    const e = (23.439 - 0.0000004 * n) * DEG2RAD;
    const ra = Math.atan2(Math.cos(e) * Math.sin(lambda), Math.cos(lambda)) * RAD2DEG;
    let eot = (L - ra) / 15;
    if (eot > 12) eot -= 24;
    if (eot < -12) eot += 24;
    return eot; // minutes
  }

  _solarDeclination(jd) {
    const n = jd - 2451545.0;
    const e = (23.439 - 0.0000004 * n) * DEG2RAD;
    const L = ((280.46 + 0.9856474 * n) % 360) * DEG2RAD;
    return Math.asin(Math.sin(e) * Math.sin(L)) * RAD2DEG;
  }

  _hourAngle(jd, eqTime) {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    let ha = (utcHours + eqTime / 60) / 24 * 360 - 180 + this.longitude;
    if (ha > 180) ha -= 360;
    if (ha < -180) ha += 360;
    return ha;
  }

  _findHorizonCrossing(startMs, endMs, rising) {
    // Binary search for sunrise (elevation crosses 0 from negative to positive)
    // or sunset (elevation crosses 0 from positive to negative)
    const eps = 60000; // 1 minute precision
    let lo = startMs;
    let hi = endMs;
    const elevLo = this.getElevation(lo);
    const elevHi = this.getElevation(hi);

    if (rising && elevHi < 0) return new Date(endMs);
    if (!rising && elevHi > 0) return new Date(endMs);

    for (let i = 0; i < 50 && (hi - lo) > eps; i++) {
      const mid = Math.round((lo + hi) / 2);
      const elevMid = this.getElevation(mid);
      if (rising) {
        if (elevMid >= 0) hi = mid;
        else lo = mid;
      } else {
        if (elevMid >= 0) lo = mid;
        else hi = mid;
      }
    }
    return new Date(Math.round((lo + hi) / 2));
  }

  /**
   * Update location.
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} [elevation]
   */
  setLocation(latitude, longitude, elevation) {
    this.latitude = latitude;
    this.longitude = longitude;
    if (elevation !== undefined) this.elevation = elevation;
  }

  /**
   * Cleanup all timers and state.
   */
  destroy() {
    this._destroyed = true;
    this.stopObserving();
    if (this._sunsetTimer) { clearTimeout(this._sunsetTimer); this._sunsetTimer = null; }
    if (this._sunriseTimer) { clearTimeout(this._sunriseTimer); this._sunriseTimer = null; }
    this.removeAllListeners();
  }
}

module.exports = SolarElevation;
