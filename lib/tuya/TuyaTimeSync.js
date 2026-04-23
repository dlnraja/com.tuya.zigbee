'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * TuyaTimeSync - v5.5.28 Unified Time Synchronization Module
 *
 * Provides standardized time sync for Tuya devices with safeDivide(clocks, displays.)
 *
 * Features:
 * - ZCL Time cluster (0x000A) sync
 * - Tuya EF00 time sync command
 * - Automatic periodic sync (configurable interval)
 * - Wake-aware sync (sends when device wakes)
 * - Timezone handling
 *
 * Usage:
 *   const { TuyaTimeSyncMixin } = require('../../lib/tuya/TuyaTimeSync');
 *   class MyDevice extends TuyaTimeSyncMixin(UnifiedSensorBase) { ... }
 *
 * Or standalone:
 *   const { syncDeviceTime } = require('../../lib/tuya/TuyaTimeSync');
 *   await syncDeviceTime(device, options);
 *
 * Sources:
 * - ZHA: Tuya time sync quirk
 * - Z2M: tuya.ts time handling
 * - Tuya Developer: TS0601 clock protocol
 */

// 
// CONSTANTS
// 

const TUYA_CLUSTER_ID = CLUSTERS.TUYA_EF00; // CLUSTERS.TUYA_EF00
const TIME_CLUSTER_ID = 0x000A; // 10
const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime(); // Jan 1, 2000

// v5.5.184: CRITICAL - Tuya epoch offset (difference between Unix 1970 and Tuya 2000)
// Some devices expect Unix epoch, others expect Tuya epoch (2000)
// TH05Z LCD devices expect Tuya epoch!
const TUYA_EPOCH_OFFSET = 946684800; // Seconds from 1970-01-01 to 2000-01-01
const TuyaSpecificCluster = require('../clusters/TuyaSpecificCluster');

// Time sync commands for Tuya EF00 cluster
const TUYA_TIME_SYNC_CMD = 0x24; // Time sync command ID
const TUYA_TIME_RESPONSE_CMD = 0x64; // Time response command ID

// Default sync interval: 6 hours (in ms)
const DEFAULT_SYNC_INTERVAL =safeMultiply(6, 60) * 60 * 1000;

// 
// STANDALONE FUNCTIONS
// 

/**
 * Calculate Zigbee time (seconds since 2000-01-01 00:00:00 UTC)
 * @returns {number} Seconds since Zigbee epoch
 */
function getZigbeeTime() {
  return Math.floor(safeMultiply(safeDivide((Date.now() - ZIGBEE_EPOCH, 1000))));
}

/**
 * Get local timezone offset in seconds
 * @returns {number} Timezone offset in seconds (positive = east of UTC)
 */
function getTimezoneOffsetSeconds() {
  return -new Date().getTimezoneOffset();
}

/**
 * Sync device time via ZCL Time cluster
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 * @param {Object} options - Configuration options
 * @param {number} options.endpointId - Endpoint ID (default: 1)
 * @param {string} options.logPrefix - Log prefix (default: '[TIME-SYNC]')
 * @param {boolean} options.silent - Suppress logs (default: false)
 * @returns {Promise<boolean>} - True if sync was successful
 */
async function syncDeviceTimeZCL(device, options = {}) {
  const {
    endpointId = 1,
    logPrefix = '[TIME-SYNC-ZCL]',
    silent = false,
  } = options;

  const log = silent ? () => { } : (msg) => device.log?.(msg) || console.log(msg);
  const error = (msg, err) => device.error?.(msg, err) || console.error(msg, err);try {
    const endpoint = device.zclNode?.endpoints?.[endpointId];
    if (!endpoint) {
      log(`${logPrefix} No endpoint ${endpointId} available`);
      return false;
    }

    // Find Time cluster
    const timeCluster = endpoint.clusters?.time
      || endpoint.clusters?.genTime
      || endpoint.clusters?.[TIME_CLUSTER_ID]
      || endpoint.clusters?.[String(TIME_CLUSTER_ID)];

    if (!timeCluster) {
      log(`${logPrefix} Time cluster not available`);
      return false;
    }

    const zigbeeTime = getZigbeeTime();
    const tzOffset = getTimezoneOffsetSeconds();
    const localTime = zigbeeTime + tzOffset;

    log(`${logPrefix} Syncing time...`);
    log(`${logPrefix}   UTC: ${zigbeeTime}s since 2000`);
    log(`${logPrefix}   TZ: ${tzOffset/3600}h offset`);
    log(`${logPrefix}   Local: ${new Date().toLocaleString()}`);

    await timeCluster.writeAttributes({
      time: zigbeeTime,
      localTime: localTime,
      timeZone: tzOffset,
    });

    log(`${logPrefix}  ZCL time sync successful`);
    return true;
  } catch (err) {
    error(`${logPrefix} ZCL time sync failed:`, err.message);
    return false;
  }
}

