'use strict';

/**
 * UniversalTimeSync - v5.5.107 Enhanced Time Synchronization
 *
 * Provides hourly time synchronization for all Tuya devices with clocks/displays.
 * Uses Homey's native time (synced with NTP) for accurate timekeeping.
 *
 * v5.5.107: 3-PHASE SYNC STRATEGY
 * 1. IMMEDIATE at init (device first connects)
 * 2. AFTER 60 MIN (when device recognition algorithms complete)
 * 3. EVERY HOUR (continuous sync)
 *
 * FEATURES:
 * - Hourly sync interval (configurable)
 * - Multiple sync methods (ZCL Time, Tuya DP, raw frames)
 * - Automatic timezone handling (Paris GMT+1/+2)
 * - Immediate sync on device wake
 * - Retry mechanism for failed syncs
 *
 * SUPPORTED DEVICES:
 * - LCD climate monitors (_TZE284_vvmbj46n, TH05Z)
 * - Smart thermostats with clock
 * - Any Tuya device with display showing time
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TUYA_CLUSTER_ID = 0xEF00; // 61184
const UNIX_EPOCH = 0;
const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();

// Tuya time commands
const TUYA_CMD_TIME_REQUEST = 0x24;  // 36 - Device requests time
const TUYA_CMD_TIME_RESPONSE = 0x24; // 36 - Response with time (same as request)

// v5.5.106: Sync every HOUR (was 6 hours)
const DEFAULT_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

// ═══════════════════════════════════════════════════════════════════════════
// TIME HELPERS - Using Homey's native Date (NTP synced)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get current time from Homey (synced with NTP)
 * Homey Pro uses NTP automatically - Date.now() is accurate
 */
function getHomeyTime() {
  return new Date();
}

/**
 * Get Unix timestamp (seconds since 1970)
 */
function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get Zigbee timestamp (seconds since 2000)
 */
function getZigbeeTimestamp() {
  return Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
}

/**
 * Get timezone offset in seconds
 * Positive = east of UTC (e.g., Paris = +3600 or +7200)
 */
function getTimezoneOffset() {
  return -new Date().getTimezoneOffset() * 60;
}

/**
 * Get local timestamp (UTC + timezone)
 */
function getLocalTimestamp(useUnixEpoch = true) {
  const utc = useUnixEpoch ? getUnixTimestamp() : getZigbeeTimestamp();
  return utc + getTimezoneOffset();
}

/**
 * Build Tuya time payload (8 bytes)
 * Format: UTC(4 bytes BE) + LocalTime(4 bytes BE)
 */
function buildTimePayload(useUnixEpoch = true) {
  const utc = useUnixEpoch ? getUnixTimestamp() : getZigbeeTimestamp();
  const local = getLocalTimestamp(useUnixEpoch);

  const payload = Buffer.alloc(8);
  payload.writeUInt32BE(utc, 0);
  payload.writeUInt32BE(local, 4);

  return payload;
}

/**
 * Format time for logging
 */
