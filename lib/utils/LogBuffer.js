'use strict';
const { safeMultiply } = require('./tuyaUtils.js');

const LOG_KEY = 'debug_log_buffer';
const MAX_ENTRIES = 500;
const MAX_AGE_MS = safeMultiply(24, 60 * 60 * 1000);

class LogBuffer {
  constructor(homey) {
    this.homey = homey;
    this.buffer = [];
    this.initialized = false;
    this.init();
  }
  
  async init() {
    try {
      const stored = await this.homey.settings.get(LOG_KEY);
      if (stored && Array.isArray(stored)) {
        this.buffer = stored;
        this.pruneOldEntries();
      }
      this.initialized = true;
    } catch (err) {
      this.buffer = [];
      this.initialized = true;
    }
  }
  
  async push(level, category, message, device = null, meta = null) {
    if (!this.initialized) await this.init();
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      device,
      meta
    };
    
    this.buffer.push(entry);
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer.splice(0, this.buffer.length - MAX_ENTRIES);
    }
    
    this.persist().catch(() => {});
  }
  
  async persist() {
    try {
      await this.homey.settings.set(LOG_KEY, this.buffer);
    } catch (err) {}
  }
  
  async read() {
    if (!this.initialized) await this.init();
    this.pruneOldEntries();
    return this.buffer;
  }
  
  pruneOldEntries() {
    const now = Date.now();
    this.buffer = this.buffer.filter(entry => {
      const age = now - new Date(entry.timestamp).getTime();
      return age < MAX_AGE_MS;
    });
  }
  
  async clear() {
    this.buffer = [];
    await this.persist();
  }
  
  getStats() {
    const stats = {
      totalEntries: this.buffer.length,
      maxEntries: MAX_ENTRIES,
      byLevel: {},
      byCategory: {},
      oldestEntry: this.buffer.length > 0 ? this.buffer[0].timestamp : null,
      newestEntry: this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].timestamp : null
    };
    
    this.buffer.forEach(entry => {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
    });
    
    return stats;
  }
}

module.exports = { LogBuffer };