/**
 * Sync device time via Tuya EF00 cluster (for TS0601 devices)
 *
 * v5.5.184: CRITICAL FIX - Use correct epoch based on device type!
 * - _TZE284_* LCD devices: Use TUYA epoch (2000) - they show time on display
 * - Other TS0601 devices: Use Unix epoch (1970)
 *
 * Reference: https://github.com / Koenkk/zigbee2mqtt / issues/30054
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 * @param {Object} options - Configuration options
 * @param {string} options.manufacturerName - Override manufacturer name for epoch detection
 * @returns {Promise<boolean>} - True if sync was successful
 */
async function syncDeviceTimeTuya(device, options = {}) {
  const {
    endpointId = 1,
    logPrefix = '[TIME-SYNC-TUYA]',
    silent = false,
    manufacturerName = null, // override mfr for epoch detection
    sequenceNumber = 0,      // v5.10.3: sequence number (echoed from request)
  } = options;

  const log = silent ? () => { } : (msg) => device.log?.(msg) || console.log(msg);
  const error = (msg, err) => device.error?.(msg, err) || console.error(msg, err);try {
    const endpoint = device.zclNode?.endpoints?.[endpointId];
    if (!endpoint) {
      log(`${logPrefix} No endpoint ${endpointId} available`);
      return false;
    }

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.manuSpecificTuya
      || endpoint.clusters?.[TUYA_CLUSTER_ID]
      || endpoint.clusters?.[String(TUYA_CLUSTER_ID)];

    // Also try TuyaEF00Manager
    const manager = device.tuyaEF00Manager;

    if (!tuyaCluster && !manager) {
      log(`${logPrefix} Tuya cluster not available`);
      return false;
    }

    const now = new Date();

    // v5.10.4: Manufacturer-aware epoch detection
    const mfr = manufacturerName
      || device._manufacturerName
      || device.getSetting?.('zb_manufacturer_name')
      || device.getSetting?.('zb_manufacturer_name')
      || device._protocolInfo?.mfr
      || '';
    const ts = TuyaSpecificCluster.getTimestamps(mfr);
    const utcTimestamp = ts.utc;
    const localTimestamp = ts.local;

    log(`${logPrefix} Syncing (epoch=${ts.epoch}, mfr=${mfr}, seq=${sequenceNumber})`);
    log(`${logPrefix}   UTC: ${utcTimestamp} | Local: ${localTimestamp} | TZ: ${ts.tz}s`);

    // v5.10.3: 10-byte payload [seq:2][UTC:4][Local:4] 
    // Standard Tuya TS0601 time response format (Z2M/ZHA)
    const payload = Buffer.alloc(10);
    payload.writeUInt16BE(Number(sequenceNumber) || 0, 0); // Seq (MUST echo from request!)
    payload.writeUInt32BE(utcTimestamp, 2);                // UTC
    payload.writeUInt32BE(localTimestamp, 6);              // Local

    log(`${logPrefix}   Payload hex: ${payload.toString('hex')} [Seq:${sequenceNumber}][UTC:${utcTimestamp}][Local:${localTimestamp}]`);

    let sent = false;

    // Method 1: Use TuyaEF00Manager if available
    if (manager && typeof manager.sendCommand === 'function') {
      try {
        await manager.sendCommand(TUYA_TIME_SYNC_CMD, payload);
        sent = true;
        log(`${logPrefix} Sent via TuyaEF00Manager`);
      } catch (e) {
        // Try next method
      }
    }

    // Method 2: Direct cluster mcuSyncTime command
    if (!sent && tuyaCluster) {
      try {
        if (typeof tuyaCluster.mcuSyncTime === 'function') {
          // v5.11.16: Try integer format first (some cluster defs use {utc,local})
          try {
            await tuyaCluster.mcuSyncTime({ utc: utcTimestamp, local: localTimestamp });
            sent = true;
          } catch (_e) {
            await tuyaCluster.mcuSyncTime({ payloadSize: 10, payload: Buffer.from(payload) });
            sent = true;
          }
        } else if (typeof tuyaCluster.command === 'function') {
          await tuyaCluster.command('mcuSyncTime', {
            payloadSize: 10,
            payload: Buffer.from(payload),
          }, { disableDefaultResponse: true });
          sent = true;
        }
        if (sent) log(`${logPrefix} Sent via cluster command`);
      } catch (e) {
        log(`${logPrefix} Cluster command failed: ${e.message}`);
      }
    }

    if (sent) {
      log(`${logPrefix}  Tuya time sync sent`);
      return true;
    } else {
      log(`${logPrefix}  Could not send Tuya time sync`);
      return false;
    }
  } catch (err) {
    error(`${logPrefix} Tuya time sync failed:`, err.message);
    return false;
  }
}

