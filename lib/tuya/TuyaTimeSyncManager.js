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
   * v5.5.66: Device sends 0x24 command when it needs time sync
   */
  setupTimeSyncListener() {
    try {
      // Listen for command 0x24 (time sync request from device)
      if (this.endpoint && typeof this.endpoint.on === 'function') {
        this.endpoint.on('frame', async (frame) => {
          // Check if it's a time sync request (command 0x24 on cluster 0xEF00)
          if (frame.cluster === 0xEF00 && frame.command === 0x24) {
            this.device.log('[TIME-SYNC] 📥 Device requested time sync');
            // Respond with current time
            await this.sendTimeSync();
          }
        });

        this.device.log('[TIME-SYNC] ✅ Listening for sync requests');
      }

      // Also listen via TuyaEF00Manager if available
      if (this.device.tuyaEF00Manager) {
        this.device.tuyaEF00Manager.on?.('timeSyncRequest', async () => {
          this.device.log('[TIME-SYNC] 📥 Time sync request via manager');
          await this.sendTimeSync();
        });
      }
    } catch (err) {
      this.device.log('[TIME-SYNC] ⚠️  Listener setup failed:', err.message);
    }
  }

  /**
   * Send time synchronization to device
   * v5.5.66: Fixed payload format - Z2M compatible (8 bytes, not 10)
   *
   * Format: [UTC:4 bytes BE][Local:4 bytes BE]
   * UTC = Unix timestamp (seconds since 1970)
   * Local = UTC + timezone offset
   */
  async sendTimeSync() {
    if (!this.syncEnabled) {
      this.device.log('[TIME-SYNC] ℹ️  Sync disabled');
      return false;
    }

    try {
      const now = new Date();

      // Calculate UTC and local timestamps (Unix epoch - seconds since 1970)
      const utcTimestamp = Math.floor(now.getTime() / 1000);
      const timezoneOffsetSec = -now.getTimezoneOffset() * 60; // GMT+1 = +3600
      const localTimestamp = utcTimestamp + timezoneOffsetSec;

      this.device.log('[TIME-SYNC] 📤 Sending sync...');
      this.device.log(`[TIME-SYNC]    UTC: ${new Date(utcTimestamp * 1000).toISOString()}`);
      this.device.log(`[TIME-SYNC]    Local: ${now.toLocaleString()}`);
      this.device.log(`[TIME-SYNC]    Timezone: GMT${timezoneOffsetSec >= 0 ? '+' : ''}${timezoneOffsetSec / 3600}`);

      // v5.5.66: CORRECT FORMAT - 8 bytes only (Z2M compatible)
      // Build payload: [utcTime:4 BE][localTime:4 BE]
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcTimestamp, 0);   // UTC timestamp
      payload.writeUInt32BE(localTimestamp, 4); // Local timestamp

      this.device.log(`[TIME-SYNC]    Payload (8 bytes): ${payload.toString('hex')}`);

      // Send via Tuya cluster command 0x24 (mcuSyncTime)
      let sent = false;

      // Method 1: Use TuyaEF00Manager if available
      if (this.device.tuyaEF00Manager?.sendCommand) {
        try {
          await this.device.tuyaEF00Manager.sendCommand(0x24, payload);
          sent = true;
          this.device.log('[TIME-SYNC] ✅ Sync sent via TuyaEF00Manager');
        } catch (e) {
          this.device.log('[TIME-SYNC] TuyaEF00Manager failed, trying cluster...');
        }
      }

      // Method 2: Direct cluster command
      if (!sent && this.tuyaCluster) {
        try {
          // Try mcuSyncTime command
          if (typeof this.tuyaCluster.mcuSyncTime === 'function') {
            await this.tuyaCluster.mcuSyncTime({ payloadSize: 8, payload: [...payload] });
            sent = true;
          } else if (typeof this.tuyaCluster.command === 'function') {
            await this.tuyaCluster.command('mcuSyncTime', {
              payloadSize: 8,
              payload: [...payload],
            }, { disableDefaultResponse: true });
            sent = true;
          }
          if (sent) this.device.log('[TIME-SYNC] ✅ Sync sent via cluster command');
        } catch (e) {
          this.device.log('[TIME-SYNC] Cluster command failed:', e.message);
        }
      }

      // Method 3: Raw frame
      if (!sent && this.endpoint?.sendFrame) {
        try {
          await this.endpoint.sendFrame(0xEF00, payload, 0x24);
          sent = true;
          this.device.log('[TIME-SYNC] ✅ Sync sent via raw frame');
        } catch (e) {
          this.device.log('[TIME-SYNC] Raw frame failed:', e.message);
        }
      }

      if (!sent) {
        this.device.log('[TIME-SYNC] ❌ No method available to send');
        return false;
      }

      return true;

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
