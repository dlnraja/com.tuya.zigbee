'use strict';

/**
 * TUYA TIME SYNCHRONIZATION MANAGER - v5.5.623
 *
 * STRATEGY (hybrid approach):
 * ❌ NO immediate push at init (causes device confusion)
 * ✅ RESPOND to device-initiated requests (primary)
 * ✅ INTELLIGENT delayed push after 15 min (fallback for devices that don't ask)
 *
 * Protocol:
 * - Device → Host: Command 0x24, Payload: uint16 (request ID)
 * - Host → Device: Command 0x24, Payload: [UTC:4][Local:4] or [UTC:4][TZ:4][DST:1]
 *
 * 4 MECHANISMS (research from Z2M, HA, Tuya docs):
 * 1. Tuya EF00 Command 0x24 (most common on TS0601)
 * 2. ZCL Time Cluster 0x000A readAttributes
 * 3. Tuya private DP request
 * 4. Binding-triggered sync
 *
 * v5.5.623: INTELLIGENT DELAYED SYNC
 * - Wait 15 minutes after init for device to settle
 * - Only push if device hasn't requested time yet
 * - Single push, not repeated
 *
 * Sources:
 * - developer.tuya.com/en/docs/iot/device-development
 * - github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md
 * - Zigbee2MQTT tuya.ts converter
 * - Home Assistant ZHA Tuya quirk
 */

class TuyaTimeSyncManager {

  // v5.5.623: Delay before intelligent push (15 minutes)
  static INTELLIGENT_DELAY_MS = 15 * 60 * 1000;

  constructor(device) {
    this.device = device;
    this.dailySyncTimer = null;
    this.syncEnabled = true;
    this._deviceRequestedTime = false; // Track if device already asked for time
    this._intelligentSyncTimer = null;
  }

  /**
   * Initialize time sync - v5.5.623 HYBRID MODE
   * ❌ NO immediate push (causes device confusion)
   * ✅ Respond to device requests (primary)
   * ✅ Intelligent delayed push after 15 min (fallback)
   */
  async initialize(zclNode) {
    if (!zclNode) return false;

    this.device.log('[TIME-SYNC] 🕐 Initializing (HYBRID MODE)...');

    const endpoint = zclNode.endpoints?.[1];
    if (!endpoint) {
      this.device.log('[TIME-SYNC] ⚠️  No endpoint 1');
      return false;
    }

    // Check Tuya cluster
    const tuyaCluster = endpoint.clusters.tuyaSpecific
      || endpoint.clusters.tuyaManufacturer
      || endpoint.clusters.tuya
      || endpoint.clusters[0xEF00]
      || endpoint.clusters[61184];

    if (!tuyaCluster) {
      this.device.log('[TIME-SYNC] ⚠️  No Tuya cluster - device may use ZCL Time instead');
    } else {
      this.device.log('[TIME-SYNC] ✅ Tuya cluster found');
      this.tuyaCluster = tuyaCluster;
    }

    this.endpoint = endpoint;
    this.zclNode = zclNode;

    // Listen for time sync requests from device (CRITICAL - primary method)
    this.setupTimeSyncListener();

    // v5.5.619: Also listen for ZCL Time cluster requests
    this.setupZCLTimeListener(zclNode);

    // v5.5.623: Schedule INTELLIGENT delayed sync (fallback for devices that don't ask)
    this._scheduleIntelligentSync();

    this.device.log('[TIME-SYNC] ✅ Ready - listening for requests + delayed sync in 15 min');

    return true;
  }

