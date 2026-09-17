'use strict';

/**
 * WelcomeHomeSoft (P2565) — unbranded arrival lighting (SmartThings/Aqara welcome feel).
 * When Lamp Mesh zone becomes occupied (or forced), soft-on enrolled welcome lights.
 * MASTER_ONLY. UI: Welcome Home Soft.
 */

const SoftDaylightFade = require('./SoftDaylightFade');

class WelcomeHomeSoft {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._zones = new Map(); // zoneId → { lights, dim, fadeMinutes, armed }
    this._cooldownMs = Math.max(30000, Number(opts.cooldownMs) || 120000);
    this._lastFire = new Map();
  }

  enroll(zoneId, lights = [], opts = {}) {
    const id = String(zoneId || 'home').slice(0, 64);
    this._zones.set(id, {
      lights: (lights || []).filter(Boolean).slice(0, 8),
      dim: opts.dim != null ? Number(opts.dim) : null,
      fadeMinutes: Math.max(0.5, Math.min(10, Number(opts.fadeMinutes) || 2)),
      armed: opts.armed !== false,
    });
    return { zoneId: id, lights: this._zones.get(id).lights.length };
  }

  setArmed(zoneId, armed) {
    const z = this._zones.get(String(zoneId || ''));
    if (!z) return false;
    z.armed = !!armed;
    return true;
  }

  /**
   * Call on lamp_mesh occupancy occupied=true (or manual).
   */
  async onOccupied(zoneId) {
    const id = String(zoneId || 'home');
    const z = this._zones.get(id);
    if (!z || !z.armed || !z.lights.length) return { fired: false, reason: 'not_enrolled' };
    const now = Date.now();
    if ((this._lastFire.get(id) || 0) + this._cooldownMs > now) {
      return { fired: false, reason: 'cooldown' };
    }
    this._lastFire.set(id, now);

    for (const light of z.lights) {
      try {
        SoftDaylightFade.startOnDevice(this.app, light, {
          minutes: z.fadeMinutes,
          steps: Math.max(4, Math.round(z.fadeMinutes * 4)),
          forceOn: true,
          toDim: z.dim != null ? z.dim : undefined,
        });
      } catch (_e) { /* soft */ }
    }
    return { fired: true, lights: z.lights.length };
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
