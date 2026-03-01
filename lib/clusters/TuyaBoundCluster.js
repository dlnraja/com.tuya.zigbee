'use strict';

const { BoundCluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaBoundCluster - v5.10.5 Comprehensive Command Coverage
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
  FAULT: 0x05,  // ZHA alias for BITMAP (TUYA_DP_TYPE_FAULT)
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
    try {
      this.log('📥 dataReport received:', JSON.stringify(payload));
      if (typeof this._onDataReport === 'function') {
        const parsed = this._parsePayload(payload);
        this._onDataReport(parsed);
      }
    } catch (err) { this.log('⚠️ FRAME SAVED — dataReport error:', err.message); }
  }

  /**
   * Handle dataResponse command (0x01)
   * Device responds to a getData request
   */
  dataResponse(payload) {
    try {
      this.log('📥 dataResponse received:', JSON.stringify(payload));
      if (typeof this._onDataResponse === 'function') {
        const parsed = this._parsePayload(payload);
        this._onDataResponse(parsed);
      }
    } catch (err) { this.log('⚠️ FRAME SAVED — dataResponse error:', err.message); }
  }

  /**
   * Handle mcuSyncTime command (0x24)
   * Device requests time synchronization
   * 
   * v5.5.960: CRITICAL FIX - Extract sequence number from payload
   * The device sends a 2-byte sequence/request ID that MUST be echoed
   * back in the response for the time sync to work!
   * 
   * Protocol (from Tuya docs + Z2M research):
   * - Device → Host: [payloadSize:2][seqHi:1][seqLo:1] OR just [seqHi:1][seqLo:1]
   * - Host → Device: [seqHi:1][seqLo:1][UTC:4 BE][Local:4 BE] (10 bytes)
   */
  mcuSyncTime(payload) {
    try {
    this.log('📥 mcuSyncTime request received');
    this.log(`📥 mcuSyncTime payload:`, JSON.stringify(payload));
    
    // v5.5.960: Extract sequence number from payload
    let sequenceNumber = 0;
    
    if (payload?.payload && Buffer.isBuffer(payload.payload) && payload.payload.length >= 2) {
      // Payload contains sequence number as first 2 bytes
      sequenceNumber = payload.payload.readUInt16BE(0);
      this.log(`📥 mcuSyncTime sequence from buffer: 0x${sequenceNumber.toString(16).padStart(4, '0')}`);
    } else if (Array.isArray(payload?.payload) && payload.payload.length >= 2) {
      // Payload as array
      sequenceNumber = (payload.payload[0] << 8) | payload.payload[1];
      this.log(`📥 mcuSyncTime sequence from array: 0x${sequenceNumber.toString(16).padStart(4, '0')}`);
    } else if (typeof payload?.payloadSize === 'number') {
      // payloadSize field might contain the sequence number
      sequenceNumber = payload.payloadSize;
      this.log(`📥 mcuSyncTime sequence from payloadSize: 0x${sequenceNumber.toString(16).padStart(4, '0')}`);
    }

    if (typeof this._onMcuSyncTime === 'function') {
      this._onMcuSyncTime({
        ...payload,
        sequenceNumber,
        timestamp: Date.now()
      });
    }
    } catch (err) { this.log('⚠️ FRAME SAVED — mcuSyncTime error:', err.message); }
  }

  /**
   * Handle activeStatusReport command (0x06)
   * Some devices use this instead of dataReport
   */
  activeStatusReport(payload) {
    try {
      this.log('📥 activeStatusReport received:', JSON.stringify(payload));
      if (typeof this._onDataReport === 'function') {
        const parsed = this._parsePayload(payload);
        this._onDataReport(parsed);
      }
    } catch (err) { this.log('⚠️ FRAME SAVED — activeStatusReport error:', err.message); }
  }

  sendData(p) { try { this.log('📥 sendData 0x04'); if(this._onDataReport) this._onDataReport(this._parsePayload(p)); } catch(e) { this.log('⚠️ FRAME SAVED — sendData:', e.message); } }
  statusReport(p) { try { this.log('📥 statusReport 0x05'); if(this._onDataReport) this._onDataReport(this._parsePayload(p)); } catch(e) { this.log('⚠️ FRAME SAVED — statusReport:', e.message); } }
  sceneQuery(p) { try { this.log('📥 sceneQuery 0x09'); if(this._onRawFrame) this._onRawFrame({ cmdId:0x09, frame:p, timestamp:Date.now() }); } catch(e) { this.log('⚠️ FRAME SAVED — sceneQuery:', e.message); } }
  sceneWakeup(p) { try { this.log('📥 sceneWakeup 0x0A'); if(this._onRawFrame) this._onRawFrame({ cmdId:0x0A, frame:p, timestamp:Date.now() }); } catch(e) { this.log('⚠️ FRAME SAVED — sceneWakeup:', e.message); } }
  mcuVersionResponse(p) { try { this.log('📥 mcuVersionRsp 0x11'); if(this._onRawFrame) this._onRawFrame({ cmdId:0x11, frame:p, timestamp:Date.now() }); } catch(e) { this.log('⚠️ FRAME SAVED — mcuVersionRsp:', e.message); } }

  // v5.12.x: Catch-all handlers for ALL Tuya EF00 commands
  _rawDP(id,p){try{this.log('📥 cmd0x'+id.toString(16));const d=p?.data||p?.dpValues||p;if(d&&this._onDataReport){try{this._onDataReport(this._parsePayload({dpValues:d}));}catch(e2){}}if(this._onRawFrame)this._onRawFrame({cmdId:id,frame:p,timestamp:Date.now()});}catch(e){this.log('⚠️ FRAME SAVED — cmd0x'+id.toString(16)+':',e.message);}}
  setDpResponse(p){this._rawDP(0x00,p);}
  queryAllResponse(p){this._rawDP(0x03,p);}
  dpStatusUpdate(p){this._rawDP(0x07,p);}
  dpQuery(p){this._rawDP(0x08,p);}
  cmd0B(p){this._rawDP(0x0B,p);}
  cmd0C(p){this._rawDP(0x0C,p);}
  cmd0D(p){this._rawDP(0x0D,p);}
  cmd0E(p){this._rawDP(0x0E,p);}
  cmd0F(p){this._rawDP(0x0F,p);}
  mcuVersionRequest(p){this._rawDP(0x10,p);}
  mcuGatewaySniffer(p){this._rawDP(0x25,p);}

  // v5.11.30: Missing Tuya EF00 commands from official protocol spec
  queryNetworkStatus(p){this._rawDP(0x20,p);}
  configNetworkPolicy(p){this._rawDP(0x26,p);}
  broadcastMessage(p){this._rawDP(0x27,p);}
  gatewayReadDP(p){this._rawDP(0x28,p);}
  beaconRFTest(p){this._rawDP(0x29,p);}
  multicastCommand(p){this._rawDP(0x2A,p);}
  setWakeupWait(p){this._rawDP(0x2B,p);}
  sendKidGidSid(p){this._rawDP(0x41,p);}
  multicastStandard(p){this._rawDP(0x42,p);}
  multicastPrivate(p){this._rawDP(0x43,p);}

  /**
   * v5.5.795: Handle raw frames that don't match known commands
   * This catches any Tuya commands not explicitly defined
   */
  async handleFrame(frame, meta, rawFrame) {
    try { return await this._handleFrameInner(frame, meta, rawFrame); }
    catch (err) { this.log('⚠️ FRAME SAVED — handleFrame error:', err.message); return null; }
  }

  async _handleFrameInner(frame, meta, rawFrame) {
    const cmdId = frame?.cmdId ?? frame?.commandId;
    
    this.log(`📥 Raw frame received: cmdId=0x${cmdId?.toString(16) || 'unknown'}`);
    
    // Store for debugging
    this._storeFrame(frame, meta, rawFrame);
    
    // Known command IDs that have explicit handlers
    const knownCommands = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x20, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x41, 0x42, 0x43];
    
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
      if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'string') {
        return data;
      }
      return data;
    }

    // v5.8.96: Guard against empty buffers — prevents crash on malformed DP payloads
    if (data.length === 0) return data;

    try {
      switch (dataType) {
      case TUYA_DP_TYPE.RAW:
        return data;

      case TUYA_DP_TYPE.BOOL:
        return data.readUInt8(0) === 1;

      case TUYA_DP_TYPE.VALUE:
        if (data.length >= 4) return data.readInt32BE(0);
        if (data.length >= 2) return data.readInt16BE(0);
        return data.readInt8(0);

      case TUYA_DP_TYPE.STRING:
        return data.toString('utf8');

      case TUYA_DP_TYPE.ENUM:
        return data.readUInt8(0);

      case TUYA_DP_TYPE.BITMAP:
        if (data.length >= 4) return data.readUInt32BE(0);
        if (data.length >= 2) return data.readUInt16BE(0);
        return data.readUInt8(0);

      default:
        if (data.length >= 4) return data.readInt32BE(0);
        if (data.length >= 2) return data.readInt16BE(0);
        if (data.length >= 1) return data.readUInt8(0);
        return data;
      }
    } catch (err) {
      this.log('⚠️ _parseValue error:', err.message, 'type:', dataType, 'len:', data.length);
      return data;
    }
  }

  /**
   * Cluster commands that the device can send TO Homey
   * These are the commands we need to handle
   */
  static get COMMANDS() {
    return {
      mcuSyncTime: {
        id: 0x24,
        args: {
          payloadSize: ZCLDataTypes.uint16,
          payload: ZCLDataTypes.buffer,
        },
      },
      sendData: { id: 0x04, args: { seq: ZCLDataTypes.uint16, dpValues: ZCLDataTypes.buffer } },
      statusReport: { id: 0x05, args: { seq: ZCLDataTypes.uint16, dpValues: ZCLDataTypes.buffer } },
      sceneQuery: { id: 0x09, args: { data: ZCLDataTypes.buffer } },
      sceneWakeup: { id: 0x0A, args: { data: ZCLDataTypes.buffer } },
      mcuVersionResponse: { id: 0x11, args: { seq: ZCLDataTypes.uint16, version: ZCLDataTypes.uint8 } },
      dataResponse: {
        id: 0x01,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer,
        },
      },
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

      // v5.12.x: Comprehensive coverage — catch ALL known Tuya EF00 command IDs
      // Without these, the SDK silently drops frames with unrecognized command IDs
      setDpResponse: { id: 0x00, args: { data: ZCLDataTypes.buffer } },
      queryAllResponse: { id: 0x03, args: { data: ZCLDataTypes.buffer } },
      dpStatusUpdate: { id: 0x07, args: { data: ZCLDataTypes.buffer } },
      dpQuery: { id: 0x08, args: { data: ZCLDataTypes.buffer } },
      cmd0B: { id: 0x0B, args: { data: ZCLDataTypes.buffer } },
      cmd0C: { id: 0x0C, args: { data: ZCLDataTypes.buffer } },
      cmd0D: { id: 0x0D, args: { data: ZCLDataTypes.buffer } },
      cmd0E: { id: 0x0E, args: { data: ZCLDataTypes.buffer } },
      cmd0F: { id: 0x0F, args: { data: ZCLDataTypes.buffer } },
      mcuVersionRequest: { id: 0x10, args: { data: ZCLDataTypes.buffer } },
      mcuGatewaySniffer: { id: 0x25, args: { data: ZCLDataTypes.buffer } },
    };
  }
}

// Export DP types for external use
TuyaBoundCluster.DP_TYPE = TUYA_DP_TYPE;

module.exports = TuyaBoundCluster;