  /**
   * v5.5.623: Schedule intelligent delayed time sync
   * - Waits 15 minutes after device init
   * - Only pushes if device hasn't requested time yet
   * - Single push, not repeated (device should ask if needed again)
   */
  _scheduleIntelligentSync() {
    // Cancel any existing timer
    if (this._intelligentSyncTimer) {
      clearTimeout(this._intelligentSyncTimer);
    }

    const delayMs = TuyaTimeSyncManager.INTELLIGENT_DELAY_MS;
    const delayMin = Math.round(delayMs / 60000);

    this.device.log(`[TIME-SYNC] ⏰ Scheduling intelligent sync in ${delayMin} minutes...`);

    this._intelligentSyncTimer = setTimeout(async () => {
      try {
        // Only push if device hasn't already requested time
        if (this._deviceRequestedTime) {
          this.device.log('[TIME-SYNC] ⏭️ Skipping intelligent sync - device already requested time');
          return;
        }

        this.device.log('[TIME-SYNC] 🔄 INTELLIGENT SYNC: Pushing time after 15 min (device did not request)');
        await this.sendTimeSync();
        this.device.log('[TIME-SYNC] ✅ Intelligent sync completed');

      } catch (err) {
        this.device.log(`[TIME-SYNC] ⚠️ Intelligent sync failed: ${err.message}`);
      }
    }, delayMs);
  }

  /**
   * Setup listener for device time sync requests - v5.5.620
   * 
   * HANDLES 2 CASES:
   * 1. EXPLICIT time request (cmd 0x24)
   * 2. IMPLICIT time in MCU FULL SYNC (cmd 0x01, 0x02, 0x03)
   * 
   * Per Z2M/HA research: Some devices don't ask for time explicitly,
   * they request "give me everything" and expect time in response.
   */
  setupTimeSyncListener() {
    try {
      // MCU FULL SYNC commands that implicitly require time
      const MCU_SYNC_COMMANDS = {
        0x01: 'mcuVersionRsp/heartbeat',
        0x02: 'dataQuery/statusSync',
        0x03: 'dataReport/stateUpdate',
        0x24: 'mcuSyncTime (explicit)'
      };

      // Listen for EF00 frames
      if (this.endpoint && typeof this.endpoint.on === 'function') {
        this.endpoint.on('frame', async (frame) => {
          if (frame.cluster === 0xEF00) {
            const cmdName = MCU_SYNC_COMMANDS[frame.command];
            
            if (frame.command === 0x24) {
              // EXPLICIT time request
              this.device.log('[TIME-SYNC] 📥 EXPLICIT TIME REQUEST (cmd 0x24)');
              this._deviceRequestedTime = true; // v5.5.623: Mark device requested
              await this.sendTimeSync();
            } else if (frame.command === 0x01 || frame.command === 0x02) {
              // MCU FULL SYNC - time is IMPLICIT
              this.device.log(`[TIME-SYNC] 📥 MCU FULL SYNC (${cmdName}) - sending time implicitly`);
              this._deviceRequestedTime = true; // v5.5.623: Mark device requested
              await this.sendTimeSync();
            }
          }
        });
        this.device.log('[TIME-SYNC] ✅ Listening for EF00 (explicit + implicit MCU sync)');
      }

      // Listen via Tuya cluster events
      if (this.tuyaCluster && typeof this.tuyaCluster.on === 'function') {
        // Explicit time request
        this.tuyaCluster.on('mcuSyncTime', async (data) => {
          this.device.log('[TIME-SYNC] 📥 mcuSyncTime request:', data);
          this._deviceRequestedTime = true; // v5.5.623
          await this.sendTimeSync();
        });

        // MCU version/heartbeat (implicit time expected)
        this.tuyaCluster.on('mcuVersionRsp', async (data) => {
          this.device.log('[TIME-SYNC] 📥 MCU heartbeat - sending time implicitly');
          this._deviceRequestedTime = true; // v5.5.623
          await this.sendTimeSync();
        });

        // Data query (implicit time expected)
        this.tuyaCluster.on('dataQuery', async (data) => {
          this.device.log('[TIME-SYNC] 📥 Data query - sending time implicitly');
          this._deviceRequestedTime = true; // v5.5.623
          await this.sendTimeSync();
        });

        // Generic command handler
        this.tuyaCluster.on('command', async (commandId, data) => {
          const cmdName = MCU_SYNC_COMMANDS[commandId];
          if (cmdName) {
            this.device.log(`[TIME-SYNC] 📥 Command 0x${commandId.toString(16)} (${cmdName})`);
            this._deviceRequestedTime = true; // v5.5.623
            await this.sendTimeSync();
          }
        });

        this.device.log('[TIME-SYNC] ✅ Listening for Tuya cluster events (explicit + implicit)');
      }

      // Listen via TuyaEF00Manager if available
      if (this.device.tuyaEF00Manager?.on) {
        this.device.tuyaEF00Manager.on('timeSyncRequest', async () => {
          this.device.log('[TIME-SYNC] 📥 Time sync via manager');
          this._deviceRequestedTime = true; // v5.5.623
          await this.sendTimeSync();
        });
        
        // v5.5.620: MCU sync events
        this.device.tuyaEF00Manager.on('mcuSync', async () => {
          this.device.log('[TIME-SYNC] 📥 MCU sync via manager - sending time');
          this._deviceRequestedTime = true; // v5.5.623
          await this.sendTimeSync();
        });
      }
    } catch (err) {
      this.device.log('[TIME-SYNC] ⚠️  Listener setup failed:', err.message);
    }
  }

