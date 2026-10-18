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
  register(name, fn) { if (typeof fn === 'function') {this._cleaners.set(name, fn);} return this; }
  unregister(name) { this._cleaners.delete(name); }
  handle(data = {}) {
    const count = Number(data.count) || 0; const limit = Number(data.limit) || 0;
    const ran = [];
    for (const [name, fn] of this._cleaners) {
      try { fn({ count, limit }); ran.push(name); } catch (e) { this._error(`[MEMWARN] cleaner ${name} failed: ${e && e.message}`); }
    }
    return this._finish({ count, limit, severity: 'normal' }, ran);
  }
  /**
   * Async, event-loop-friendly variant used by attach(): cleaners run one per tick (setImmediate) so a
   * burst of cache drops never freezes timers/Zigbee handling right when memory is tight, async cleaners
   * are awaited (bounded by `cleanerTimeoutMs`), and concurrent memwarns coalesce into the in-flight run
   * (no stacking work on a process that is already short of memory). `severity` is 'high' when a memwarn
   * repeats within 60 s so cleaners may drop more aggressively.
   */
  handleAsync(data = {}, { cleanerTimeoutMs = 2000 } = {}) {
    if (this._inflight) {return this._inflight;}
    const count = Number(data.count) || 0; const limit = Number(data.limit) || 0;
    const now = Date.now();
    const last = this.events[this.events.length - 1];
    const severity = last && now - last.at < 60000 ? 'high' : 'normal';
    this._inflight = (async () => {
      const ran = [];
      try {
        for (const [name, fn] of Array.from(this._cleaners)) {
          await new Promise((r) => setImmediate(r));
          let timer;
          try {
            const out = fn({ count, limit, severity });
            if (out && typeof out.then === 'function') {
              // module-level native setTimeout — no homey/device in the guard, unref'd, cleared in finally
              await Promise.race([out, new Promise((r) => { timer = setTimeout(r, cleanerTimeoutMs); if (timer.unref) {timer.unref();} })]);
            }
            ran.push(name);
          } catch (e) { this._error(`[MEMWARN] cleaner ${name} failed: ${e && e.message}`); } finally { if (timer) {clearTimeout(timer);} }
        }
        return this._finish({ count, limit, severity }, ran);
      } finally { this._inflight = null; }
    })();
    return this._inflight;
  }
  _finish(meta, ran) {
    if (typeof global.gc === 'function') { try { global.gc(); } catch (e) { /* ignore */ } }
    let heapMB = -1;
    try { heapMB = Math.round(process.memoryUsage().heapUsed / 1048576); } catch (e1) {
      try { heapMB = Math.round(require('v8').getHeapStatistics().used_heap_size / 1048576); } catch (e2) { heapMB = -1; }
    }
    const ev = { at: Date.now(), count: meta.count, limit: meta.limit, severity: meta.severity, heapMB, cleaners: ran };
    this.events.push(ev); if (this.events.length > 20) {this.events.shift();}
    this._log(`[MEMWARN] ${meta.count}/${meta.limit} heap=${heapMB}MB cleared=${ran.join(',') || 'none'}`);
    return ev;
  }
  attach(homey) {
    if (!homey || typeof homey.on !== 'function') {return false;}
    homey.on('memwarn', (d) => {
      try { this.handleAsync(d).catch((e) => this._error(`[MEMWARN] handle failed: ${e && e.message}`)); }
      catch (e) { this._error(`[MEMWARN] handle failed: ${e && e.message}`); }
    });
    return true;
  }
}
module.exports = MemwarnGuard;
