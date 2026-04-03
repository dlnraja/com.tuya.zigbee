'use strict';

/**
 * EventDeduplicator - Prevents duplicate flow triggers
 * @version 5.5.670
 */

class EventDeduplicator {
  constructor(device, windowMs = 300) {
    this.device = device;
    this.windowMs = windowMs;
    this._events = new Map();
  }

  shouldProcess(capability, value, source = 'unknown') {
    const hash = `${capability}:${JSON.stringify(value)}`;
    const now = Date.now();
    const existing = this._events.get(hash);
    
    if (existing && (now - existing.time) < this.windowMs) {
      return false; // Duplicate
    }
    
    this._events.set(hash, { time: now, source });
    
    // Cleanup old entries
    if (this._events.size > 100) {
      for (const [k, v] of this._events) {
        if (now - v.time > 5000) this._events.delete(k);
      }
    }
    return true;
  }
}

module.exports = EventDeduplicator;
