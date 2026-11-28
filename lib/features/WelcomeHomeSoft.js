'use strict';

/**
 * WelcomeHomeSoft (P2565) - unbranded arrival lighting (SmartThings/Aqara welcome feel).
 * When Lamp Mesh zone becomes occupied (or forced), soft-on enrolled welcome lights.
 * MASTER_ONLY. UI: Welcome Home Soft.
 */

const SoftDaylightFade = require('./SoftDaylightFade');
const QuietHoursGuard = require('./QuietHoursGuard');

class WelcomeHomeSoft {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._zones = new Map(); // zoneId -> { lights, dim, quietDim, quietStart, quietEnd, fadeMinutes, armed }
    this._cooldownMs = Math.max(30000, Number(opts.cooldownMs) || 120000);
    this._lastFire = new Map();
  }

  enroll(zoneId, lights = [], opts = {}) {
    const id = String(zoneId || 'home').slice(0, 64);
    this._zones.set(id, {
      lights: (lights || []).filter(Boolean).slice(0, 8),
      dim: opts.dim != null ? Number(opts.dim) : null,
      quietDim: opts.quietDim != null ? Math.max(0.05, Math.min(1, Number(opts.quietDim))) : 0.15,
      quietStart: opts.quietStart || null,
      quietEnd: opts.quietEnd || null,
      fadeMinutes: Math.max(0.5, Math.min(10, Number(opts.fadeMinutes) || 2)),
      armed: opts.armed !== false,
    });
    return { zoneId: id, lights: this._zones.get(id).lights.length };
  }

  unenroll(zoneId) {
    const id = String(zoneId || '');
    this._lastFire.delete(id);
    return this._zones.delete(id);
  }

  destroy() {
    this._zones.clear();
    this._lastFire.clear();
  }

  setArmed(zoneId, armed) {
    const z = this._zones.get(String(zoneId || ''));
    if (!z) {return false;}
    z.armed = !!armed;
    return true;
  }

  _resolveQuietTarget(z, date) {
    const inQuiet = !!(z.quietStart && z.quietEnd && QuietHoursGuard.isInQuietHours(z.quietStart, z.quietEnd, date));
    if (inQuiet) {
      return { inQuiet: true, targetDim: z.dim != null ? Math.min(z.dim, z.quietDim) : z.quietDim };
    }
    return { inQuiet: false, targetDim: z.dim != null ? z.dim : undefined };
  }

  /**
   * Call on lamp_mesh occupancy occupied=true (or manual).
   * P3406: respects optional quietStart/quietEnd window (caps brightness to quietDim)
   * and skips destroyed light instances.
   */
  async onOccupied(zoneId, opts = {}) {
    const id = String(zoneId || 'home');
    const z = this._zones.get(id);
    if (!z || !z.armed || !z.lights.length) {return { fired: false, reason: 'not_enrolled' };}
    const now = Date.now();
    if ((this._lastFire.get(id) || 0) + this._cooldownMs > now) {
      return { fired: false, reason: 'cooldown' };
    }
    const activeLights = z.lights.filter((l) => l && !l._destroyed);
    if (!activeLights.length) {return { fired: false, reason: 'no_active_lights' };}
    this._lastFire.set(id, now);

    const date = opts.date instanceof Date ? opts.date : new Date(now);
    const { inQuiet, targetDim } = this._resolveQuietTarget(z, date);
    const steps = Math.max(4, Math.round(z.fadeMinutes * 4));

    for (const light of activeLights) {
      try {
        SoftDaylightFade.startOnDevice(this.app, light, {
          minutes: z.fadeMinutes,
          steps,
          forceOn: true,
          toDim: targetDim,
        });
      } catch (_e) { /* soft */ }
    }
    return { fired: true, lights: activeLights.length, quiet: inQuiet };
  }

  snapshot() {
    const zones = {};
    for (const [id, z] of this._zones) {
      zones[id] = { lights: z.lights.length, armed: z.armed };
    }
    return { zones, cooldownMs: this._cooldownMs };
  }
}

module.exports = WelcomeHomeSoft;
