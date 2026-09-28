'use strict';

/**
 * TuyaSpecificCluster - Custom Homey SDK3 Implementation
 *
 * Implements Tuya's manufacturer-specific cluster 0xEF00
 * Based on Homey's zigbee-clusters architecture
 *
 * References:
 * - https://athombv.github.io/node-zigbee-clusters
 * - https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md
 */

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * Tuya Specific Cluster 0xEF00
 *
 * This cluster is used by Tuya TS0601 devices for DataPoint communication
 */
class TuyaSpecificCluster extends Cluster {

  static get ID() {
    return 61184; // 0xEF00
  }

  static get NAME() {
    // IMPORTANT: Must be 'tuya' to match community examples
    // zclNode.endpoints[1].clusters.tuya.on("response", ...)
    return 'tuya';
  }

  static get MANUFACTURER_ID() {
    return 0x1002; // Tuya manufacturer ID
  }

  /**
   * Tuya DataPoint Commands
   *
   * Command ID structure:
   * 0x00 - Set Data
   * 0x01 - Get Data
   * 0x02 - Report Data / Data Response
   * 0x04 - Write Data
   */
  static get COMMANDS() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // OUTGOING COMMANDS (Homey → Device)
      // ═══════════════════════════════════════════════════════════════════

      // Set DataPoint value (0x00)
      setData: {
        id: 0x00,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },

      // Set DataPoint value (0x04) - for devices expecting cmdId 0x04
      sendData: {
        id: 0x04,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },

      // Query DataPoint (0x03)
      dataQuery: {
        id: 0x03,
        args: {
          seq: ZCLDataTypes.uint16
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // INCOMING COMMANDS (Device → Homey) - emit events!
      // v5.5.45: These MUST have args to emit events when received
      // ═══════════════════════════════════════════════════════════════════

      // Response to getData (0x01) - device responds to our query
      response: {
        id: 0x01,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },

      // Spontaneous dataReport (0x02) - device sends data unprompted
      reporting: {
        id: 0x02,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },

      // Status report (0x05) - device status reporting
      statusReport: {
        id: 0x05,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },

      // Alternative reporting (0x05)
      reporting_0x05: {
        id: 0x05,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },

      // MCU sync time (0x24) - device requests time
      mcuSyncTime: {
        id: 0x24,
        args: {
          utc: ZCLDataTypes.uint32,
          local: ZCLDataTypes.int32
        }
      }
    };
  }

  /**
   * Parse Tuya DataPoint buffer
   *
   * Structure:
   * [DP ID] [Data Type] [Length Hi] [Length Lo] [Data...]
   *
   * Data Types:
   * 0x00 = Raw
   * 0x01 = Bool
   * 0x02 = Value (4 bytes)
   * 0x03 = String
   * 0x04 = Enum
   * 0x05 = Bitmap
   */
  static parseDataPoints(buffer) {
    const datapoints = [];
    let offset = 0;

    while (offset < buffer.length) {
      if (offset + 4 > buffer.length) {break;}

      const dp = buffer.readUInt8(offset);
      const dataType = buffer.readUInt8(offset + 1);
      const lengthHi = buffer.readUInt8(offset + 2);
      const lengthLo = buffer.readUInt8(offset + 3);
      const length = (lengthHi << 8) + lengthLo;

      offset += 4;

      if (offset + length > buffer.length) {break;}

      let value;

      switch (dataType) {
      case 0x00: // Raw
        value = buffer.slice(offset, offset + length);
        break;

      case 0x01: // Bool
        value = buffer.readUInt8(offset) === 1;
        break;

      case 0x02: // Value (4 bytes)
        if (length === 4) {
          // v5.5.999: Read as unsigned first, then convert to signed for negative values
          // (e.g., temperature sensors reporting negative temps)
          const raw = buffer.readUInt32BE(offset);
          value = raw > 0x7FFFFFFF ? raw - 0x100000000 : raw;
        } else if (length === 2) {
          value = buffer.readInt16BE(offset);
        } else if (length === 1) {
          value = buffer.readUInt8(offset);
        }
        break;

      case 0x03: // String
        value = buffer.slice(offset, offset + length).toString('utf8');
        break;

      case 0x04: // Enum
        value = buffer.readUInt8(offset);
        break;

      case 0x05: // Bitmap
        if (length === 1) {
          value = buffer.readUInt8(offset);
        } else if (length === 2) {
          value = buffer.readUInt16BE(offset);
        } else if (length === 4) {
          value = buffer.readUInt32BE(offset);
        }
        break;
      }

      datapoints.push({
        dp,
        dataType,
        value
      });

      offset += length;
    }

    return datapoints;
  }

