'use strict';

/**
 * MotionCascadeManager — v9.0.408 (P92.110)
 *
 * Path lighting ("le truc qui allume la lumière en fonction d'où tu avances
 * dans les pièces") + autonomous auto-off, inspired by Hue motion-activated
 * rooms and Xiaomi/Aqara gateway night lights — with a central hook instead
 * of per-driver wiring:
 *
 * - link(motionDevice → lightDevice [, alsoLightDevice], offMinutes):
 *   when the motion device reports motion (any motion/presence flow card,
 *   via the SAME central choke point as sensor suppression), linked lights
 *   turn ON (and optionally a second light, e.g. the NEXT room on your path).
 * - Every new motion event resets the auto-off timer; lights turn OFF
 *   autonomously after offMinutes without motion.
 * - Optional dim level for activation (night path lighting).
 * - Rule-28 safe timers, full cleanup, motion retrigger-proof.
 */

const { EventEmitter } = require('events');

class MotionCascadeManager extends EventEmitter {

  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this._links = new Map(); // motionDeviceId → { light, alsoLight, offMinutes, dim, offTimer }
    this._destroyed = false;
    this._log = options.logger || (() => {});
  }

  _scheduler() { return (this.homey && typeof this.homey.setTimeout === 'function') ? this.homey : globalThis; }
  _clearScheduler() { return (this.homey && typeof this.homey.clearTimeout === 'function') ? this.homey : globalThis; }

  link(motionDeviceId, lightDevice, options = {}) {
    if (!motionDeviceId || !lightDevice || this._destroyed) { return false; }
    this.unlink(motionDeviceId, { silent: true });
    this._links.set(motionDeviceId, {
      light: lightDevice,
      alsoLight: options.alsoLight || null,
      offMinutes: Math.max(1, Math.min(120, options.offMinutes || 2)),
      dim: options.dim !== undefined ? Math.max(0.01, Math.min(1, options.dim)) : null,
    });
    this._log(`[CASCADE] 🔗 ${motionDeviceId} → ${lightDevice?.getName?.()} (+${this._links.get(motionDeviceId).offMinutes} min auto-off)`);
    return true;
  }

  unlink(motionDeviceId, { silent = false } = {}) {
    const link = this._links.get(motionDeviceId);
    if (!link) { return false; }
    if (link.offTimer) { this._clearScheduler().clearTimeout(link.offTimer); }
    this._links.delete(motionDeviceId);
    if (!silent) { this._log(`[CASCADE] ⛓️‍💥 unlinked ${motionDeviceId}`); }
    return true;
  }

  isLinked(motionDeviceId) { return this._links.has(motionDeviceId); }

  async _setOn(device, dim) {
    if (!device) { return; }
    if (dim !== null && dim !== undefined && device.hasCapability?.('dim') && typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue('dim', dim).catch(() => {});
    }
    if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue('onoff', true).catch(() => {});
    }
  }

  async _setOff(device) {
    if (device && typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue('onoff', false).catch(() => {});
    }
  }

  /** Called centrally when a motion/presence event fires for a device. */
  async onMotion(motionDeviceId) {
    const link = this._links.get(motionDeviceId);
    if (!link || this._destroyed) { return false; }

    // Turn on linked light(s)
    await this._setOn(link.light, link.dim);
    if (link.alsoLight) { await this._setOn(link.alsoLight, link.dim); }

    // Reset auto-off timer
    if (link.offTimer) { this._clearScheduler().clearTimeout(link.offTimer); }
    link.offTimer = this._scheduler().setTimeout(() => {
      link.offTimer = null;
      this._setOff(link.light);
      if (link.alsoLight) { this._setOff(link.alsoLight); }
      this._log(`[CASCADE] 🌑 auto-off after ${link.offMinutes} min without motion (${link.light?.getName?.()})`);
      this.emit('auto_off', { motionDeviceId, light: link.light });
    }, link.offMinutes * 60 * 1000);

    this.emit('motion', { motionDeviceId, light: link.light, alsoLight: link.alsoLight });
    return true;
  }

  getReport() {
    const links = [];
    for (const [id, link] of this._links) {
      links.push({
        motion: id,
        light: link.light?.getName?.() || '?',
        alsoLight: link.alsoLight?.getName?.() || null,
        offMinutes: link.offMinutes,
        pendingOff: !!link.offTimer,
      });
    }
    return { link_count: links.length, links };
  }

  destroy() {
    this._destroyed = true;
    for (const [, link] of this._links) {
      if (link.offTimer) { this._clearScheduler().clearTimeout(link.offTimer); }
    }
    this._links.clear();
    this.removeAllListeners();
  }
}

module.exports = MotionCascadeManager;
