'use strict';

const TuyaTimeSyncFormats = require('./TuyaTimeSyncFormats');
const { TIME_FORMAT, TUYA_EPOCH_OFFSET } = TuyaTimeSyncFormats;

/**
 * TUYA TIME SYNCHRONIZATION MANAGER - v5.7.50
 *
 * STRATEGY (hybrid approach):
 * ❌ NO immediate push at init (causes device confusion)
 * ✅ RESPOND to device-initiated requests (primary)
 * ✅ INTELLIGENT delayed push after 15 min (fallback for devices that don't ask)
 * ✅ AUTO-DETECT format based on manufacturer/model (v5.7.50)
 *
 * v5.7.50: Universal format support via TuyaTimeSyncFormats
 * v5.5.960: CRITICAL FIX - Sequence number must be echoed in response!
 * 
 * Protocol (from Tuya docs + Z2M research):
 * - Device → Host: Command 0x24, Payload: [seqHi:1][seqLo:1] (2-byte request ID)
 * - Host → Device: Command 0x24, Payload: [seqHi:1][seqLo:1][UTC:4 BE][Local:4 BE] (10 bytes)
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
    this._detectedFormat = null; // v5.7.50: Auto-detected format
  }

  /**
   * v5.7.50: Get manufacturer name from device
   */
  _getManufacturerName() {
    return this.device.getSetting?.('zb_manufacturer_name')
      || this.device.getStoreValue?.('zb_manufacturer_name')
      || this.device.getStoreValue?.('manufacturerName')
      || '';
  }

  /**
   * v5.7.50: Get model ID from device
   */
  _getModelId() {
    return this.device.getSetting?.('zb_model_id')
      || this.device.getStoreValue?.('zb_model_id')
      || this.device.getStoreValue?.('modelId')
      || '';
  }

  /**
   * v5.7.50: Detect best time format for this device
   */
  _detectFormat() {
    if (this._detectedFormat) return this._detectedFormat;
    
    const mfr = this._getManufacturerName();
    const model = this._getModelId();
    
    this._detectedFormat = TuyaTimeSyncFormats.detectFormat(mfr, model);
    this.device.log(`[TIME-SYNC] 🔍 Detected format: ${this._detectedFormat} (mfr=${mfr}, model=${model})`);
    
    return this._detectedFormat;
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
              // v5.5.960: Extract sequence number from frame payload
              let seqNum = 0;
              if (frame.data && Buffer.isBuffer(frame.data) && frame.data.length >= 2) {
                seqNum = frame.data.readUInt16BE(0);
              } else if (frame.payload && Buffer.isBuffer(frame.payload) && frame.payload.length >= 2) {
                seqNum = frame.payload.readUInt16BE(0);
              }
              
              this.device.log(`[TIME-SYNC] 📥 EXPLICIT TIME REQUEST (cmd 0x24), seq=0x${seqNum.toString(16).padStart(4, '0')}`);
              this._deviceRequestedTime = true; // v5.5.623: Mark device requested
              await this.sendTimeSync(seqNum);
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
        // Explicit time request - v5.5.960: Extract and echo sequence number
        this.tuyaCluster.on('mcuSyncTime', async (data) => {
          this.device.log('[TIME-SYNC] 📥 mcuSyncTime request:', JSON.stringify(data));
          this._deviceRequestedTime = true; // v5.5.623
          
          // v5.5.960: Extract sequence number from request
          const seqNum = data?.sequenceNumber ?? data?.payloadSize ?? 0;
          this.device.log(`[TIME-SYNC] 📥 Extracted sequence: 0x${seqNum.toString(16).padStart(4, '0')}`);
          
          await this.sendTimeSync(seqNum);
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
        // v5.5.960: Extract sequence number from time sync request
        this.device.tuyaEF00Manager.on('timeSyncRequest', async (data) => {
          this.device.log('[TIME-SYNC] 📥 Time sync via manager:', JSON.stringify(data));
          this._deviceRequestedTime = true; // v5.5.623
          const seqNum = data?.sequenceNumber ?? data?.seq ?? 0;
          await this.sendTimeSync(seqNum);
        });
        
        // v5.5.620: MCU sync events
        this.device.tuyaEF00Manager.on('mcuSync', async (data) => {
          this.device.log('[TIME-SYNC] 📥 MCU sync via manager - sending time');
          this._deviceRequestedTime = true; // v5.5.623
          const seqNum = data?.sequenceNumber ?? data?.seq ?? 0;
          await this.sendTimeSync(seqNum);
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
   * Send time synchronization to device - v5.7.50
   * 
   * RESPONSE TO DEVICE REQUEST (not proactive push)
   * 
   * v5.7.50: Auto-detect format based on manufacturer/model
   * v5.5.960: CRITICAL FIX - Must include sequence number from device request!
   * 
   * Format (from Tuya docs + Z2M research):
   * - 10 bytes: [seqHi:1][seqLo:1][UTC:4 BE][Local:4 BE]
   * 
   * The sequence number MUST be echoed from the device's request!
   * Without the correct sequence, the device ignores the response.
   * 
   * UTC = Unix timestamp (seconds since 1970)
   * Local = UTC + timezone offset
   * 
   * @param {number} sequenceNumber - Sequence number from device request (optional)
   * @param {string} forceFormat - Force specific format (optional, for testing)
   */
  async sendTimeSync(sequenceNumber = null, forceFormat = null) {
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

      // v5.5.960: Use sequence number from device request, or generate one
      const seqNum = (sequenceNumber !== null && sequenceNumber !== undefined) 
        ? sequenceNumber 
        : (this._lastSeqNum || 0);
      
      // Store for next time if needed
      this._lastSeqNum = (seqNum + 1) & 0xFFFF;

      // v5.7.50: Auto-detect format or use forced format
      const format = forceFormat || this._detectFormat();
      const formatDesc = TuyaTimeSyncFormats.getFormatDescription(format);

      this.device.log('[TIME-SYNC] 📤 RESPONDING TO DEVICE REQUEST...');
      this.device.log(`[TIME-SYNC]    Format: ${format} (${formatDesc})`);
      this.device.log(`[TIME-SYNC]    Sequence: 0x${seqNum.toString(16).padStart(4, '0')}`);
      this.device.log(`[TIME-SYNC]    UTC: ${new Date(utcTimestamp * 1000).toISOString()}`);
      this.device.log(`[TIME-SYNC]    Local: ${now.toLocaleString()}`);
      this.device.log(`[TIME-SYNC]    Timezone: GMT${timezoneOffsetSec >= 0 ? '+' : ''}${timezoneOffsetSec / 3600}`);
      this.device.log(`[TIME-SYNC]    DST: ${isDST ? 'SUMMER' : 'WINTER'}`);

      // v5.7.50: Build format-specific payload using TuyaTimeSyncFormats
      const formatPayload = TuyaTimeSyncFormats.buildPayload(format, { timezone: 'auto' });
      this.device.log(`[TIME-SYNC]    Format payload: ${formatPayload.toString('hex')}`);

      // v5.5.960: CRITICAL FIX - Build 10-byte payload WITH sequence number
      // Format: [seqHi:1][seqLo:1][UTC:4 BE][Local:4 BE]
      // This is the format documented in Tuya protocol and used by Z2M!
      const payload10 = Buffer.alloc(10);
      payload10.writeUInt16BE(seqNum, 0);           // Sequence number (MUST echo from request!)
      payload10.writeUInt32BE(utcTimestamp, 2);     // UTC timestamp
      payload10.writeUInt32BE(localTimestamp, 6);   // Local timestamp

      // Legacy 8-byte format (fallback for some older devices)
      const payload8 = Buffer.alloc(8);
      payload8.writeUInt32BE(utcTimestamp, 0);      // UTC timestamp
      payload8.writeUInt32BE(localTimestamp, 4);    // Local timestamp

      this.device.log(`[TIME-SYNC]    Payload10 (with seq): ${payload10.toString('hex')}`);
      this.device.log(`[TIME-SYNC]    Payload8 (legacy): ${payload8.toString('hex')}`);

      // v5.5.960: Try 10-byte format first (correct format with sequence)
      let sent = false;
      const payload = payload10; // Use 10-byte format with sequence number

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

      // Method 2: Direct cluster command - v5.5.960 with 10-byte payload
      if (!sent && this.tuyaCluster) {
        try {
          if (typeof this.tuyaCluster.mcuSyncTime === 'function') {
            // v5.5.960: Use 10-byte payload with sequence number
            await this.tuyaCluster.mcuSyncTime({ 
              payloadSize: payload.length, 
              payload: [...payload] 
            });
            sent = true;
          } else if (typeof this.tuyaCluster.command === 'function') {
            await this.tuyaCluster.command('mcuSyncTime', {
              payloadSize: payload.length,
              payload: [...payload],
            }, { disableDefaultResponse: true });
            sent = true;
          }
          if (sent) this.device.log('[TIME-SYNC] ✅ Response sent via cluster (10-byte with seq)');
        } catch (e) {
          this.device.log('[TIME-SYNC] Cluster failed:', e.message);
          
          // v5.5.960: Fallback to 8-byte format for older devices
          try {
            if (typeof this.tuyaCluster.mcuSyncTime === 'function') {
              await this.tuyaCluster.mcuSyncTime({ 
                payloadSize: payload8.length, 
                payload: [...payload8] 
              });
              sent = true;
              this.device.log('[TIME-SYNC] ✅ Fallback: Response sent via cluster (8-byte legacy)');
            }
          } catch (e2) {
            this.device.log('[TIME-SYNC] 8-byte fallback also failed:', e2.message);
          }
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
   * v5.7.50: Send time using specific format from TuyaTimeSyncFormats
   * @param {string} format - TIME_FORMAT constant (e.g., 'tuya_standard', 'tuya_dual_2000')
   */
  async sendFormattedTimeSync(format) {
    try {
      const payload = TuyaTimeSyncFormats.buildPayload(format, { timezone: 'auto' });
      const formatDesc = TuyaTimeSyncFormats.getFormatDescription(format);

      this.device.log(`[TIME-SYNC] 📤 Sending formatted time sync (${format})...`);
      this.device.log(`[TIME-SYNC]    Format: ${formatDesc}`);
      this.device.log(`[TIME-SYNC]    Payload: ${payload.toString('hex')}`);

      // Determine DP type based on format
      const dpType = format.includes('dual') || format.includes('zigbee') ? 0x02 : 0x00; // VALUE or RAW

      if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.sendTuyaDP(103, dpType, payload); // DP 103 = time sync
        this.device.log('[TIME-SYNC] ✅ Formatted time sent via DP 103');
        return true;
      }

      // Fallback: send via cluster command
      if (this.tuyaCluster && typeof this.tuyaCluster.command === 'function') {
        await this.tuyaCluster.command('mcuSyncTime', {
          payloadSize: payload.length,
          payload: [...payload],
        }, { disableDefaultResponse: true });
        this.device.log('[TIME-SYNC] ✅ Formatted time sent via cluster');
        return true;
      }

      return false;
    } catch (err) {
      this.device.error(`[TIME-SYNC] ❌ Formatted sync failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Send date/time in alternative format (7-byte payload)
   * Used by some devices like climate sensors with display
   * v5.7.50: Now uses TuyaTimeSyncFormats internally
   */
  async sendDateTimeSync() {
    try {
      // v5.7.50: Use TuyaTimeSyncFormats for building payload
      const payload = TuyaTimeSyncFormats.buildPayload(TIME_FORMAT.TUYA_STANDARD, { timezone: 'auto' });
      const now = new Date();

      this.device.log('[TIME-SYNC] 📤 Sending date/time sync (7-byte)...');
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
   * v5.7.50: Get detected format for this device
   */
  getDetectedFormat() {
    return this._detectFormat();
  }

  /**
   * v5.7.50: Get device intelligence level
   */
  getDeviceIntelligence() {
    const mfr = this._getManufacturerName();
    return TuyaTimeSyncFormats.getDeviceIntelligence(mfr);
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
      this.dailySyncTimer = null;
    }
    if (this._intelligentSyncTimer) {
      clearTimeout(this._intelligentSyncTimer);
      this._intelligentSyncTimer = null;
    }

    this.device.log('[TIME-SYNC] 🛑 Stopped');
  }
}

// Export class and format constants for external use
module.exports = TuyaTimeSyncManager;
module.exports.TIME_FORMAT = TIME_FORMAT;
module.exports.TuyaTimeSyncFormats = TuyaTimeSyncFormats;