/**
 * Sync device time using best available method
 * Tries ZCL first, then Tuya EF00
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} - True if any sync was successful
 */
async function syncDeviceTime(device, options = {}) {
  const {
    logPrefix = '[TIME-SYNC]',
    preferTuya = false,
    ...restOptions
  } = options;

  const log = (msg) => device.log?.(msg) || console.log(msg);log(`${logPrefix} Starting time sync...`);

  // Determine order based on device type
  const settings = device.getSettings?.() || {};const modelId = settings.zb_model_id || settings.zb_model_id || '';
  const mfrName = settings.zb_manufacturer_name || settings.zb_manufacturer_name || '';
  const isTuyaDP = device._isPureTuyaDP ||
    CI.equalsCI(modelId, 'ts0601') ||
    CI.startsWithCI(mfrName, '_tze');

  if (isTuyaDP || preferTuya) {
    // Try Tuya first, then ZCL
    const tuyaResult = await syncDeviceTimeTuya(device, { ...restOptions, logPrefix: `${logPrefix}[TUYA]` });
    if (tuyaResult) return true;
    return syncDeviceTimeZCL(device, { ...restOptions, logPrefix: `${logPrefix}[ZCL]` });
  } else {
    // Try ZCL first, then Tuya
    const zclResult = await syncDeviceTimeZCL(device, { ...restOptions, logPrefix: `${logPrefix}[ZCL]` });
    if (zclResult) return true;
    return syncDeviceTimeTuya(device, { ...restOptions, logPrefix: `${logPrefix}[TUYA]` });
  }
}

// 
// MIXIN FOR DEVICE CLASSES
// 

/**
 * Mixin that adds TuyaTimeSync methods to a device class
 *
 * Usage:
 *   class MyDevice extends TuyaTimeSyncMixin(UnifiedSensorBase) {
 *     async onNodeInit({ zclNode }) {
 *       await super.onNodeInit({ zclNode });
 *       await this.setupTimeSync({ interval: 6 * 60 * 60 * 1000 });
 *     }
 *   }
 */
function TuyaTimeSyncMixin(Base) {
  return class extends Base {
    /**
     * Setup automatic time sync
     * @param {Object} options - Configuration
     * @param {number} options.interval - Sync interval in ms (default: 6 hours)
     * @param {boolean} options.syncOnWake - Sync when device wakes (default: true)
     */
    async setupTimeSync(options = {}) {
      const {
        interval = DEFAULT_SYNC_INTERVAL,
        syncOnWake = true,
      } = options;

      this.log('[TIME-SYNC] Setting up automatic time sync...');

      // Initial sync
      await this.syncTime().catch(err => {
        this.log('[TIME-SYNC] Initial sync failed (device may be sleeping):', err.message);
      });

      // Periodic sync
      if (this._timeSyncInterval) {
        clearInterval(this._timeSyncInterval);
      }

      this._timeSyncInterval = setInterval(() => {
        this.syncTime().catch(err => {
          this.log('[TIME-SYNC] Periodic sync failed:', err.message);
      });
      }, interval);

      this._timeSyncOnWake = syncOnWake;

      this.log(`[TIME-SYNC]  Enabled (every ${interval/3600000}h)`);
    }

    /**
     * Sync device time
     * @param {Object} options - Sync options
     */
    async syncTime(options = {}) {
      return syncDeviceTime(this, options);
    }

    /**
     * Called when device wakes - override this in _handleDP or similar
     * to trigger time sync on wake
     */
    _onDeviceWake() {
      if (this._timeSyncOnWake) {
        // Debounce: only sync if not synced in last 5 minutes
        const now = Date.now();
        const lastSync = this._lastTimeSyncAttempt || 0;
        if (now - lastSync >safeMultiply(5, 60) * 1000) {
          this._lastTimeSyncAttempt = now;
          this.syncTime({ silent: true }).catch(() => { });
        }
      }
    }

    /**
     * Cleanup on device deletion
     */
    async onDeleted() {
      if (this._timeSyncInterval) {
        clearInterval(this._timeSyncInterval);
        this._timeSyncInterval = null;
      }
      if (typeof super.onDeleted === 'function') {
        await super.onDeleted();
      }
    }
  };
}

// 
// EXPORTS
// 

module.exports = {
  // Standalone functions
  syncDeviceTime,
  syncDeviceTimeZCL,
  syncDeviceTimeTuya,
  getZigbeeTime,
  getTimezoneOffsetSeconds,

  // Mixin
  TuyaTimeSyncMixin,

  // Constants
  TUYA_CLUSTER_ID,
  TIME_CLUSTER_ID,
  ZIGBEE_EPOCH,
  TUYA_EPOCH_OFFSET,
  DEFAULT_SYNC_INTERVAL,
};



