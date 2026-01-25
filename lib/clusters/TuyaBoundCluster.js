'use strict';

const { BoundCluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaBoundCluster - v5.5.795 Enhanced Raw Data Handling
 *
 * BoundCluster for receiving Tuya DP data reports from TS0601 devices.
 *
 * WHY THIS IS NEEDED:
 * - Regular Cluster = Homey sends commands TO device
 * - BoundCluster = Device sends commands TO Homey
 *
 * TS0601 devices SEND dataReport commands (cmd 0x01/0x02) to Homey.
 * Without a BoundCluster, these reports are not processed!
 *
 * Sources:
 * - https://github.com/athombv/com.ikea.tradfri (BoundCluster pattern)
 * - https://github.com/athombv/homey-apps-sdk-issues/issues/157
 * - https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html
 * - https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md
 *
 * Tuya EF00 Protocol:
 * - Cluster ID: 0xEF00 (61184)
 * - Command 0x01: dataResponse (device responds to getData)
 * - Command 0x02: dataReport (device spontaneously reports data)
 * - Command 0x24: mcuSyncTime (device requests time sync)
 *
 * Frame format: [seq:2][dpId:1][dpType:1][len:2][data:len]
 */

// Tuya DP data types
const TUYA_DP_TYPE = {
  RAW: 0x00,    // Raw bytes
  BOOL: 0x01,   // Boolean (1 byte)
  VALUE: 0x02,  // Integer (4 bytes, big-endian)
  STRING: 0x03, // String (variable length)
  ENUM: 0x04,   // Enum (1 byte)
  BITMAP: 0x05, // Bitmap (1/2/4 bytes)
};

class TuyaBoundCluster extends BoundCluster {

  /**
   * Constructor
   * @param {Object} options
   * @param {Function} options.onDataReport - Called when device sends dataReport
   * @param {Function} options.onDataResponse - Called when device responds to getData
   * @param {Function} options.onMcuSyncTime - Called when device requests time sync
   * @param {Function} options.onRawFrame - v5.5.795: Called for unhandled raw frames
   */
  constructor({
    onDataReport,
    onDataResponse,
    onMcuSyncTime,
    onRawFrame,
    device,
  }) {
    super();
    this._onDataReport = onDataReport;
    this._onDataResponse = onDataResponse;
    this._onMcuSyncTime = onMcuSyncTime;
    this._onRawFrame = onRawFrame;
    this._device = device;
    this._frameLog = []; // v5.5.795: Store last frames for debugging
    this._maxFrameLog = 20;
  }

  /**
   * Log helper
   */
  log(...args) {
    if (this._device?.log) {
      this._device.log('[TUYA-BOUND]', ...args);
    } else {
      console.log('[TUYA-BOUND]', ...args);
    }
  }

  /**
   * Handle dataReport command (0x02)
   * Device spontaneously reports its current state
   */
  dataReport(payload) {
    this.log('📥 dataReport received:', JSON.stringify(payload));

    if (typeof this._onDataReport === 'function') {
      const parsed = this._parsePayload(payload);
      this._onDataReport(parsed);
    }
  }

  /**
   * Handle dataResponse command (0x01)
   * Device responds to a getData request
   */
  dataResponse(payload) {
    this.log('📥 dataResponse received:', JSON.stringify(payload));

    if (typeof this._onDataResponse === 'function') {
      const parsed = this._parsePayload(payload);
      this._onDataResponse(parsed);
    }
  }

  /**
   * Handle mcuSyncTime command (0x24)
   * Device requests time synchronization
   */
  mcuSyncTime(payload) {
    this.log('📥 mcuSyncTime request received');

    if (typeof this._onMcuSyncTime === 'function') {
      this._onMcuSyncTime(payload);
    }
  }

  /**
   * Handle activeStatusReport command (0x06)
   * Some devices use this instead of dataReport
   */
  activeStatusReport(payload) {
    this.log('📥 activeStatusReport received:', JSON.stringify(payload));

    // Treat same as dataReport
    if (typeof this._onDataReport === 'function') {
      const parsed = this._parsePayload(payload);
      this._onDataReport(parsed);
    }
  }

  /**
   * v5.5.795: Handle raw frames that don't match known commands
   * This catches any Tuya commands not explicitly defined
   */
  async handleFrame(frame, meta, rawFrame) {
    const cmdId = frame?.cmdId ?? frame?.commandId;
    
    this.log(`📥 Raw frame received: cmdId=0x${cmdId?.toString(16) || 'unknown'}`);
    
    // Store for debugging
    this._storeFrame(frame, meta, rawFrame);
    
    // Known command IDs that have explicit handlers
    const knownCommands = [0x01, 0x02, 0x06, 0x24];
    
    if (cmdId !== undefined && !knownCommands.includes(cmdId)) {
      this.log(`⚠️ Unknown command 0x${cmdId.toString(16)}, processing as raw`);
      
      // Try to parse as DP data anyway
      if (frame.data || rawFrame) {
        const data = frame.data || rawFrame;
        const parsed = this._parsePayload({ dpValues: data });
        
        if (parsed.datapoints.length > 0) {
          this.log(`✅ Extracted ${parsed.datapoints.length} DPs from unknown command`);
          if (typeof this._onDataReport === 'function') {
            this._onDataReport(parsed);
          }
        }
      }
      
      // Also notify raw frame handler if registered
      if (typeof this._onRawFrame === 'function') {
        this._onRawFrame({
          cmdId,
          frame,
          meta,
          rawFrame,
          timestamp: Date.now()
        });
      }
    }
    
    // Return null = no cluster-specific response needed
    return null;
  }

  /**
   * v5.5.795: Store frame for debugging
   */
  _storeFrame(frame, meta, rawFrame) {
    this._frameLog.push({
      timestamp: Date.now(),
      cmdId: frame?.cmdId ?? frame?.commandId,
      data: frame?.data?.toString?.('hex') || null,
      rawFrame: rawFrame?.toString?.('hex') || null,
      meta
    });
    
    if (this._frameLog.length > this._maxFrameLog) {
      this._frameLog.shift();
    }
  }

  /**
   * v5.5.795: Get stored frames for debugging
   */
  getFrameLog() {
    return [...this._frameLog];
  }

  /**
   * v5.5.795: Clear frame log
   */
  clearFrameLog() {
    this._frameLog = [];
  }

  /**
   * Parse Tuya payload into structured data
   * @param {Object} payload - Raw payload from device
   * @returns {Object} Parsed datapoints
   */
  _parsePayload(payload) {
    const result = {
      seq: payload.seq || 0,
      datapoints: [],
      raw: payload,
    };

    // dpValues can be Buffer or array
    let dpValues = payload.dpValues || payload.data || payload.dp;

    if (!dpValues) {
      this.log('⚠️ No dpValues in payload');
      return result;
    }

    // If it's already parsed (array of objects)
    if (Array.isArray(dpValues) && dpValues.length > 0 && typeof dpValues[0] === 'object') {
      result.datapoints = dpValues.map(dp => ({
        dp: dp.dp,
        dataType: dp.datatype || dp.dataType,
        value: this._parseValue(dp.data, dp.datatype || dp.dataType),
        raw: dp.data,
      }));
      return result;
    }

    // If it's a Buffer, parse it
    if (Buffer.isBuffer(dpValues)) {
      result.datapoints = this._parseBuffer(dpValues);
      return result;
    }

    // If it's a hex string
    if (typeof dpValues === 'string') {
      try {
        const buffer = Buffer.from(dpValues, 'hex');
        result.datapoints = this._parseBuffer(buffer);
      } catch (e) {
        this.log('⚠️ Failed to parse hex string:', e.message);
      }
      return result;
    }

    this.log('⚠️ Unknown dpValues format:', typeof dpValues);
    return result;
  }

  /**
   * Parse Buffer containing Tuya DPs
   * Format: [dpId:1][dpType:1][lenHi:1][lenLo:1][data:len]...
   */
  _parseBuffer(buffer) {
    const datapoints = [];
    let offset = 0;

    while (offset < buffer.length) {
      if (offset + 4 > buffer.length) break;

      const dp = buffer.readUInt8(offset);
      const dataType = buffer.readUInt8(offset + 1);
      const length = buffer.readUInt16BE(offset + 2);

      offset += 4;

      if (offset + length > buffer.length) break;

      const dataBuffer = buffer.slice(offset, offset + length);
      const value = this._parseValue(dataBuffer, dataType);

      datapoints.push({
        dp,
        dataType,
        value,
        raw: dataBuffer,
      });

      this.log(`📊 DP${dp}: type=${dataType}, len=${length}, value=${value}`);

      offset += length;
    }

    return datapoints;
  }

  /**
   * Parse value based on Tuya data type
   */
  _parseValue(data, dataType) {
    if (!Buffer.isBuffer(data)) {
      // If it's already a number/boolean/string, return as-is
      if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'string') {
        return data;
      }
      return data;
    }

    switch (dataType) {
    case TUYA_DP_TYPE.RAW:
      return data; // Return as Buffer

    case TUYA_DP_TYPE.BOOL:
      return data.readUInt8(0) === 1;

    case TUYA_DP_TYPE.VALUE:
      if (data.length === 4) return data.readInt32BE(0);
      if (data.length === 2) return data.readInt16BE(0);
      if (data.length === 1) return data.readInt8(0);
      return data.readInt32BE(0);

    case TUYA_DP_TYPE.STRING:
      return data.toString('utf8');

    case TUYA_DP_TYPE.ENUM:
      return data.readUInt8(0);

    case TUYA_DP_TYPE.BITMAP:
      if (data.length === 1) return data.readUInt8(0);
      if (data.length === 2) return data.readUInt16BE(0);
      if (data.length === 4) return data.readUInt32BE(0);
      return data.readUInt32BE(0);

    default:
      // Unknown type, try to read as value
      if (data.length === 4) return data.readInt32BE(0);
      if (data.length === 2) return data.readInt16BE(0);
      if (data.length === 1) return data.readUInt8(0);
      return data;
    }
  }

  /**
   * Cluster commands that the device can send TO Homey
   * These are the commands we need to handle
   */
  static get COMMANDS() {
    return {
      // 0x01: dataResponse - device responds to getData request
      dataResponse: {
        id: 0x01,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer,
        },
      },

      // 0x02: dataReport - device spontaneously reports data
      dataReport: {
        id: 0x02,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer,
        },
      },

      // 0x06: activeStatusReport - alternative data report
      activeStatusReport: {
        id: 0x06,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer,
        },
      },

      // 0x24: mcuSyncTime - device requests time sync
      mcuSyncTime: {
        id: 0x24,
        args: {
          // No args, or payload varies
        },
      },
    };
  }
}

// Export DP types for external use
TuyaBoundCluster.DP_TYPE = TUYA_DP_TYPE;

module.exports = TuyaBoundCluster;