  /**
   * v5.5.619: Listen for ZCL Time Cluster (0x000A) requests
   * Some devices use standard ZCL instead of Tuya EF00
   */
  setupZCLTimeListener(zclNode) {
    try {
      for (const epId of Object.keys(zclNode.endpoints || {})) {
        const ep = zclNode.endpoints[epId];
        const timeCluster = ep.clusters?.time || ep.clusters?.[0x000A] || ep.clusters?.[10];

        if (timeCluster && typeof timeCluster.on === 'function') {
          this.device.log(`[TIME-SYNC] 📡 Found ZCL Time cluster on EP${epId}`);

          // Listen for readAttributes (device asking for time)
          timeCluster.on('readAttributes', async (attrs) => {
            this.device.log('[TIME-SYNC] 📥 ZCL Time readAttributes:', attrs);
            await this.sendZCLTimeResponse(timeCluster);
          });

          this.device.log('[TIME-SYNC] ✅ Listening for ZCL Time requests');
        }
      }
    } catch (err) {
      this.device.log('[TIME-SYNC] ⚠️  ZCL Time listener failed:', err.message);
    }
  }

  /**
   * v5.5.619: Send ZCL Time response (Epoch 2000, not Unix 1970)
   */
  async sendZCLTimeResponse(timeCluster) {
    try {
      const ZIGBEE_EPOCH = 946684800; // 2000-01-01 00:00:00 UTC
      const now = Math.floor(Date.now() / 1000);
      const zigbeeTime = now - ZIGBEE_EPOCH;

      this.device.log(`[TIME-SYNC] 📤 ZCL Time: Unix=${now} → Zigbee=${zigbeeTime}`);

      await timeCluster.writeAttributes({
        time: zigbeeTime,
        timeStatus: 0b00000011 // Master + Synchronized
      });

      this.device.log('[TIME-SYNC] ✅ ZCL Time response sent');
    } catch (err) {
      this.device.log('[TIME-SYNC] ⚠️  ZCL Time response failed:', err.message);
    }
  }

