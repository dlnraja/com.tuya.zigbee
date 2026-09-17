'use strict';

/**
 * AbsenceEnergySoft (P2565) — unbranded absence→eco (Aqara presence energy-save feel).
 * When zone clears, soft-dim or off enrolled loads. MASTER_ONLY. UI: Absence Energy Soft.
 */

class AbsenceEnergySoft {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._zones = new Map();
    this._cooldownMs = Math.max(20000, Number(opts.cooldownMs) || 60000);
    this._lastFire = new Map();
  }

  enroll(zoneId, devices = [], opts = {}) {
    const id = String(zoneId || 'home').slice(0, 64);
    this._zones.set(id, {
      devices: (devices || []).filter(Boolean).slice(0, 12),
      mode: opts.mode === 'off' ? 'off' : 'dim',
      dimTo: Math.max(0.05, Math.min(0.5, Number(opts.dimTo) || 0.15)),
    });
    return { zoneId: id, devices: this._zones.get(id).devices.length };
  }

  async onClear(zoneId) {
    const id = String(zoneId || 'home');
    const z = this._zones.get(id);
    if (!z || !z.devices.length) return { fired: false, reason: 'not_enrolled' };
    const now = Date.now();
    if ((this._lastFire.get(id) || 0) + this._cooldownMs > now) {
      return { fired: false, reason: 'cooldown' };
    }
    this._lastFire.set(id, now);

    for (const dev of z.devices) {
      try {
        if (z.mode === 'off') {
          if (typeof this.app._hueSetLight === 'function') {
            await this.app._hueSetLight(dev, { onoff: false });
          } else if (dev.hasCapability?.('onoff')) {
            await (dev.safeSetCapabilityValue || dev.setCapabilityValue)?.('onoff', false);
          }
        } else if (dev.hasCapability?.('dim')) {
          if (typeof this.app._hueSetLight === 'function') {
            await this.app._hueSetLight(dev, { dim: z.dimTo });
          } else {
            await (dev.safeSetCapabilityValue || dev.setCapabilityValue)?.('dim', z.dimTo);
          }
        }
      } catch (_e) { /* soft */ }
    }
    return { fired: true, devices: z.devices.length, mode: z.mode };
  }

  snapshot() {
    const zones = {};
    for (const [id, z] of this._zones) {
      zones[id] = { devices: z.devices.length, mode: z.mode };
    }
    return { zones };
  }
}

module.exports = AbsenceEnergySoft;
