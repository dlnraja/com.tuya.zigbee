'use strict';

/**
 * TUYA TIME SYNCHRONIZATION MANAGER
 *
 * Protocol:
 * - Device → Host: Command 0x24, Payload: uint16 (request ID)
 * - Host → Device: Command 0x24, Payload: [uint16][uint32 UTC][uint32 Local]
 *
 * Timestamp: Unix epoch (seconds since 1970-01-01 00:00:00 GMT)
 *
 * Sources:
 * - developer.tuya.com/en/docs/iot/device-development
 * - github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md
 * - Real device sniffing
 *
 * Supported devices:
 * - Climate monitors with display
 * - TRVs with scheduling
 * - Curtain motors with timers
 * - Sirens with clock
 * - Any TS0601 device that sends 0x24 requests
 */

class TuyaTimeSyncManager {

  constructor(device) {
    this.device = device;
    this.dailySyncTimer = null;
    this.syncEnabled = true;
  }

  /**
   * Initialize time sync
   */
  async initialize(zclNode) {
    if (!zclNode) return false;

    this.device.log('[TIME-SYNC] 🕐 Initializing...');

    const endpoint = zclNode.endpoints?.[1];
    if (!endpoint) {
      this.device.log('[TIME-SYNC] ⚠️  No endpoint 1');
      return false;
    }

    // Check Tuya cluster
    const tuyaCluster = endpoint.clusters.tuyaSpecific
      || endpoint.clusters.tuyaManufacturer
      || endpoint.clusters[0xEF00];

    if (!tuyaCluster) {
      this.device.log('[TIME-SYNC] ⚠️  No Tuya cluster');
      return false;
    }

    this.device.log('[TIME-SYNC] ✅ Tuya cluster found');
    this.tuyaCluster = tuyaCluster;
    this.endpoint = endpoint;

    // Listen for time sync requests from device
    this.setupTimeSyncListener();

    // Send initial sync
    await this.sendTimeSync();

    // Schedule daily sync at 3 AM
    this.scheduleDailySync();

    return true;
  }

  /**
   * Setup listener for device time sync requests
   */
  setupTimeSyncListener() {
    try {
      // Listen for command 0x24 (time sync request)
      if (this.endpoint && typeof this.endpoint.on === 'function') {
        this.endpoint.on('frame', async (frame) => {
          // Check if it's a time sync request (0x24)
          if (frame.cluster === 0xEF00 && frame.command === 0x24) {
            this.device.log('[TIME-SYNC] 📥 Device requested time sync');

            // Extract request ID from payload (first 2 bytes)
            const requestId = frame.data?.readUInt16BE(0) || 0;

            await this.sendTimeSync(requestId);
          }
        });

        this.device.log('[TIME-SYNC] ✅ Listening for sync requests');
      }
    } catch (err) {
      this.device.log('[TIME-SYNC] ⚠️  Listener setup failed:', err.message);
    }
  }

  /**
   * Send time synchronization to device
   * @param {number} requestId - Optional request ID from device
   */
  async sendTimeSync(requestId = 0) {
    if (!this.syncEnabled) {
      this.device.log('[TIME-SYNC] ℹ️  Sync disabled');
      return false;
    }

    try {
      const now = new Date();

      // Calculate UTC and local timestamps
      const utcTimestamp = Math.floor(now.getTime() / 1000);
      const localTimestamp = utcTimestamp + (now.getTimezoneOffset() * -60);

      this.device.log('[TIME-SYNC] 📤 Sending sync...');
      this.device.log(`[TIME-SYNC]    UTC: ${new Date(utcTimestamp * 1000).toISOString()}`);
      this.device.log(`[TIME-SYNC]    Local: ${now.toLocaleString()}`);
      this.device.log(`[TIME-SYNC]    Request ID: 0x${requestId.toString(16).padStart(4, '0')}`);

      // Build payload: [requestId:2][utcTime:4][localTime:4]
      const payload = Buffer.alloc(10);
      payload.writeUInt16BE(requestId, 0);      // Request ID
      payload.writeUInt32BE(utcTimestamp, 2);   // UTC timestamp
      payload.writeUInt32BE(localTimestamp, 6); // Local timestamp

      this.device.log(`[TIME-SYNC]    Payload: ${payload.toString('hex')}`);

      // Send via Tuya cluster command 0x24
      if (this.tuyaCluster && typeof this.tuyaCluster.sendCommand === 'function') {
        await this.tuyaCluster.sendCommand(0x24, payload);
        this.device.log('[TIME-SYNC] ✅ Sync sent successfully');
        return true;
      } else if (this.endpoint) {
        // Fallback: send raw frame
        await this.endpoint.sendFrame(0xEF00, payload, 0x24);
        this.device.log('[TIME-SYNC] ✅ Sync sent (raw frame)');
        return true;
      }

      this.device.log('[TIME-SYNC] ❌ No method available to send');
      return false;

    } catch (err) {
      this.device.error('[TIME-SYNC] ❌ Sync failed:', err.message);
      return false;
    }
  }

  /**
   * Send date/time in alternative format (7-byte payload)
   * Used by some devices like climate sensors with display
   */
  async sendDateTimeSync() {
    try {
      const now = new Date();

      // Build 7-byte payload: [year][month][date][hour][minute][second][day]
      const payload = Buffer.from([
        now.getFullYear() - 2000,      // Year offset from 2000
        now.getMonth() + 1,            // Month (1-12)
        now.getDate(),                 // Date (1-31)
        now.getHours(),                // Hour (0-23)
        now.getMinutes(),              // Minute (0-59)
        now.getSeconds(),              // Second (0-59)
        (now.getDay() + 6) % 7         // Day (Monday=0, Sunday=6)
      ]);

      this.device.log('[TIME-SYNC] 📤 Sending date/time sync...');
      this.device.log(`[TIME-SYNC]    DateTime: ${now.toLocaleString()}`);
      this.device.log(`[TIME-SYNC]    Payload: ${payload.toString('hex')}`);

      // Try DP 0x24 (time sync DP)
      if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.sendTuyaDP(0x24, 0x00, payload); // RAW type
        this.device.log('[TIME-SYNC] ✅ DateTime sent');
        return true;
      }

      return false;
    } catch (err) {
      this.device.error('[TIME-SYNC] ❌ DateTime sync failed:', err.message);
      return false;
    }
  }

  /**
   * Schedule daily time sync at 3 AM
   */
  scheduleDailySync() {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
    }

    // Calculate milliseconds until 3 AM tomorrow
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    const msUntil3AM = tomorrow - now;

    this.device.log(`[TIME-SYNC] ⏰ Next sync in ${Math.round(msUntil3AM / 1000 / 60 / 60)}h`);

    this.dailySyncTimer = setTimeout(() => {
      this.device.log('[TIME-SYNC] ⏰ Daily sync triggered');
      this.sendTimeSync();
      this.sendDateTimeSync(); // Try both formats
      this.scheduleDailySync(); // Reschedule
    }, msUntil3AM);
  }

  /**
   * Manual sync trigger (for testing or user action)
   */
  async triggerManualSync() {
    this.device.log('[TIME-SYNC] 🔧 Manual sync triggered');
    await this.sendTimeSync();
    await this.sendDateTimeSync();
  }

  /**
   * Enable/disable sync
   */
  setSyncEnabled(enabled) {
    this.syncEnabled = enabled;
    this.device.log(`[TIME-SYNC] Sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
      this.dailySyncTimer = null;
    }

    this.device.log('[TIME-SYNC] 🛑 Stopped');
  }
}

module.exports = TuyaTimeSyncManager;
