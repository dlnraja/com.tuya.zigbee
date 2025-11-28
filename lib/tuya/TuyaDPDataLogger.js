'use strict';

/**
 * TuyaDPDataLogger - Universal DP Data Logger
 * v5.2.11 - Logs ALL incoming DPs for debugging and KPI
 *
 * This module ensures that every DP received from Tuya devices
 * is properly logged, stored, and can be tracked for diagnostics.
 */

class TuyaDPDataLogger {

  constructor(device) {
    this.device = device;
    this.receivedDPs = {};
    this.lastUpdate = null;
    this.startTime = Date.now();
  }

  /**
   * Initialize the logger and attach to TuyaEF00Manager
   */
  async initialize() {
    this.device.log('[DP-LOGGER] 📊 Initializing Tuya DP Data Logger...');

    // Get the manager
    const manager = this.device.tuyaEF00Manager;

    if (!manager) {
      this.device.log('[DP-LOGGER] ⚠️ No TuyaEF00Manager found');
      return false;
    }

    // Listen to ALL DP events
    manager.on('datapoint', ({ dp, value, dpType }) => {
      this._logDP(dp, value, dpType);
    });

    manager.on('dpReport', ({ dpId, value, dpType }) => {
      this._logDP(dpId, value, dpType);
    });

    // Listen to individual DPs (1-200)
    for (let dp = 1; dp <= 200; dp++) {
      manager.on(`dp-${dp}`, (value) => {
        this._logDP(dp, value, 'event');
      });
    }

    this.device.log('[DP-LOGGER] ✅ Logger attached to all DP events');

    // Store initial status
    await this._storeStatus();

    return true;
  }

  /**
   * Log a received DP
   */
  _logDP(dpId, value, dpType) {
    const timestamp = Date.now();

    // Store in memory
    this.receivedDPs[dpId] = {
      value: value,
      type: dpType,
      timestamp: timestamp,
      count: (this.receivedDPs[dpId]?.count || 0) + 1
    };

    this.lastUpdate = timestamp;

    // Log to console
    this.device.log(`[DP-LOGGER] 📦 DP${dpId} = ${JSON.stringify(value)} (type: ${dpType || 'unknown'})`);

    // Store to device store
    this.device.setStoreValue(`dp_log_${dpId}`, {
      value: value,
      type: dpType,
      timestamp: timestamp
    }).catch(() => { });

    this.device.setStoreValue('dp_logger_last_update', timestamp).catch(() => { });
    this.device.setStoreValue('dp_logger_received_count', Object.keys(this.receivedDPs).length).catch(() => { });

    // Auto-update capabilities based on common DP mappings
    this._autoUpdateCapability(dpId, value);
  }

  /**
   * Auto-update device capabilities based on known DP mappings
   */
  _autoUpdateCapability(dpId, value) {
    const DP_CAPABILITY_MAP = {
      // Battery
      4: { cap: 'measure_battery', parser: v => v },
      14: { cap: 'alarm_battery', parser: v => Boolean(v) },
      15: { cap: 'measure_battery', parser: v => v },
      33: { cap: 'measure_battery', parser: v => v },
      35: { cap: 'measure_battery', parser: v => v },

      // Temperature (divided by 10)
      1: { cap: 'measure_temperature', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      3: { cap: 'measure_temperature', parser: v => v / 10 },
      18: { cap: 'measure_temperature', parser: v => v / 10 },

      // Humidity (divided by 10 or direct)
      2: { cap: 'measure_humidity', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      5: { cap: 'measure_humidity', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      19: { cap: 'measure_humidity', parser: v => v / 10 },

      // Motion/Presence
      // Note: DP1 can be both temperature OR motion - check value type
    };

    const mapping = DP_CAPABILITY_MAP[dpId];

    if (mapping && this.device.hasCapability(mapping.cap)) {
      try {
        const parsedValue = mapping.parser(value);

        // Validate value
        if (parsedValue === null || parsedValue === undefined) return;
        if (typeof parsedValue === 'number' && (isNaN(parsedValue) || !isFinite(parsedValue))) return;

        this.device.setCapabilityValue(mapping.cap, parsedValue)
          .then(() => {
            this.device.log(`[DP-LOGGER] ✅ ${mapping.cap} = ${parsedValue} (from DP${dpId})`);
          })
          .catch(err => {
            this.device.error(`[DP-LOGGER] ❌ Failed to set ${mapping.cap}:`, err.message);
          });
      } catch (err) {
        this.device.error(`[DP-LOGGER] Parse error for DP${dpId}:`, err.message);
      }
    }

    // Special handling for DP1 - could be motion (bool) or temperature (number)
    if (dpId === 1) {
      if (value === true || value === false || value === 0 || value === 1) {
        // Looks like motion
        if (this.device.hasCapability('alarm_motion')) {
          this.device.setCapabilityValue('alarm_motion', Boolean(value))
            .then(() => this.device.log(`[DP-LOGGER] ✅ alarm_motion = ${Boolean(value)} (from DP1)`))
            .catch(() => { });
        }
      }
    }
  }

  /**
   * Store current status
   */
  async _storeStatus() {
    const status = {
      initialized: true,
      startTime: this.startTime,
      receivedDPs: Object.keys(this.receivedDPs),
      lastUpdate: this.lastUpdate,
      dpCount: Object.keys(this.receivedDPs).length
    };

    await this.device.setStoreValue('dp_logger_status', status).catch(() => { });
  }

  /**
   * Get status report
   */
  getStatus() {
    const now = Date.now();
    const uptime = Math.floor((now - this.startTime) / 1000);
    const timeSinceLastDP = this.lastUpdate ? Math.floor((now - this.lastUpdate) / 1000) : null;

    return {
      uptime: `${uptime}s`,
      receivedDPs: Object.keys(this.receivedDPs).map(dp => `DP${dp}`),
      dpCount: Object.keys(this.receivedDPs).length,
      lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : 'Never',
      timeSinceLastDP: timeSinceLastDP !== null ? `${timeSinceLastDP}s ago` : 'No data yet',
      details: this.receivedDPs
    };
  }

  /**
   * Log status to console
   */
  logStatus() {
    const status = this.getStatus();

    this.device.log('══════════════════════════════════════════════════════════════');
    this.device.log('[DP-LOGGER] 📊 STATUS REPORT');
    this.device.log('══════════════════════════════════════════════════════════════');
    this.device.log(`   Uptime: ${status.uptime}`);
    this.device.log(`   DPs Received: ${status.dpCount} (${status.receivedDPs.join(', ') || 'none'})`);
    this.device.log(`   Last Update: ${status.lastUpdate}`);
    this.device.log(`   Time Since Last DP: ${status.timeSinceLastDP}`);

    if (status.dpCount === 0) {
      this.device.log('   ⚠️ NO DATA RECEIVED YET');
      this.device.log('   ℹ️ Battery devices may take 4-24 hours to wake up');
      this.device.log('   ℹ️ Try triggering the device (motion, press button, etc.)');
    }

    this.device.log('══════════════════════════════════════════════════════════════');
  }
}

module.exports = TuyaDPDataLogger;