  /**
   * Send time synchronization to device - v5.5.619
   * 
   * RESPONSE TO DEVICE REQUEST (not proactive push)
   * 
   * Format options (device-dependent):
   * - 8 bytes: [UTC:4 BE][Local:4 BE]
   * - 9 bytes: [UTC:4 BE][TZ:4 BE][DST:1]
   * 
   * UTC = Unix timestamp (seconds since 1970)
   * TZ = Timezone offset in seconds (GMT+1 = +3600)
   * DST = Daylight saving flag (0=winter, 1=summer)
   */
  async sendTimeSync() {
    if (!this.syncEnabled) {
      this.device.log('[TIME-SYNC] ℹ️  Sync disabled');
      return false;
    }

    try {
      const now = new Date();

      // Calculate timestamps
      const utcTimestamp = Math.floor(now.getTime() / 1000);
      const timezoneOffsetSec = -now.getTimezoneOffset() * 60; // GMT+1 = +3600, GMT+2 = +7200
      const localTimestamp = utcTimestamp + timezoneOffsetSec;

      // v5.5.619: Detect DST (Daylight Saving Time)
      const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
      const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
      const isDST = now.getTimezoneOffset() < Math.max(jan, jul) ? 1 : 0;

      this.device.log('[TIME-SYNC] 📤 RESPONDING TO DEVICE REQUEST...');
      this.device.log(`[TIME-SYNC]    UTC: ${new Date(utcTimestamp * 1000).toISOString()}`);
      this.device.log(`[TIME-SYNC]    Local: ${now.toLocaleString()}`);
      this.device.log(`[TIME-SYNC]    Timezone: GMT${timezoneOffsetSec >= 0 ? '+' : ''}${timezoneOffsetSec / 3600}`);
      this.device.log(`[TIME-SYNC]    DST: ${isDST ? 'SUMMER' : 'WINTER'}`);

      // v5.5.619: Try 9-byte format first (with DST), fallback to 8-byte
      const payload9 = Buffer.alloc(9);
      payload9.writeUInt32BE(utcTimestamp, 0);      // UTC timestamp
      payload9.writeInt32BE(timezoneOffsetSec, 4);  // Timezone offset (signed)
      payload9.writeUInt8(isDST, 8);                // DST flag

      const payload8 = Buffer.alloc(8);
      payload8.writeUInt32BE(utcTimestamp, 0);      // UTC timestamp
      payload8.writeUInt32BE(localTimestamp, 4);    // Local timestamp

      this.device.log(`[TIME-SYNC]    Payload9: ${payload9.toString('hex')}`);
      this.device.log(`[TIME-SYNC]    Payload8: ${payload8.toString('hex')}`);

      // v5.5.619: Send via multiple methods, try 8-byte format (most compatible)
      let sent = false;
      const payload = payload8; // Use 8-byte format for compatibility

      // Method 1: Use TuyaEF00Manager if available
      if (this.device.tuyaEF00Manager?.sendCommand) {
        try {
          await this.device.tuyaEF00Manager.sendCommand(0x24, payload);
          sent = true;
          this.device.log('[TIME-SYNC] ✅ Response sent via TuyaEF00Manager');
        } catch (e) {
          this.device.log('[TIME-SYNC] TuyaEF00Manager failed:', e.message);
        }
      }

      // Method 2: Direct cluster command
      if (!sent && this.tuyaCluster) {
        try {
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
          if (sent) this.device.log('[TIME-SYNC] ✅ Response sent via cluster');
        } catch (e) {
          this.device.log('[TIME-SYNC] Cluster failed:', e.message);
        }
      }

      // Method 3: Raw frame
      if (!sent && this.endpoint?.sendFrame) {
        try {
          await this.endpoint.sendFrame(0xEF00, payload, 0x24);
          sent = true;
          this.device.log('[TIME-SYNC] ✅ Response sent via raw frame');
        } catch (e) {
          this.device.log('[TIME-SYNC] Raw frame failed:', e.message);
        }
      }

      if (!sent) {
        this.device.log('[TIME-SYNC] ❌ No method available - device may need re-pair');
        return false;
      }

      this.device.log('[TIME-SYNC] ✅ TIME SYNC RESPONSE COMPLETE');
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
   * v5.5.619: REMOVED proactive daily sync
   * Per Z2M/HA research: Device should REQUEST time, we should NOT push
   * Keeping method for backward compatibility but it does nothing
   */
  scheduleDailySync() {
    // v5.5.619: DISABLED - Don't push time proactively
    // Device will request time when it needs it
    this.device.log('[TIME-SYNC] ℹ️  Daily sync DISABLED (passive mode - wait for device request)');
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