  /**
   * Build DataPoint buffer for sending
   */
  static buildDataPointBuffer(dp, dataType, value) {
    let dataBuffer;
    let length;

    switch (dataType) {
    case 0x01: // Bool
      dataBuffer = Buffer.alloc(1);
      dataBuffer.writeUInt8(value ? 1 : 0, 0);
      length = 1;
      break;

    case 0x02: // Value (4 bytes)
      dataBuffer = Buffer.alloc(4);
      dataBuffer.writeUInt32BE(value, 0);
      length = 4;
      break;

    case 0x04: // Enum
      dataBuffer = Buffer.alloc(1);
      dataBuffer.writeUInt8(value, 0);
      length = 1;
      break;

    default:
      throw new Error(`Unsupported data type: ${dataType}`);
    }

    const buffer = Buffer.alloc(4 + length);
    buffer.writeUInt8(dp, 0);
    buffer.writeUInt8(dataType, 1);
    buffer.writeUInt8((length >> 8) & 0xFF, 2);
    buffer.writeUInt8(length & 0xFF, 3);
    dataBuffer.copy(buffer, 4);

    return buffer;
  }

  /**
   * v5.3.62: Handle incoming cluster frame
   * This is called by zigbee-clusters when data arrives
   */
  onDataReport(args) {
    if (args && args.dpValues) {
      const datapoints = TuyaSpecificCluster.parseDataPoints(args.dpValues);

      // Emit events for each datapoint
      for (const dp of datapoints) {
        this.emit('dp', dp.dp, dp.value, dp.dataType);
        this.emit(`dp-${dp.dp}`, dp.value, dp.dataType);
      }

      // Also emit the full report
      this.emit('dataReport', { datapoints, raw: args });
    }

    return args;
  }

  /**
   * v5.3.62: Handle setData response
   */
  onSetDataResponse(args) {
    return args;
  }

  onReporting(args) {
    return this.onDataReport(args);
  }

  onResponse(args) {
    return this.onDataReport(args);
  }

  onStatusReport(args) {
    return this.onDataReport(args);
  }

  onReporting_0x05(args) {
    return this.onDataReport(args);
  }
}

TuyaSpecificCluster.EPOCH_2000 = 946684800;

TuyaSpecificCluster.EPOCH_2000_MFRS = [
  '_TZE204_qyr2m29i', '_TZE200_hue3yfsn',
  '_TZE200_ckud7u2l', '_TZE200_kds0pmmv', '_TZE200_yw7cahqs',
  '_TZE200_aoclfnxz', '_TZE200_bvu2wnxz', '_TZE200_c88teujp',
  '_TZE200_bjawzodf', '_TZE200_yjjdcqsq', '_TZE204_yjjdcqsq',
  '_TZE284_yjjdcqsq', '_TZE200_qoy0ekbd', '_TZE200_znbl8dj5',
  '_TZE284_znbl8dj5', '_TZE200_locansqn', '_TZE200_vvmbj46n',
  '_TZE284_vvmbj46n', '_TZE200_utkemkbs', '_TZE204_utkemkbs',
  '_TZE284_utkemkbs', '_TZE284_5m4nchbm', '_TZE284_oitavov2',
];

TuyaSpecificCluster.needsEpoch2000 = function(mfr) {
  if (!mfr) {return false;}
  const lower = String(mfr).toLowerCase();
  return TuyaSpecificCluster.EPOCH_2000_MFRS.some(e => lower.includes(e.toLowerCase()));
};

TuyaSpecificCluster.getTimestamps = function(mfr, customTzOffsetSec = null) {
  const now = new Date();
  const unix = Math.floor(now.getTime() / 1000);
  const tz = (typeof customTzOffsetSec === 'number' && Number.isFinite(customTzOffsetSec))
    ? customTzOffsetSec
    : (-now.getTimezoneOffset() * 60);
  const e2k = this.needsEpoch2000(mfr);
  const utc = e2k ? unix - this.EPOCH_2000 : unix;
  const local = utc + tz;
  return { utc, local, tz, epoch: e2k ? 2000 : 1970, unix };
};

module.exports = TuyaSpecificCluster;
