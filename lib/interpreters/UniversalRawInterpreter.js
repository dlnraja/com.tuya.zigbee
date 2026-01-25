'use strict';

/**
 * UniversalRawInterpreter - v5.5.795
 * 
 * Interprets raw Zigbee data that doesn't go through standard Homey methods.
 * Handles:
 * - Raw ZCL frames from unknown clusters
 * - Manufacturer-specific commands
 * - Non-standard Tuya DP formats
 * - IAS Zone raw status
 * - Custom cluster data
 * 
 * Based on:
 * - Homey SDK3 Zigbee documentation
 * - Zigbee Cluster Library specification
 * - Tuya 0xEF00 protocol documentation
 * - zigbee-herdsman-converters patterns
 */

// ZCL Frame types
const ZCL_FRAME_TYPE = {
  GLOBAL: 0x00,
  CLUSTER_SPECIFIC: 0x01,
  RESERVED: 0x02,
  MANUFACTURER_SPECIFIC: 0x04, // Flag in frame control
};

// Common ZCL Global commands
const ZCL_GLOBAL_COMMANDS = {
  READ_ATTRIBUTES: 0x00,
  READ_ATTRIBUTES_RESPONSE: 0x01,
  WRITE_ATTRIBUTES: 0x02,
  WRITE_ATTRIBUTES_RESPONSE: 0x04,
  REPORT_ATTRIBUTES: 0x0A,
  DEFAULT_RESPONSE: 0x0B,
  DISCOVER_ATTRIBUTES: 0x0C,
  DISCOVER_ATTRIBUTES_RESPONSE: 0x0D,
  READ_ATTRIBUTES_STRUCTURED: 0x0E,
  WRITE_ATTRIBUTES_STRUCTURED: 0x0F,
  CONFIGURE_REPORTING: 0x06,
  CONFIGURE_REPORTING_RESPONSE: 0x07,
  READ_REPORTING_CONFIG: 0x08,
  READ_REPORTING_CONFIG_RESPONSE: 0x09,
};

// Known cluster IDs
const KNOWN_CLUSTERS = {
  BASIC: 0x0000,
  POWER_CONFIGURATION: 0x0001,
  IDENTIFY: 0x0003,
  GROUPS: 0x0004,
  SCENES: 0x0005,
  ON_OFF: 0x0006,
  LEVEL_CONTROL: 0x0008,
  TIME: 0x000A,
  ALARMS: 0x0009,
  ANALOG_INPUT: 0x000C,
  MULTISTATE_INPUT: 0x0012,
  OTA_UPGRADE: 0x0019,
  POLL_CONTROL: 0x0020,
  DOOR_LOCK: 0x0101,
  WINDOW_COVERING: 0x0102,
  COLOR_CONTROL: 0x0300,
  ILLUMINANCE_MEASUREMENT: 0x0400,
  TEMPERATURE_MEASUREMENT: 0x0402,
  PRESSURE_MEASUREMENT: 0x0403,
  RELATIVE_HUMIDITY: 0x0405,
  OCCUPANCY_SENSING: 0x0406,
  IAS_ZONE: 0x0500,
  IAS_ACE: 0x0501,
  IAS_WD: 0x0502,
  METERING: 0x0702,
  ELECTRICAL_MEASUREMENT: 0x0B04,
  TUYA_SPECIFIC: 0xEF00,
  TUYA_E000: 0xE000,
  TUYA_E001: 0xE001,
};

// IAS Zone status bits
const IAS_ZONE_STATUS = {
  ALARM1: 0x0001,
  ALARM2: 0x0002,
  TAMPER: 0x0004,
  BATTERY_LOW: 0x0008,
  SUPERVISION_REPORTS: 0x0010,
  RESTORE_REPORTS: 0x0020,
  TROUBLE: 0x0040,
  AC_MAINS: 0x0080,
  TEST: 0x0100,
  BATTERY_DEFECT: 0x0200,
};

// Tuya DP data types
const TUYA_DP_TYPES = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05,
};

class UniversalRawInterpreter {

  constructor(device) {
    this.device = device;
    this._frameCounter = 0;
    this._lastFrames = []; // Store last N frames for debugging
    this._maxStoredFrames = 50;
  }

  /**
   * Log helper
   */
  log(...args) {
    if (this.device?.log) {
      this.device.log('[RAW-INTERP]', ...args);
    }
  }

