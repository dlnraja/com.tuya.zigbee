'use strict';

/**
 * TUYA DATAPOINT PARSER
 * 
 * Décode les DataPoints (DPs) des clusters propriétaires Tuya
 * Utilisé pour TS0601 et autres devices Tuya custom
 */

const { Cluster } = require('zigbee-clusters');

// DataPoint Types
const DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05
};

class TuyaDataPointParser {

  /**
   * Parse un buffer Tuya DataPoint
   */
  static parseDataPoint(buffer) {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    try {
      const dp = buffer.readUInt8(0);
      const datatype = buffer.readUInt8(1);
      const length = buffer.readUInt16BE(2);
      const data = buffer.slice(4, 4 + length);

      const parsed = {
        dp,
        datatype,
        length,
        raw: data,
        value: null
      };

      switch (datatype) {
        case DP_TYPE.BOOL:
          parsed.value = data.readUInt8(0) === 1;
          break;
        case DP_TYPE.VALUE:
          if (length === 4) {
            parsed.value = data.readInt32BE(0);
          } else if (length === 2) {
            parsed.value = data.readInt16BE(0);
          } else {
            parsed.value = data.readUInt8(0);
          }
          break;
        case DP_TYPE.STRING:
          parsed.value = data.toString('utf8');
          break;
        case DP_TYPE.ENUM:
          parsed.value = data.readUInt8(0);
          break;
        case DP_TYPE.BITMAP:
          parsed.value = Array.from(data);
          break;
        default:
          parsed.value = data;
      }

      return parsed;
    } catch (err) {
      return null;
    }
  }

  /**
   * Parse multiple DataPoints
   */
  static parseMultipleDataPoints(buffer) {
    const dataPoints = [];
    let offset = 0;

    while (offset < buffer.length - 4) {
      try {
        const length = buffer.readUInt16BE(offset + 2);
        const dpBuffer = buffer.slice(offset, offset + 4 + length);
        const dp = this.parseDataPoint(dpBuffer);
        
        if (dp) dataPoints.push(dp);
        offset += 4 + length;
      } catch (err) {
        break;
      }
    }

    return dataPoints;
  }

  /**
   * Convert DP to Homey capability
   */
  static dpToCapability(dp, value, manufacturerId) {
    const mappings = this.getManufacturerMappings(manufacturerId);
    const mapping = mappings[dp];

    if (!mapping) return null;

    try {
      return {
        capability: mapping.capability,
        value: mapping.parser(value)
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Get manufacturer-specific mappings
   */
  static getManufacturerMappings(manufacturerId) {
    const mappings = {
      // Radar Presence _TZE200_rhgsbacq
      '_TZE200_rhgsbacq': {
        1: { capability: 'alarm_motion', parser: v => v === 1 },
        101: { capability: 'alarm_motion', parser: v => v === 1 },
        104: { capability: 'target_distance', parser: v => v / 100 },
        106: { capability: 'radar_sensitivity', parser: v => v },
        107: { capability: 'minimum_range', parser: v => v / 100 },
        108: { capability: 'maximum_range', parser: v => v / 100 },
        111: { capability: 'detection_delay', parser: v => v / 10 },
        112: { capability: 'fading_time', parser: v => v / 10 }
      },

      // PIR 3-in-1 HOBEIAN
      'HOBEIAN': {
        1: { capability: 'alarm_motion', parser: v => v === true },
        3: { capability: 'measure_temperature', parser: v => v / 10 },
        4: { capability: 'measure_humidity', parser: v => v },
        5: { capability: 'measure_luminance', parser: v => v },
        6: { capability: 'measure_battery', parser: v => v }
      },

      // Climate Monitor
      '_TZE284_vvmbj46n': {
        1: { capability: 'measure_temperature', parser: v => v / 10 },
        2: { capability: 'measure_humidity', parser: v => v },
        4: { capability: 'measure_battery', parser: v => v }
      },

      // Soil Sensor
      '_TZE284_oitavov2': {
        1: { capability: 'measure_temperature', parser: v => v / 10 },
        2: { capability: 'measure_humidity', parser: v => v },
        3: { capability: 'measure_battery', parser: v => v },
        5: { capability: 'soil_moisture', parser: v => v }
      }
    };

    return mappings[manufacturerId] || {};
  }

  /**
   * Encode DataPoint
   */
  static encodeDataPoint(dp, datatype, value) {
    let dataBuffer;

    switch (datatype) {
      case DP_TYPE.BOOL:
        dataBuffer = Buffer.alloc(1);
        dataBuffer.writeUInt8(value ? 1 : 0, 0);
        break;
      case DP_TYPE.VALUE:
        dataBuffer = Buffer.alloc(4);
        dataBuffer.writeInt32BE(value, 0);
        break;
      case DP_TYPE.ENUM:
        dataBuffer = Buffer.alloc(1);
        dataBuffer.writeUInt8(value, 0);
        break;
      case DP_TYPE.STRING:
        dataBuffer = Buffer.from(value, 'utf8');
        break;
      default:
        dataBuffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
    }

    const buffer = Buffer.alloc(4 + dataBuffer.length);
    buffer.writeUInt8(dp, 0);
    buffer.writeUInt8(datatype, 1);
    buffer.writeUInt16BE(dataBuffer.length, 2);
    dataBuffer.copy(buffer, 4);

    return buffer;
  }

  /**
   * Generate DP report
   */
  static generateDPReport(node) {
    let report = '╔═══════════════════════════════════╗\n';
    report += '║   TUYA DATAPOINT DETECTION        ║\n';
    report += '╚═══════════════════════════════════╝\n\n';

    if (!node || !node.endpoints) {
      report += '❌ No node data\n';
      return report;
    }

    const manufacturerId = node.endpoints[1]?.clusters?.basic?.attributes
      ?.find(a => a.name === 'manufacturerName')?.value;

    report += `🏭 Manufacturer: ${manufacturerId || 'Unknown'}\n`;
    report += `📋 Model: ${node.endpoints[1]?.clusters?.basic?.attributes
      ?.find(a => a.name === 'modelId')?.value || 'Unknown'}\n\n`;

    const tuyaCluster = node.endpoints[1]?.clusters?.tuya || 
                        node.endpoints[1]?.clusters[0xEF00];

    if (!tuyaCluster) {
      report += '⚠️  No Tuya cluster found\n';
      return report;
    }

    report += '✅ Tuya cluster detected\n\n';
    report += '📊 DataPoints Mappings:\n\n';

    const mappings = this.getManufacturerMappings(manufacturerId);
    
    if (Object.keys(mappings).length === 0) {
      report += '⚠️  No mappings for this manufacturer\n\n';
    } else {
      Object.keys(mappings).forEach(dp => {
        const mapping = mappings[dp];
        report += `  DP ${dp.padStart(3)} → ${mapping.capability}\n`;
      });
    }

    return report;
  }
}

TuyaDataPointParser.DP_TYPE = DP_TYPE;

module.exports = TuyaDataPointParser;
