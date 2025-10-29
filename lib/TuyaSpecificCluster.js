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
    return 'tuyaSpecific';
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
      // Set DataPoint value
      setData: {
        id: 0x00,
        args: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },
      
      // Get DataPoint value
      getData: {
        id: 0x01,
        args: {
          seq: ZCLDataTypes.uint16,
          datapoints: ZCLDataTypes.buffer
        }
      },
      
      // Report DataPoint (response from device)
      dataReport: {
        id: 0x02,
        response: {
          seq: ZCLDataTypes.uint16,
          dpValues: ZCLDataTypes.buffer
        }
      },
      
      // Write DataPoint command
      dataQuery: {
        id: 0x03,
        args: {
          seq: ZCLDataTypes.uint16
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
      if (offset + 4 > buffer.length) break;
      
      const dp = buffer.readUInt8(offset);
      const dataType = buffer.readUInt8(offset + 1);
      const lengthHi = buffer.readUInt8(offset + 2);
      const lengthLo = buffer.readUInt8(offset + 3);
      const length = (lengthHi << 8) + lengthLo;
      
      offset += 4;
      
      if (offset + length > buffer.length) break;
      
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
            value = buffer.readUInt32BE(offset);
          } else if (length === 2) {
            value = buffer.readUInt16BE(offset);
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
}

module.exports = TuyaSpecificCluster;
