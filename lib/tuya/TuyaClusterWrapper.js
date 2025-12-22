'use strict';

/**
 * TuyaClusterWrapper - v5.3.15
 *
 * Correct implementation of Tuya EF00 cluster for Homey SDK3
 *
 * CRITICAL: Homey SDK3 does NOT natively support:
 * - Cluster 0xEF00 (Tuya specific)
 * - dataRequest method
 * - DP parsing
 *
 * This wrapper provides:
 * - Proper cluster binding
 * - DP frame parsing
 * - Time sync
 * - GET/SET DP commands
 */

const { EventEmitter } = require('events');

// Tuya command IDs
const TUYA_CMD = {
  SET_DP: 0x00,       // Set datapoint
  GET_DP: 0x01,       // Get datapoint (not always supported)
  DP_REPORT: 0x01,    // Datapoint report (from device)
  DP_QUERY: 0x02,     // Query all datapoints
  TIME_SYNC: 0x24,    // Time synchronization request
  TIME_SYNC_2: 0x67,  // Alternative time sync
};

// Tuya DP types
const DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,   // 4 bytes, big endian
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05,
};

class TuyaClusterWrapper extends EventEmitter {

  constructor(device) {
    super();
    this.device = device;
    this.zclNode = null;
    this.cluster = null;
    this.endpoint = null;
    this.seqNum = 0;
    this.initialized = false;
    this.passiveMode = false;

    // DP value cache
    this.dpCache = new Map();
    this.lastUpdate = null;
  }

  /**
   * Initialize the Tuya cluster wrapper
   * MUST be called in onNodeInit AFTER zclNode is available
   */
  async initialize(zclNode) {
    if (this.initialized) {
      this.device.log('[TUYA-WRAPPER] Already initialized, skipping');
      return true;
    }

    this.zclNode = zclNode;

    if (!zclNode?.endpoints?.[1]) {
      this.device.log('[TUYA-WRAPPER] No endpoint 1 found');
      return false;
    }

    this.endpoint = zclNode.endpoints[1];

    // Try to find Tuya cluster with various names
    this.cluster = this._findTuyaCluster();

    if (!this.cluster) {
      this.device.log('[TUYA-WRAPPER] ⚠️ Tuya cluster 0xEF00 not found');
      this.device.log('[TUYA-WRAPPER] Available clusters:', Object.keys(this.endpoint.clusters || {}));

      // Enable passive mode - listen for raw frames
      this.passiveMode = true;
      this._setupPassiveListener();
      return true;
    }

    this.device.log('[TUYA-WRAPPER] ✅ Tuya cluster found');

    // Setup command listener
    await this._setupCommandListener();

    // Try to bind cluster
    await this._bindCluster();

    this.initialized = true;
    this.device.log('[TUYA-WRAPPER] ✅ Initialization complete');

    return true;
  }

  /**
   * Find Tuya cluster with various possible names
   */
  _findTuyaCluster() {
    const clusters = this.endpoint?.clusters;
    if (!clusters) return null;

    // Try all possible names
    return clusters.tuya
      || clusters.tuyaSpecific
      || clusters.tuyaManufacturer
      || clusters.manuSpecificTuya
      || clusters['manuSpecificTuya']
      || clusters[0xEF00]
      || clusters['0xEF00']
      || clusters[61184]
      || clusters['61184'];
  }

  /**
   * Setup command listener on the cluster
   */
  async _setupCommandListener() {
    if (!this.cluster) return;

    try {
      // Listen for incoming commands (DP reports)
      this.cluster.on('command', (commandId, payload) => {
        this._handleCommand(commandId, payload);
      });

      // Also listen for 'attr' events
      if (typeof this.cluster.on === 'function') {
        this.cluster.on('attr', (attr, value) => {
          this.device.log(`[TUYA-WRAPPER] Attr: ${attr} = ${JSON.stringify(value)}`);
        });
      }

      this.device.log('[TUYA-WRAPPER] ✅ Command listener registered');
    } catch (err) {
      this.device.error('[TUYA-WRAPPER] Failed to setup listener:', err.message);
    }
  }

