'use strict';

/**
 * ContactEntrySoft (P2566) — unbranded door/contact → lights (ST/Lutron entry routine).
 * Rising edge on alarm_contact / onoff → soft-on targets (optional Quiet Hours skip).
 * MASTER_ONLY. UI: Contact Entry Soft.
 */

const EventEmitter = require('events');
const QuietHoursGuard = require('./QuietHoursGuard');
const SoftDaylightFade = require('./SoftDaylightFade');

class ContactEntrySoft extends EventEmitter {
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.homey = app?.homey;
    this._links = new Map();
    this._pollMs = Math.max(800, Math.min(8000, Number(opts.pollMs) || 1200));
    this._interval = null;
    this._destroyed = false;
  }

  start() {
    if (this._interval || !this.homey) return;
    this._interval = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._tick().catch(() => {});
    }, this._pollMs);
  }

  stop() {
    if (this._interval) {
      try { this.homey?.clearInterval?.(this._interval); } catch (_e) { /* */ }
      this._interval = null;
    }
  }

  destroy() {
    this._destroyed = true;
    this.stop();
    this._links.clear();
  }

  /**
   * @param {object} contact device with alarm_contact or onoff
   * @param {object[]} lights
   * @param {object} [opts] quietStart, quietEnd, fadeMinutes, dim
   */
  enroll(contact, lights = [], opts = {}) {
    if (!contact) return null;
    const targets = (lights || []).filter(Boolean).slice(0, 6);
    if (!targets.length) return null;
    const id = String(contact.getData?.()?.id || contact.getName?.() || 'c').slice(0, 64);
    this._links.set(id, {
      contact,
      lights: targets,
      last: this._readOpen(contact),
      quietStart: opts.quietStart || null,
      quietEnd: opts.quietEnd || null,
      fadeMinutes: Math.max(0.5, Math.min(8, Number(opts.fadeMinutes) || 1.5)),
      dim: opts.dim != null ? Number(opts.dim) : null,
      cooldownMs: Math.max(5000, Number(opts.cooldownMs) || 20000),
      lastFire: 0,
    });
    this.start();
    return { id, lights: targets.length };
  }

  _readOpen(dev) {
    try {
      if (dev.hasCapability?.('alarm_contact')) return !!dev.getCapabilityValue('alarm_contact');
      if (dev.hasCapability?.('alarm_generic')) return !!dev.getCapabilityValue('alarm_generic');
      if (dev.hasCapability?.('onoff')) return !!dev.getCapabilityValue('onoff');
    } catch (_e) { /* */ }
    return null;
  }

  async _tick() {
    for (const [id, link] of this._links) {
      const open = this._readOpen(link.contact);
      if (open === null) continue;
      const rising = open === true && link.last === false;
      link.last = open;
      if (!rising) continue;
      if (link.quietStart && link.quietEnd
        && QuietHoursGuard.isInQuietHours(link.quietStart, link.quietEnd)) {
        continue;
      }
      const now = Date.now();
      if (now - link.lastFire < link.cooldownMs) continue;
      link.lastFire = now;
      for (const light of link.lights) {
        try {
          SoftDaylightFade.startOnDevice(this.app, light, {
            minutes: link.fadeMinutes,
            steps: 6,
            forceOn: true,
            toDim: link.dim != null ? link.dim : undefined,
          });
        } catch (_e) { /* soft */ }
      }
      this.emit('entry', { id, lights: link.lights.length });
    }
  }

  snapshot() {
    return { links: this._links.size, pollMs: this._pollMs };
  }
}

module.exports = ContactEntrySoft;
