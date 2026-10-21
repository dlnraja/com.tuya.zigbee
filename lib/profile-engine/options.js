'use strict';
/**
 * P-KB2 generic report options (own implementation of ideas from Zigbee2MQTT generic device options:
 * debounce, throttle, filtered_attributes, optimistic — https://www.zigbee2mqtt.io/guide/configuration/devices-groups.html).
 * All default OFF. Pure, timer-injectable, bounded.
 */
class ReportOptions {
  constructor(opts = {}, { now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    this.o = { debounceMs: 0, throttleMs: 0, filtered: [], optimistic: false, ...opts };
    this.filters = (this.o.filtered || []).slice(0, 32).map((p) => { try { return new RegExp(`^(?:${p})$`); } catch { return null; } }).filter(Boolean);
    this.now = now; this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.last = new Map(); this.pending = new Map();
  }
  isFiltered(cap) { return this.filters.some((r) => r.test(cap)); }
  /** emit(cap, value) is called when the value should reach Homey. */
  push(cap, value, emit) {
    if (this.isFiltered(cap)) return 'filtered';
    const t = this.now();
    if (this.o.throttleMs > 0) { const l = this.last.get(cap); if (l != null && t - l < this.o.throttleMs) return 'throttled'; }
    if (this.o.debounceMs > 0) {
      const p = this.pending.get(cap); if (p) this.clearTimer(p.timer);
      if (this.pending.size >= 256 && !p) { this.last.set(cap, t); emit(cap, value); return 'emitted'; }
      const timer = this.setTimer(() => { this.pending.delete(cap); this.last.set(cap, this.now()); emit(cap, value); }, this.o.debounceMs);
      this.pending.set(cap, { timer, value }); return 'debounced';
    }
    this.last.set(cap, t); emit(cap, value); return 'emitted';
  }
  /** Optimistic: after a successful command, show the requested value without waiting for a report. */
  afterCommand(cap, value, emit) { if (this.o.optimistic) { emit(cap, value); return true; } return false; }
  destroy() { for (const p of this.pending.values()) this.clearTimer(p.timer); this.pending.clear(); this.last.clear(); }
}
module.exports = { ReportOptions };