  /**
   * Setup passive listener for raw Zigbee frames
   * Used when cluster isn't properly exposed
   */
  _setupPassiveListener() {
    try {
      this.device.log('[TUYA-WRAPPER] 📡 Setting up passive frame listener...');

      // Listen on the node level for any incoming data
      if (this.zclNode && typeof this.zclNode.on === 'function') {
        this.zclNode.on('frame', (frame) => {
          this._handleRawFrame(frame);
        });
      }

      // Also try endpoint level
      if (this.endpoint) {
        // Some SDK versions expose 'handleFrame'
        const originalHandler = this.endpoint.handleFrame;
        if (typeof originalHandler === 'function') {
          this.endpoint.handleFrame = (clusterId, frame, meta) => {
            if (clusterId === 0xEF00 || clusterId === 61184) {
              this._handleRawFrame(frame);
            }
            return originalHandler.call(this.endpoint, clusterId, frame, meta);
          };
        }
      }

      this.device.log('[TUYA-WRAPPER] ✅ Passive listener configured');
    } catch (err) {
      this.device.error('[TUYA-WRAPPER] Passive listener setup failed:', err.message);
    }
  }

  /**
   * Bind the cluster to receive reports
   */
  async _bindCluster() {
    try {
      if (this.cluster && typeof this.cluster.bind === 'function') {
        await this.cluster.bind();
        this.device.log('[TUYA-WRAPPER] ✅ Cluster bound');
      }
    } catch (err) {
      // Binding often fails for Tuya devices - this is normal
      this.device.log('[TUYA-WRAPPER] Cluster bind skipped (normal for Tuya):', err.message);
    }
  }

  /**
   * Handle incoming command from Tuya cluster
   */
  _handleCommand(commandId, payload) {
    try {
      this.device.log(`[TUYA-WRAPPER] 📥 Command 0x${commandId.toString(16)}, payload:`,
        Buffer.isBuffer(payload) ? payload.toString('hex') : JSON.stringify(payload));

      // Handle time sync request
      if (commandId === TUYA_CMD.TIME_SYNC || commandId === TUYA_CMD.TIME_SYNC_2) {
        this._handleTimeSyncRequest();
        return;
      }

      // Parse DP report
      if (commandId === TUYA_CMD.DP_REPORT || commandId === 0x02) {
        this._parseDPReport(payload);
      }
    } catch (err) {
      this.device.error('[TUYA-WRAPPER] Command handling error:', err.message);
    }
  }

  /**
   * Handle raw frame (passive mode)
   */
  _handleRawFrame(frame) {
    try {
      if (!Buffer.isBuffer(frame)) return;

      this.device.log('[TUYA-WRAPPER] 📡 Raw frame:', frame.toString('hex'));

      // Try to parse as Tuya DP frame
      this._parseDPReport(frame);
    } catch (err) {
      // Ignore parse errors for non-Tuya frames
    }
  }

  /**
   * Parse Tuya DP report frame
   * Frame format: [status:1][transId:1][dp:1][type:1][len:2][data:len]
   */
  _parseDPReport(payload) {
    try {
      let buffer = Buffer.isBuffer(payload) ? payload :
        (payload?.data ? Buffer.from(payload.data) : null);

      if (!buffer || buffer.length < 6) return;

      let offset = 0;

      // Skip status and transId if present
      if (buffer.length > 7 && buffer[0] < 10) {
        offset = 2;
      }

      while (offset + 4 <= buffer.length) {
        const dp = buffer.readUInt8(offset);
        const dpType = buffer.readUInt8(offset + 1);
        const dataLen = buffer.readUInt16BE(offset + 2);

        if (offset + 4 + dataLen > buffer.length) break;

        const dataBuffer = buffer.slice(offset + 4, offset + 4 + dataLen);
        const value = this._parseValue(dpType, dataBuffer);

        this.device.log(`[TUYA-WRAPPER] 📊 DP${dp}: type=${dpType}, len=${dataLen}, value=${JSON.stringify(value)}`);

        // Cache the value
        this.dpCache.set(dp, { value, type: dpType, timestamp: Date.now() });
        this.lastUpdate = Date.now();

        // Emit event
        this.emit('dp', { dp, type: dpType, value, raw: dataBuffer });
        this.emit(`dp-${dp}`, value);

        offset += 4 + dataLen;
      }
    } catch (err) {
      this.device.error('[TUYA-WRAPPER] DP parse error:', err.message);
    }
  }

  /**
   * Parse value based on DP type
   */
  _parseValue(dpType, buffer) {
    switch (dpType) {
    case DP_TYPE.BOOL:
      return buffer.length > 0 ? buffer.readUInt8(0) === 1 : false;

    case DP_TYPE.VALUE:
      if (buffer.length >= 4) return buffer.readInt32BE(0);
      if (buffer.length >= 2) return buffer.readInt16BE(0);
      return buffer.readUInt8(0);

    case DP_TYPE.STRING:
      return buffer.toString('utf8');

    case DP_TYPE.ENUM:
      return buffer.readUInt8(0);

    case DP_TYPE.BITMAP:
      if (buffer.length >= 4) return buffer.readUInt32BE(0);
      if (buffer.length >= 2) return buffer.readUInt16BE(0);
      return buffer.readUInt8(0);

    case DP_TYPE.RAW:
    default:
      return buffer;
    }
  }