  /**
   * Main entry point: Interpret any raw Zigbee frame
   * @param {Buffer|Object} frame - Raw frame data
   * @param {Object} meta - Frame metadata (endpoint, cluster, etc.)
   * @returns {Object} Interpreted data
   */
  interpretFrame(frame, meta = {}) {
    this._frameCounter++;
    const frameId = this._frameCounter;

    this.log(`📥 Frame #${frameId} received`);

    // Store for debugging
    this._storeFrame(frame, meta, frameId);

    // Convert to Buffer if needed
    const buffer = this._toBuffer(frame);
    if (!buffer || buffer.length === 0) {
      this.log(`⚠️ Frame #${frameId}: Empty or invalid`);
      return { success: false, reason: 'empty_frame' };
    }

    this.log(`   Raw hex: ${buffer.toString('hex')}`);
    this.log(`   Length: ${buffer.length} bytes`);
    this.log(`   Meta: ${JSON.stringify(meta)}`);

    // Determine interpretation strategy based on cluster
    const clusterId = meta.clusterId || meta.cluster;
    
    let result;
    
    if (clusterId === KNOWN_CLUSTERS.TUYA_SPECIFIC) {
      result = this._interpretTuyaEF00(buffer, meta);
    } else if (clusterId === KNOWN_CLUSTERS.IAS_ZONE) {
      result = this._interpretIASZone(buffer, meta);
    } else if (clusterId === KNOWN_CLUSTERS.TUYA_E000 || clusterId === KNOWN_CLUSTERS.TUYA_E001) {
      result = this._interpretTuyaButton(buffer, meta);
    } else if (this._isZCLFrame(buffer)) {
      result = this._interpretZCLFrame(buffer, meta);
    } else {
      result = this._interpretGenericFrame(buffer, meta);
    }

    result.frameId = frameId;
    result.timestamp = Date.now();
    
    this.log(`   ✅ Interpreted: ${JSON.stringify(result)}`);
    
    return result;
  }

  /**
   * Interpret Tuya EF00 cluster frame
   */
  _interpretTuyaEF00(buffer, meta) {
    this.log('   📊 Interpreting Tuya EF00 frame');

    // Tuya frame format: [seq:2][cmd:1][data...]
    // Or: [status:1][seq:1][dp:1][type:1][len:2][data:len]
    
    if (buffer.length < 4) {
      return { type: 'tuya_ef00', success: false, reason: 'too_short' };
    }

    const datapoints = [];
    let offset = 0;

    // Try to detect if this is a DP frame
    // DP frame typically starts with status byte (0x00 or 0x01)
    const firstByte = buffer.readUInt8(0);
    
    if (firstByte <= 0x01 && buffer.length >= 7) {
      // Likely a DP response/report frame
      const status = firstByte;
      const seq = buffer.readUInt8(1);
      offset = 2;

      this.log(`   Status: ${status}, Seq: ${seq}`);

      // Parse DPs
      while (offset + 4 <= buffer.length) {
        const dp = buffer.readUInt8(offset);
        const dpType = buffer.readUInt8(offset + 1);
        const dpLen = buffer.readUInt16BE(offset + 2);
        offset += 4;

        if (offset + dpLen > buffer.length) break;

        const dpData = buffer.slice(offset, offset + dpLen);
        const value = this._parseTuyaDPValue(dpData, dpType);
        offset += dpLen;

        datapoints.push({
          dp,
          type: dpType,
          typeName: this._getDPTypeName(dpType),
          length: dpLen,
          raw: dpData.toString('hex'),
          value
        });

        this.log(`   DP${dp}: type=${dpType}, len=${dpLen}, value=${value}`);
      }
    } else {
      // Try alternate parsing (command + payload)
      const cmd = firstByte;
      this.log(`   Command: 0x${cmd.toString(16)}`);
      
      // Common Tuya commands:
      // 0x01 = getData response
      // 0x02 = dataReport
      // 0x24 = time sync request
      
      if (cmd === 0x24) {
        return { 
          type: 'tuya_ef00', 
          command: 'time_sync_request',
          raw: buffer.toString('hex'),
          success: true 
        };
      }
    }

    return {
      type: 'tuya_ef00',
      datapoints,
      raw: buffer.toString('hex'),
      success: datapoints.length > 0
    };
  }

