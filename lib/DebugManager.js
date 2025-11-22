'use strict';

/**
 * DEBUG MANAGER
 *
 * Centralized debug/logging control
 * - Developer Debug Mode flag
 * - Controlled logging levels
 * - Performance impact awareness
 *
 * AUDIT V2: Reduce log spam for production users
 */

class DebugManager {

  constructor(homey) {
    this.homey = homey;
    this.debugMode = false;
    this.init();
  }

  /**
   * Initialize debug manager
   */
  init() {
    // Get debug mode from app settings
    this.debugMode = this.homey.settings.get('developer_debug_mode') || false;

    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
      if (key === 'developer_debug_mode') {
        this.debugMode = this.homey.settings.get('developer_debug_mode');
        this.homey.log(`[DEBUG-MANAGER] Debug mode ${this.debugMode ? 'ENABLED' : 'DISABLED'}`);
      }
    });

    this.homey.log(`[DEBUG-MANAGER] Initialized (debug mode: ${this.debugMode})`);
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled() {
    return this.debugMode;
  }

  /**
   * Log only in debug mode
   */
  debug(...args) {
    if (this.debugMode) {
      this.homey.log('[DEBUG]', ...args);
    }
  }

  /**
   * Always log (critical messages)
   */
  log(...args) {
    this.homey.log(...args);
  }

  /**
   * Always log errors
   */
  error(...args) {
    this.homey.error(...args);
  }

  /**
   * Verbose logging (only in debug mode, very detailed)
   */
  verbose(...args) {
    if (this.debugMode) {
      this.homey.log('[VERBOSE]', ...args);
    }
  }
}

module.exports = DebugManager;
