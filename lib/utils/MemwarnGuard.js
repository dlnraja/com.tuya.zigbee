'use strict';
/**
 * MemwarnGuard: reacts to Homey's documented `memwarn` event
 * (Homey emits it before killing an app that uses too much memory).
 * Additive: consumers register cache-clearing callbacks; the guard runs them.
 * Source: Homey Apps SDK (ManagerApps / Homey `memwarn` event).
 */
class MemwarnGuard {
  constructor({ log = () => {}, error = () => {} } = {}) {
    this._log = log; this._error = error;
    this._cleaners = new Map(); this.events = [];
  }
  register(name, fn) { if (typeof fn === 'function') this._cleaners.set(name, fn); return this; }
  unregister(name) { this._cleaners.delete(name); }
  handle(data = {}) {
    const count = Number(data.count) || 0; const limit = Number(data.limit) || 0;
    const ran = [];
    for (const [name, fn] of this._cleaners) {
      try { fn({ count, limit }); ran.push(name); } catch (e) { this._error(`[MEMWARN] cleaner ${name} failed: ${e && e.message}`); }
    }
    if (typeof global.gc === 'function') { try { global.gc(); } catch (e) { /* ignore */ } }
    const heapMB = Math.round(process.memoryUsage().heapUsed / 1048576);
    const ev = { at: Date.now(), count, limit, heapMB, cleaners: ran };
    this.events.push(ev); if (this.events.length > 20) this.events.shift();
    this._log(`[MEMWARN] ${count}/${limit} heap=${heapMB}MB cleared=${ran.join(',') || 'none'}`);
    return ev;
  }
  attach(homey) {
    if (!homey || typeof homey.on !== 'function') return false;
    homey.on('memwarn', (d) => this.handle(d));
    return true;
  }
}
module.exports = MemwarnGuard;