  /**
   * Interpret IAS Zone frame
   */
  _interpretIASZone(buffer, meta) {
    this.log('   🚨 Interpreting IAS Zone frame');

    // IAS Zone status change notification format:
    // [zoneStatus:2][extStatus:1][zoneId:1][delay:2]
    
    if (buffer.length >= 2) {
      const zoneStatus = buffer.readUInt16LE(0);
      
      const status = {
        alarm1: !!(zoneStatus & IAS_ZONE_STATUS.ALARM1),
        alarm2: !!(zoneStatus & IAS_ZONE_STATUS.ALARM2),
        tamper: !!(zoneStatus & IAS_ZONE_STATUS.TAMPER),
        batteryLow: !!(zoneStatus & IAS_ZONE_STATUS.BATTERY_LOW),
        supervisionReports: !!(zoneStatus & IAS_ZONE_STATUS.SUPERVISION_REPORTS),
        restoreReports: !!(zoneStatus & IAS_ZONE_STATUS.RESTORE_REPORTS),
        trouble: !!(zoneStatus & IAS_ZONE_STATUS.TROUBLE),
        acMains: !!(zoneStatus & IAS_ZONE_STATUS.AC_MAINS),
        test: !!(zoneStatus & IAS_ZONE_STATUS.TEST),
        batteryDefect: !!(zoneStatus & IAS_ZONE_STATUS.BATTERY_DEFECT),
      };

      let extStatus = 0, zoneId = 0, delay = 0;
      if (buffer.length >= 3) extStatus = buffer.readUInt8(2);
      if (buffer.length >= 4) zoneId = buffer.readUInt8(3);
      if (buffer.length >= 6) delay = buffer.readUInt16LE(4);

      this.log(`   Zone status: 0x${zoneStatus.toString(16)}`);
      this.log(`   Alarms: alarm1=${status.alarm1}, alarm2=${status.alarm2}`);

      return {
        type: 'ias_zone',
        zoneStatus,
        status,
        extStatus,
        zoneId,
        delay,
        raw: buffer.toString('hex'),
        success: true
      };
    }

    return { type: 'ias_zone', success: false, reason: 'too_short' };
  }

  /**
   * Interpret Tuya button cluster (0xE000/0xE001)
   */
  _interpretTuyaButton(buffer, meta) {
    this.log('   🔘 Interpreting Tuya button frame');

    const pressTypeMap = ['single', 'double', 'long'];
    
    let button = 1;
    let pressType = 'single';

    if (buffer.length >= 2) {
      button = buffer.readUInt8(0) || 1;
      const pressValue = buffer.readUInt8(1);
      pressType = pressTypeMap[pressValue] || 'single';
    } else if (buffer.length === 1) {
      const value = buffer.readUInt8(0);
      if (value <= 2) {
        pressType = pressTypeMap[value] || 'single';
        button = meta.endpoint || 1;
      } else {
        button = Math.floor(value / 3) + 1;
        pressType = pressTypeMap[value % 3] || 'single';
      }
    }

    this.log(`   Button ${button}: ${pressType} press`);

    return {
      type: 'tuya_button',
      button,
      pressType,
      raw: buffer.toString('hex'),
      success: true
    };
  }

  /**
   * Interpret standard ZCL frame
   */
  _interpretZCLFrame(buffer, meta) {
    this.log('   📋 Interpreting ZCL frame');

    if (buffer.length < 3) {
      return { type: 'zcl', success: false, reason: 'too_short' };
    }

    const frameControl = buffer.readUInt8(0);
    const isClusterSpecific = (frameControl & 0x03) === ZCL_FRAME_TYPE.CLUSTER_SPECIFIC;
    const isManufacturerSpecific = !!(frameControl & ZCL_FRAME_TYPE.MANUFACTURER_SPECIFIC);
    const direction = (frameControl & 0x08) ? 'server_to_client' : 'client_to_server';
    const disableDefaultResponse = !!(frameControl & 0x10);

    let offset = 1;
    let manufacturerId = null;

    if (isManufacturerSpecific && buffer.length >= 4) {
      manufacturerId = buffer.readUInt16LE(offset);
      offset += 2;
    }

    const seqNumber = buffer.readUInt8(offset);
    offset++;

    const commandId = buffer.readUInt8(offset);
    offset++;

    const payload = buffer.slice(offset);

    this.log(`   Frame control: 0x${frameControl.toString(16)}`);
    this.log(`   Cluster specific: ${isClusterSpecific}`);
    this.log(`   Manufacturer specific: ${isManufacturerSpecific}`);
    if (manufacturerId) this.log(`   Manufacturer ID: 0x${manufacturerId.toString(16)}`);
    this.log(`   Sequence: ${seqNumber}`);
    this.log(`   Command: 0x${commandId.toString(16)}`);
    this.log(`   Payload: ${payload.toString('hex')}`);

    // Try to interpret global commands
    let commandName = null;
    let parsedPayload = null;

    if (!isClusterSpecific) {
      commandName = this._getGlobalCommandName(commandId);
      if (commandId === ZCL_GLOBAL_COMMANDS.REPORT_ATTRIBUTES) {
        parsedPayload = this._parseAttributeReport(payload);
      }
    }

    return {
      type: 'zcl',
      frameControl,
      isClusterSpecific,
      isManufacturerSpecific,
      manufacturerId,
      direction,
      disableDefaultResponse,
      seqNumber,
      commandId,
      commandName,
      payload: payload.toString('hex'),
      parsedPayload,
      raw: buffer.toString('hex'),
      success: true
    };
  }