function formatTimeInfo() {
  const now = getHomeyTime();
  const tzOffsetHours = getTimezoneOffset() / 3600;
  const tzStr = tzOffsetHours >= 0 ? `+${tzOffsetHours}` : `${tzOffsetHours}`;

  return {
    utcIso: now.toISOString(),
    localStr: now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    unixTs: getUnixTimestamp(),
    localTs: getLocalTimestamp(),
    tzOffset: tzStr,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL TIME SYNC CLASS
// ═══════════════════════════════════════════════════════════════════════════

class UniversalTimeSync {
  /**
   * @param {object} device - Homey device instance
   * @param {object} options - Configuration options
   */
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      syncInterval: options.syncInterval || DEFAULT_SYNC_INTERVAL,
      // v5.5.171: CRITICAL FIX - Default to Tuya/Zigbee epoch (2000), NOT Unix epoch!
      // Source: https://github.com/Koenkk/zigbee2mqtt/issues/30054
      // Most Tuya devices expect timestamps since 2000-01-01, not 1970-01-01
      useUnixEpoch: options.useUnixEpoch === true, // Default: Zigbee/Tuya epoch (2000)
      verbose: options.verbose || false,
      retryOnFail: options.retryOnFail !== false,
      maxRetries: options.maxRetries || 3,
      ...options,
    };

    this._syncTimer = null;
    this._retryTimer = null;
    this._lastSyncTime = null;
    this._syncCount = 0;
    this._initialized = false;
  }

  log(msg) {
    if (this.options.verbose || true) { // Always log time sync
      this.device.log?.(`[TIME-SYNC] ${msg}`);
    }
  }

  /**
   * Initialize time synchronization
   */
  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.log('════════════════════════════════════════════════════════════');
    this.log('🕐 Initializing Universal Time Sync v5.5.107 (3-phase)');
    this.log(`   Interval: ${this.options.syncInterval / 60000} minutes`);
    this.log(`   Epoch: ${this.options.useUnixEpoch ? 'Unix (1970)' : 'Zigbee (2000)'}`);
    this.log('════════════════════════════════════════════════════════════');

    // Setup time request listener (device requests time)
    await this._setupTimeRequestListener();

    // v5.5.107: PHASE 1 - IMMEDIATE sync at init
    this.log('🟢 PHASE 1: Immediate sync at init');
    await this.syncNow();

    // v5.5.107: PHASE 2 - Sync after 60 min (recognition algorithms complete)
    this._recognitionTimer = setTimeout(async () => {
      this.log('🟡 PHASE 2: Post-recognition sync (60 min)');
      await this.syncNow();
    }, 60 * 60 * 1000); // 60 minutes

    // v5.5.107: PHASE 3 - Start hourly periodic sync
    this._startPeriodicSync();

    this.log('✅ Time sync initialized - 3-phase strategy active');
  }

  /**
   * Setup listener for time requests from device
   */
  async _setupTimeRequestListener() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return;

      const tuyaCluster = this._getTuyaCluster(endpoint);
      if (!tuyaCluster) return;

      // Listen for time requests
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', async (cmd, payload) => {
          if (cmd === TUYA_CMD_TIME_REQUEST || cmd === 0x28) {
            this.log('📥 Device requested time - syncing immediately');
            await this.syncNow();
          }
        });
      }

      this.log('✅ Time request listener configured');
    } catch (err) {
      this.log(`⚠️ Time request listener setup failed: ${err.message}`);
    }
  }

  /**
   * Get Tuya cluster from endpoint
   */
  _getTuyaCluster(endpoint) {
    return endpoint?.clusters?.tuya
      || endpoint?.clusters?.manuSpecificTuya
      || endpoint?.clusters?.[TUYA_CLUSTER_ID]
      || endpoint?.clusters?.['61184']
      || endpoint?.clusters?.[0xEF00];
  }

  /**
   * Start periodic time synchronization (every hour)
   */
  _startPeriodicSync() {
    this._stopPeriodicSync();

    this._syncTimer = setInterval(async () => {
      this.log('⏰ Hourly time sync triggered');
      await this.syncNow();
    }, this.options.syncInterval);

    this.log(`⏰ Periodic sync started (every ${this.options.syncInterval / 60000} min)`);
  }

  /**
   * Stop periodic sync
   */
  _stopPeriodicSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
  }

  /**
   * Sync time NOW - Main method
   */
  async syncNow(retryCount = 0) {
    const timeInfo = formatTimeInfo();

    this.log('════════════════════════════════════════════════════════════');
    this.log('🕐 SYNCING TIME TO DEVICE');
    this.log(`   UTC: ${timeInfo.utcIso}`);
    this.log(`   Local: ${timeInfo.localStr}`);
    this.log(`   Timezone: GMT${timeInfo.tzOffset}`);
    this.log(`   Unix TS: ${timeInfo.unixTs}`);
    this.log(`   Local TS: ${timeInfo.localTs}`);
    this.log('════════════════════════════════════════════════════════════');

    const results = {
      tuyaCluster: false,
      zclTime: false,
      tuyaManager: false,
    };

    // Method 1: Via Tuya cluster (most reliable for TS0601)
    results.tuyaCluster = await this._syncViaTuyaCluster();

    // Method 2: Via ZCL Time cluster (for ZCL-based devices)
    results.zclTime = await this._syncViaZCLTime();

    // Method 3: Via TuyaEF00Manager if available
    results.tuyaManager = await this._syncViaTuyaManager();

    const success = results.tuyaCluster || results.zclTime || results.tuyaManager;

    if (success) {
      this._lastSyncTime = Date.now();
      this._syncCount++;
      this.log(`✅ Time sync successful (#${this._syncCount})`);
      this.log(`   Methods: Tuya=${results.tuyaCluster}, ZCL=${results.zclTime}, Manager=${results.tuyaManager}`);
    } else {
      this.log(`⚠️ Time sync failed (attempt ${retryCount + 1}/${this.options.maxRetries})`);

      // Retry if enabled
      if (this.options.retryOnFail && retryCount < this.options.maxRetries - 1) {
        const retryDelay = (retryCount + 1) * 30000; // 30s, 60s, 90s
        this.log(`   Retrying in ${retryDelay / 1000}s...`);
        this._retryTimer = setTimeout(() => {
          this.syncNow(retryCount + 1);
        }, retryDelay);
      }
    }

    return success;
  }

  /**
   * Method 1: Sync via Tuya cluster (0xEF00)
   * Uses timeSync command with UTC and local timestamps
   */
  async _syncViaTuyaCluster() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return false;

      const tuyaCluster = this._getTuyaCluster(endpoint);
      if (!tuyaCluster) return false;

      const utc = getUnixTimestamp();
      const local = getLocalTimestamp();

      // Try timeSync method first
      if (typeof tuyaCluster.timeSync === 'function') {
        await tuyaCluster.timeSync({ utcTime: utc, localTime: local });
        this.log('   ✅ Sent via tuyaCluster.timeSync()');
        return true;
      }

      // Try timeResponse method
      if (typeof tuyaCluster.timeResponse === 'function') {
        await tuyaCluster.timeResponse({ utcTime: utc, localTime: local });
        this.log('   ✅ Sent via tuyaCluster.timeResponse()');
        return true;
      }

      // Try mcuSyncTime command
      if (typeof tuyaCluster.command === 'function') {
        const payload = buildTimePayload(this.options.useUnixEpoch);
        await tuyaCluster.command('mcuSyncTime', {
          payloadSize: payload.length,
          payload
        }, { disableDefaultResponse: true });
        this.log('   ✅ Sent via mcuSyncTime command');
        return true;
      }

      return false;
    } catch (err) {
      this.log(`   ⚠️ Tuya cluster sync failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Method 2: Sync via ZCL Time cluster (0x000A)
   * Standard Zigbee time synchronization
   */
  async _syncViaZCLTime() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      const timeCluster = endpoint?.clusters?.time || endpoint?.clusters?.genTime;

      if (!timeCluster) return false;

      const zigbeeTime = getZigbeeTimestamp();
      const tzOffset = getTimezoneOffset();

      await timeCluster.writeAttributes({
        time: zigbeeTime,
        localTime: zigbeeTime + tzOffset,
        timeZone: tzOffset,
      });

      this.log('   ✅ Sent via ZCL Time cluster');
      return true;
    } catch (err) {
      this.log(`   ⚠️ ZCL time sync failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Method 3: Sync via TuyaEF00Manager
   */
  async _syncViaTuyaManager() {
    try {
      const manager = this.device.tuyaEF00Manager;
      if (!manager) return false;

      const payload = buildTimePayload(this.options.useUnixEpoch);

      if (typeof manager.sendTimeSync === 'function') {
        await manager.sendTimeSync(payload);
        this.log('   ✅ Sent via TuyaEF00Manager.sendTimeSync()');
        return true;
      }

      if (typeof manager.sendCommand === 'function') {
        await manager.sendCommand(TUYA_CMD_TIME_RESPONSE, payload);
        this.log('   ✅ Sent via TuyaEF00Manager.sendCommand()');
        return true;
      }

      return false;
    } catch (err) {
      this.log(`   ⚠️ TuyaManager sync failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      initialized: this._initialized,
      lastSyncTime: this._lastSyncTime,
      lastSyncAgo: this._lastSyncTime
        ? `${Math.round((Date.now() - this._lastSyncTime) / 60000)} minutes ago`
        : 'never',
      syncCount: this._syncCount,
      nextSyncIn: this._syncTimer
        ? `${Math.round(this.options.syncInterval / 60000)} minutes`
        : 'not scheduled',
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this._stopPeriodicSync();
    // v5.5.107: Also clear recognition timer
    if (this._recognitionTimer) {
      clearTimeout(this._recognitionTimer);
      this._recognitionTimer = null;
    }
    this._initialized = false;
    this.log('🛑 Time sync destroyed');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION - Easy integration for any driver
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setup time sync for a device
 * Call this in onNodeInit() for any device that needs time sync
 *
 * @param {object} device - Homey device instance
 * @param {object} options - Optional configuration
 * @returns {UniversalTimeSync} - Time sync instance
 *
 * @example
 * async onNodeInit({ zclNode }) {
 *   await super.onNodeInit({ zclNode });
 *   this._timeSync = await setupTimeSync(this, { syncInterval: 3600000 });
 * }
 */
async function setupTimeSync(device, options = {}) {
  const timeSync = new UniversalTimeSync(device, {
    syncInterval: 60 * 60 * 1000, // 1 hour default
    verbose: true,
    ...options,
  });

  await timeSync.initialize();
  return timeSync;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  UniversalTimeSync,
  setupTimeSync,

  // Helpers
  getHomeyTime,
  getUnixTimestamp,
  getZigbeeTimestamp,
  getTimezoneOffset,
  getLocalTimestamp,
  buildTimePayload,
  formatTimeInfo,

  // Constants
  DEFAULT_SYNC_INTERVAL,
  TUYA_CMD_TIME_REQUEST,
  TUYA_CMD_TIME_RESPONSE,
};