  /**
   * Handle time sync request from device
   */
  _handleTimeSyncRequest() {
    this.device.log('[TUYA-WRAPPER] ⏰ Device requested time sync');
    this.sendTimeSync().catch(err => {
      this.device.log('[TUYA-WRAPPER] Time sync send failed:', err.message);
    });
  }

  /**
   * Send time synchronization to device
   */
  async sendTimeSync() {
    const now = new Date();

    // Tuya time format: UTC offset + local time
    const utcTime = Math.floor(now.getTime() / 1000);
    const localTime = utcTime + (now.getTimezoneOffset() * -60);

    const payload = Buffer.alloc(8);
    payload.writeUInt32BE(utcTime, 0);
    payload.writeUInt32BE(localTime, 4);

    this.device.log('[TUYA-WRAPPER] ⏰ Sending time sync...');

    return this._sendCommand(TUYA_CMD.TIME_SYNC, payload);
  }

  /**
   * Set a DP value
   */
  async setDP(dp, type, value) {
    this.device.log(`[TUYA-WRAPPER] 📤 Setting DP${dp} = ${value} (type=${type})`);

    const dataBuffer = this._encodeValue(type, value);

    const payload = Buffer.alloc(4 + dataBuffer.length);
    payload.writeUInt8(dp, 0);
    payload.writeUInt8(type, 1);
    payload.writeUInt16BE(dataBuffer.length, 2);
    dataBuffer.copy(payload, 4);

    return this._sendCommand(TUYA_CMD.SET_DP, payload);
  }

  /**
   * Query all DPs (some devices support this)
   */
  async queryAllDPs() {
    this.device.log('[TUYA-WRAPPER] 🔍 Querying all DPs...');
    return this._sendCommand(TUYA_CMD.DP_QUERY, Buffer.alloc(0));
  }

  /**
   * Encode value for sending
   */
  _encodeValue(type, value) {
    switch (type) {
    case DP_TYPE.BOOL:
      return Buffer.from([value ? 1 : 0]);

    case DP_TYPE.VALUE: {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(value, 0);
      return buf;
    }

    case DP_TYPE.STRING:
      return Buffer.from(String(value), 'utf8');

    case DP_TYPE.ENUM:
      return Buffer.from([value]);

    case DP_TYPE.BITMAP: {
      const buf = Buffer.alloc(4);
      buf.writeUInt32BE(value, 0);
      return buf;
    }

    default:
      return Buffer.isBuffer(value) ? value : Buffer.from([value]);
    }
  }

  /**
   * Send command to Tuya cluster
   */
  async _sendCommand(commandId, payload) {
    if (!this.cluster) {
      throw new Error('Tuya cluster not available');
    }

    const seqNum = this.seqNum++;

    // Build full frame with sequence number
    const frame = Buffer.alloc(2 + payload.length);
    frame.writeUInt8(0x00, 0);  // Status
    frame.writeUInt8(seqNum & 0xFF, 1);
    payload.copy(frame, 2);

    try {
      // Try different send methods
      if (typeof this.cluster.command === 'function') {
        await this.cluster.command(commandId, frame);
        return true;
      }

      if (typeof this.cluster.writeAttribute === 'function') {
        await this.cluster.writeAttribute('data', frame);
        return true;
      }

      // Direct ZCL command
      if (this.endpoint && typeof this.endpoint.command === 'function') {
        await this.endpoint.command(0xEF00, commandId, frame);
        return true;
      }

      throw new Error('No send method available');
    } catch (err) {
      this.device.error('[TUYA-WRAPPER] Send failed:', err.message);
      return false;
    }
  }

  /**
   * Get cached DP value
   */
  getCachedDP(dp) {
    return this.dpCache.get(dp)?.value;
  }

  /**
   * Check if we have received any data
   */
  hasReceivedData() {
    return this.dpCache.size > 0;
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate() {
    return this.lastUpdate;
  }
}

// Export constants
TuyaClusterWrapper.CMD = TUYA_CMD;
TuyaClusterWrapper.DP_TYPE = DP_TYPE;

module.exports = TuyaClusterWrapper;