  /**
   * Interpret generic/unknown frame
   */
  _interpretGenericFrame(buffer, meta) {
    this.log('   ❓ Interpreting generic frame');

    // Try to extract any meaningful data
    const result = {
      type: 'generic',
      length: buffer.length,
      raw: buffer.toString('hex'),
      success: true
    };

    // Try numeric interpretations
    if (buffer.length === 1) {
      result.uint8 = buffer.readUInt8(0);
      result.int8 = buffer.readInt8(0);
    } else if (buffer.length === 2) {
      result.uint16_be = buffer.readUInt16BE(0);
      result.uint16_le = buffer.readUInt16LE(0);
      result.int16_be = buffer.readInt16BE(0);
      result.int16_le = buffer.readInt16LE(0);
    } else if (buffer.length === 4) {
      result.uint32_be = buffer.readUInt32BE(0);
      result.uint32_le = buffer.readUInt32LE(0);
      result.int32_be = buffer.readInt32BE(0);
      result.int32_le = buffer.readInt32LE(0);
      result.float_be = buffer.readFloatBE(0);
      result.float_le = buffer.readFloatLE(0);
    }

    // Try string interpretation
    try {
      const str = buffer.toString('utf8');
      if (this._isPrintable(str)) {
        result.string = str;
      }
    } catch (e) { /* ignore */ }

    return result;
  }

  /**
   * Parse Tuya DP value based on type
   */
  _parseTuyaDPValue(data, dpType) {
    if (!Buffer.isBuffer(data) || data.length === 0) return null;

    switch (dpType) {
      case TUYA_DP_TYPES.RAW:
        return data;
      case TUYA_DP_TYPES.BOOL:
        return data.readUInt8(0) === 1;
      case TUYA_DP_TYPES.VALUE:
        if (data.length === 4) return data.readInt32BE(0);
        if (data.length === 2) return data.readInt16BE(0);
        if (data.length === 1) return data.readInt8(0);
        return data.readInt32BE(0);
      case TUYA_DP_TYPES.STRING:
        return data.toString('utf8');
      case TUYA_DP_TYPES.ENUM:
        return data.readUInt8(0);
      case TUYA_DP_TYPES.BITMAP:
        if (data.length === 1) return data.readUInt8(0);
        if (data.length === 2) return data.readUInt16BE(0);
        if (data.length === 4) return data.readUInt32BE(0);
        return data.readUInt32BE(0);
      default:
        if (data.length === 4) return data.readInt32BE(0);
        if (data.length === 2) return data.readInt16BE(0);
        if (data.length === 1) return data.readUInt8(0);
        return data;
    }
  }

  /**
   * Parse ZCL attribute report payload
   */
  _parseAttributeReport(payload) {
    const attributes = [];
    let offset = 0;

    while (offset + 3 <= payload.length) {
      const attrId = payload.readUInt16LE(offset);
      const dataType = payload.readUInt8(offset + 2);
      offset += 3;

      const { value, length } = this._parseZCLDataType(payload, offset, dataType);
      offset += length;

      attributes.push({ attrId, dataType, value });
    }

    return attributes;
  }

