'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TUYA MANUFACTURER CLUSTER (0xEF00)
 *
 * Tuya uses a proprietary cluster to send Data Points (DPs).
 * Each DP has:
 * - DP ID (number): identifies the data type (1=motion, 4=battery, 18=temp, etc.)
 * - DP Type (enum): Bool, Value, Enum, String, Raw, Bitmap
 * - DP Value (varies): the actual data
 *
 * Reference:
 * - https://github.com/Koenkk/zigbee2mqtt/blob/master/lib/tuya.ts
 * - https://github.com/zigpy/zha-device-handlers
 * - https://github.com/athombv/node-zigbee-clusters
 */

class TuyaManufacturerCluster extends Cluster {
  static get ID() {
    return 0xEF00; // Tuya's proprietary cluster ID
  }

  static get NAME() {
    return 'tuyaManufacturer';
  }

  static get MANUFACTURER_ID() {
    return 0x1002; // Tuya manufacturer ID (sometimes 0x1000, 0x104E)
  }

  static get ATTRIBUTES() {
    return {
      // Tuya typically uses attribute 0x0000 for all DP data
      dataPoints: {
        id: 0x0000,
        type: ZCLDataTypes.buffer, // Raw buffer that we'll parse
        manufacturerId: 0x1002
      }
    };
  }

  static get COMMANDS() {
    return {
      // Command to send DP to device (for control)
      dataRequest: {
        id: 0x00,
        args: {
          dpId: ZCLDataTypes.uint8,
          dpType: ZCLDataTypes.uint8,
          dpValue: ZCLDataTypes.buffer
        }
      },
      // Command to receive DP from device (reports)
      dataReport: {
        id: 0x01,
        args: {
          dpId: ZCLDataTypes.uint8,
          dpType: ZCLDataTypes.uint8,
          dpValue: ZCLDataTypes.buffer
        }
      },
      // Data response (acknowledgment)
      dataResponse: {
        id: 0x02,
        args: {
          status: ZCLDataTypes.uint8,
          transid: ZCLDataTypes.uint8
        }
      }
    };
  }

  /**
   * v5.3.62: Handle incoming dataReport command
   * This is called automatically by zigbee-clusters when command 0x01 arrives
   */
  onDataReport(args) {
    console.log('[TuyaManufacturerCluster] 📥 onDataReport:', args);

    if (args) {
      const { dpId, dpType, dpValue } = args;

      // Parse the value based on type
      let parsedValue = dpValue;
      if (Buffer.isBuffer(dpValue)) {
        switch (dpType) {
        case 0x01: // Bool
          parsedValue = dpValue.readUInt8(0) === 1;
          break;
        case 0x02: // Value
          if (dpValue.length === 4) parsedValue = dpValue.readUInt32BE(0);
          else if (dpValue.length === 2) parsedValue = dpValue.readUInt16BE(0);
          else if (dpValue.length === 1) parsedValue = dpValue.readUInt8(0);
          break;
        case 0x04: // Enum
          parsedValue = dpValue.readUInt8(0);
          break;
        }
      }

      console.log(`[TuyaManufacturerCluster] 📊 DP${dpId} (type ${dpType}) = ${parsedValue}`);

      // Emit events
      this.emit('dp', dpId, parsedValue, dpType);
      this.emit(`dp-${dpId}`, parsedValue, dpType);
      this.emit('dataReport', { dpId, dpType, value: parsedValue, raw: args });
    }

    return args;
  }

  /**
   * v5.3.62: Handle dataRequest response
   */
  onDataRequest(args) {
    console.log('[TuyaManufacturerCluster] 📥 onDataRequest:', args);
    return args;
  }
}

module.exports = TuyaManufacturerCluster;
