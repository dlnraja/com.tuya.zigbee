'use strict';

/**
 * LogBuffer - Circular buffer for logs accessible via Homey.ManagerSettings
 * 
 * Enables MCP (Model Context Protocol) agents to read app logs remotely
 * by querying Homey.ManagerSettings.get('debug_log_buffer')
 * 
 * Features:
 * - Circular buffer (max 500 entries)
 * - Auto-pruning after 24h
 * - MCP-compatible JSON structure
 * - Categories: ZIGBEE, CLUSTER, DEVICE, BATTERY, FLOW, APP
 * - Levels: INFO, WARN, ERROR, DEBUG
 */

const LOG_KEY = 'debug_log_buffer';
const MAX_ENTRIES = 500;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

class LogBuffer {
  constructor(homey) {
    this.homey = homey;
    this.buffer = [];
    this.initialized = false;
    
    // Initialize from settings
    this.init();
  }
  
  /**
   * Initialize buffer from ManagerSettings
   */
  async init() {
    try {
      const stored = await this.homey.settings.get(LOG_KEY);
      if (stored && Array.isArray(stored)) {
        this.buffer = stored;
        this.pruneOldEntries();
      }
      this.initialized = true;
    } catch (err) {
      console.error('[LogBuffer] Failed to initialize:', err.message);
      this.buffer = [];
      this.initialized = true;
    }
  }
  
  /**
   * Add log entry to buffer
   * @param {string} level - INFO, WARN, ERROR, DEBUG
   * @param {string} category - ZIGBEE, CLUSTER, DEVICE, etc.
   * @param {string} message - Log message
   * @param {string} device - Device name (optional)
   * @param {Object} meta - Additional metadata (optional)
   */
  async push(level, category, message, device = null, meta = null) {
    if (!this.initialized) {
      await this.init();
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      device,
      meta
    };
    
    this.buffer.push(entry);
    
    // Circular buffer: remove oldest if over limit
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer.splice(0, this.buffer.length - MAX_ENTRIES);
    }
    
    // Persist to settings (non-blocking)
    this.persist().catch(err => {
      console.error('[LogBuffer] Failed to persist:', err.message);
    });
  }
  
  /**
   * Persist buffer to ManagerSettings
   */
  async persist() {
    try {
      await this.homey.settings.set(LOG_KEY, this.buffer);
    } catch (err) {
      // Ignore errors to prevent crash
      console.error('[LogBuffer] Persist failed:', err.message);
    }
  }
  
  /**
   * Read all logs
   * @returns {Array} Log entries
   */
  async read() {
    if (!this.initialized) {
      await this.init();
    }
    
    this.pruneOldEntries();
    return this.buffer;
  }
  
  /**
   * Read logs by level
   * @param {string} level - INFO, WARN, ERROR, DEBUG
   * @returns {Array} Filtered log entries
   */
  async readByLevel(level) {
    const logs = await this.read();
    return logs.filter(entry => entry.level === level);
  }
  
  /**
   * Read logs by category
   * @param {string} category - ZIGBEE, CLUSTER, DEVICE, etc.
   * @returns {Array} Filtered log entries
   */
  async readByCategory(category) {
    const logs = await this.read();
    return logs.filter(entry => entry.category === category);
  }
  
  /**
   * Read logs by device
   * @param {string} device - Device name
   * @returns {Array} Filtered log entries
   */
  async readByDevice(device) {
    const logs = await this.read();
    return logs.filter(entry => entry.device === device);
  }
  
  /**
   * Read recent logs (last N entries)
   * @param {number} count - Number of entries
   * @returns {Array} Recent log entries
   */
  async readRecent(count = 50) {
    const logs = await this.read();
    return logs.slice(-count);
  }
  
  /**
   * Remove entries older than 24h
   */
  pruneOldEntries() {
    const now = Date.now();
    this.buffer = this.buffer.filter(entry => {
      const age = now - new Date(entry.timestamp).getTime();
      return age < MAX_AGE_MS;
    });
  }
  
  /**
   * Clear all logs
   */
  async clear() {
    this.buffer = [];
    await this.persist();
  }
  
  /**
   * Get buffer stats
   * @returns {Object} Stats
   */
  getStats() {
    const stats = {
      totalEntries: this.buffer.length,
      maxEntries: MAX_ENTRIES,
      byLevel: {},
      byCategory: {},
      oldestEntry: this.buffer.length > 0 ? this.buffer[0].timestamp : null,
      newestEntry: this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].timestamp : null
    };
    
    // Count by level
    this.buffer.forEach(entry => {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * Export for MCP (AI-ready format)
   * @returns {Object} Structured export
   */
  async exportForMCP() {
    const logs = await this.read();
    const stats = this.getStats();
    
    return {
      version: '1.0.0',
      exported: new Date().toISOString(),
      buffer: {
        entries: logs,
        stats
      },
      mcp: {
        protocol: 'homey-log-buffer',
        readable: true,
        settingsKey: LOG_KEY
      }
    };
  }
}

/**
 * Standalone helper functions for backward compatibility
 */

let globalBuffer = null;

function initGlobalBuffer(homey) {
  if (!globalBuffer) {
    globalBuffer = new LogBuffer(homey);
  }
  return globalBuffer;
}

async function pushLog(homey, level, category, message, device = null, meta = null) {
  const buffer = initGlobalBuffer(homey);
  await buffer.push(level, category, message, device, meta);
}

async function readLogs(homey) {
  const buffer = initGlobalBuffer(homey);
  return await buffer.read();
}

async function exportForMCP(homey) {
  const buffer = initGlobalBuffer(homey);
  return await buffer.exportForMCP();
}

module.exports = {
  LogBuffer,
  pushLog,
  readLogs,
  exportForMCP,
  initGlobalBuffer
};