  /**
   * Parse ZCL data type
   */
  _parseZCLDataType(buffer, offset, dataType) {
    // Simplified - handle common types
    const typeLength = {
      0x08: 1, // uint8
      0x09: 2, // uint16
      0x0B: 4, // uint32
      0x10: 1, // bool
      0x18: 1, // bitmap8
      0x19: 2, // bitmap16
      0x20: 1, // uint8
      0x21: 2, // uint16
      0x22: 3, // uint24
      0x23: 4, // uint32
      0x28: 1, // int8
      0x29: 2, // int16
      0x2B: 4, // int32
      0x39: 4, // float
      0xF0: 8, // IEEE address
    };

    const length = typeLength[dataType] || 1;
    
    if (offset + length > buffer.length) {
      return { value: null, length: 0 };
    }

    let value;
    switch (dataType) {
      case 0x10: // bool
        value = buffer.readUInt8(offset) === 1;
        break;
      case 0x08: case 0x18: case 0x20:
        value = buffer.readUInt8(offset);
        break;
      case 0x09: case 0x19: case 0x21:
        value = buffer.readUInt16LE(offset);
        break;
      case 0x0B: case 0x23:
        value = buffer.readUInt32LE(offset);
        break;
      case 0x28:
        value = buffer.readInt8(offset);
        break;
      case 0x29:
        value = buffer.readInt16LE(offset);
        break;
      case 0x2B:
        value = buffer.readInt32LE(offset);
        break;
      case 0x39:
        value = buffer.readFloatLE(offset);
        break;
      default:
        value = buffer.slice(offset, offset + length).toString('hex');
    }

    return { value, length };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  _toBuffer(data) {
    if (Buffer.isBuffer(data)) return data;
    if (typeof data === 'string') {
      // Try hex string
      if (/^[0-9a-fA-F]+$/.test(data)) {
        return Buffer.from(data, 'hex');
      }
      return Buffer.from(data, 'utf8');
    }
    if (Array.isArray(data)) {
      return Buffer.from(data);
    }
    if (data?.data && Buffer.isBuffer(data.data)) {
      return data.data;
    }
    return null;
  }

  _isZCLFrame(buffer) {
    // ZCL frame starts with frame control byte
    // Frame type should be 0x00, 0x01, or 0x02
    if (buffer.length < 3) return false;
    const frameType = buffer.readUInt8(0) & 0x03;
    return frameType <= 0x02;
  }

  _isPrintable(str) {
    return /^[\x20-\x7E]*$/.test(str) && str.length > 0;
  }

  _getDPTypeName(type) {
    const names = ['RAW', 'BOOL', 'VALUE', 'STRING', 'ENUM', 'BITMAP'];
    return names[type] || 'UNKNOWN';
  }

  _getGlobalCommandName(cmdId) {
    const names = {
      [ZCL_GLOBAL_COMMANDS.READ_ATTRIBUTES]: 'readAttributes',
      [ZCL_GLOBAL_COMMANDS.READ_ATTRIBUTES_RESPONSE]: 'readAttributesResponse',
      [ZCL_GLOBAL_COMMANDS.WRITE_ATTRIBUTES]: 'writeAttributes',
      [ZCL_GLOBAL_COMMANDS.WRITE_ATTRIBUTES_RESPONSE]: 'writeAttributesResponse',
      [ZCL_GLOBAL_COMMANDS.REPORT_ATTRIBUTES]: 'reportAttributes',
      [ZCL_GLOBAL_COMMANDS.DEFAULT_RESPONSE]: 'defaultResponse',
      [ZCL_GLOBAL_COMMANDS.CONFIGURE_REPORTING]: 'configureReporting',
      [ZCL_GLOBAL_COMMANDS.CONFIGURE_REPORTING_RESPONSE]: 'configureReportingResponse',
    };
    return names[cmdId] || `command_0x${cmdId.toString(16)}`;
  }

  _storeFrame(frame, meta, frameId) {
    this._lastFrames.push({
      id: frameId,
      timestamp: Date.now(),
      frame: this._toBuffer(frame)?.toString('hex'),
      meta
    });

    if (this._lastFrames.length > this._maxStoredFrames) {
      this._lastFrames.shift();
    }
  }

  /**
   * Get stored frames for debugging
   */
  getStoredFrames() {
    return [...this._lastFrames];
  }

  /**
   * Clear stored frames
   */
  clearStoredFrames() {
    this._lastFrames = [];
  }
}

// Export constants for external use
UniversalRawInterpreter.KNOWN_CLUSTERS = KNOWN_CLUSTERS;
UniversalRawInterpreter.IAS_ZONE_STATUS = IAS_ZONE_STATUS;
UniversalRawInterpreter.TUYA_DP_TYPES = TUYA_DP_TYPES;
UniversalRawInterpreter.ZCL_GLOBAL_COMMANDS = ZCL_GLOBAL_COMMANDS;

module.exports = UniversalRawInterpreter;
