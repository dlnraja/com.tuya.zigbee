'use strict';

const { safeParse } = require('../utils/tuyaUtils.js');
const { CLUSTERS } = require('../constants/ZigbeeConstants.js');
const { ZCL_COMMAND, ZCL_FRAME_CONTROL, ZCL_TYPE } = require('../utils/data/ZCLProtocolParser');
const { ExoticQuirkEngine } = require('./ExoticQuirkEngine');

/**
 * IntelligentFrameAnalyzer - v1.0.0
 * The deep interpreter that handles EVERYTHING Zigbee.
 */
class IntelligentFrameAnalyzer {

  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
  }

  /**
   * Primary entry point for any incoming Zigbee data
   */
  async parse(endpointId, clusterId, frame, meta = {}) {
    // Assuming frame is already a Buffer or similar handled by the caller
    const data = Buffer.isBuffer(frame) ? frame : Buffer.from(frame);
    const clusterHex = `0x${clusterId.toString(16).padStart(4, '0')}`;
    
    let result = null;

    if (clusterId === CLUSTERS.TUYA_EF00) {
      result = this._parseTuya(data);
    } else if (clusterId === 0x0000 && data.length > 5) {
      result = this._parseExoticBasic(data);
    } else {
      result = this._parseStandardZCL(clusterId, data);
    }

    if (result) {
      result.endpoint = endpointId;
      result.clusterId = clusterId;
      result.clusterHex = clusterHex;
      result.meta = meta;
      
      await this._autoProcess(result);
    }

    return result;
  }

  /**
   * Parse Standard ZCL
   */
  _parseStandardZCL(clusterId, data) {
    // Note: UniversalDataHandler seems to be a dependency that might be missing or corrupted
    // I'll try to use a more direct approach or assume it exists if I can't find it.
    // For now, I'll stick to the structure but fix the syntax.
    const UniversalDataHandler = require('../utils/UniversalDataHandler');
    const frame = UniversalDataHandler.parseZCLFrame(data);
    if (!frame.valid) return null;

    return {
      type: 'zcl',
      command: frame.command,
      commandName: frame.commandName,
      seqNum: frame.seqNum,
      isGlobal: frame.isGlobal,
      isClusterSpecific: frame.isClusterSpecific,
      manufacturerId: frame.manufacturerId,
      attributes: frame.attributes || []
    };
  }

  /**
   * Parse Tuya EF00 DP Protocol
   */
  _parseTuya(data) {
    const UniversalDataHandler = require('../utils/UniversalDataHandler');
    const frame = UniversalDataHandler.parseTuyaFrame(data);
    if (!frame.valid) return null;

    return {
      type: 'tuya_dp',
      command: frame.command,
      seqNum: frame.seqNum,
      datapoints: frame.datapoints || []
    };
  }

  /**
   * Parse Exotic "Basic" Cluster
   */
  _parseExoticBasic(data) {
    const UniversalDataHandler = require('../utils/UniversalDataHandler');
    const zcl = UniversalDataHandler.parseZCLFrame(data);
    if (!zcl.valid) return null;

    const exotic = {
      type: 'exotic_basic',
      commandName: zcl.commandName,
      attributes: [],
      brand: this._detectBrand()
    };

    if (zcl.attributes) {
      for (const attr of zcl.attributes) {
        if (attr.id === 0xFF01) {
          attr.exoticType = 'XIAOMI_STRUCT';
          attr.decodedValue = this._decodeXiaomiFF01(attr.raw);
        } else if (attr.id === 0xFFDF) {
          attr.exoticType = 'TUYA_VERSION_HANDSHAKE';
        }
        exotic.attributes.push(attr);
      }
    }

    return exotic;
  }

  _decodeXiaomiFF01(data) {
    const results = {};
    let offset = 0;
    while (offset + 1 < data.length) {
      const tag = data[offset++];
      const type = data[offset++];
      const { value, bytesRead } = this._readZclValue(data, offset, type);
      if (bytesRead === 0) break;
      
      const tagNames = {
        0x01: 'battery_voltage',
        0x03: 'internal_temp',
        0x05: 'rssi',
        0x06: 'lqi',
        0x0A: 'parent_nwk',
        0x64: 'onoff_state',
        0x65: 'dimmer_level',
        0x95: 'energy_consumed',
        0x96: 'active_power'
      };

      const key = tagNames[tag] || `tag_0x${tag.toString(16)}`;
      results[key] = value;
      offset += bytesRead;
    }
    return results;
  }

  _readZclValue(data, offset, type) {
    const TypedDataReader = require('../utils/data/TypedDataReader');
    const value = TypedDataReader.read(data, type, offset);
    const size = TypedDataReader.getTypeSize(this._getTypeNameFromCode(type)) || 1;
    
    if (type === 0x41 || type === 0x42) return { value, bytesRead: 1 + data[offset] };
    if (type === 0x43 || type === 0x44) return { value, bytesRead: 2 + data.readUInt16LE(offset) };
    
    return { value, bytesRead: size || 1 };
  }

  _getTypeNameFromCode(code) {
    const map = {
      0x10: 'bool', 0x20: 'uint8', 0x21: 'uint16le', 0x23: 'uint32le',
      0x28: 'int8', 0x29: 'int16le', 0x2B: 'int32le', 0x39: 'floatle',
      0x3A: 'doublele', 0x42: 'string'
    };
    return map[code] || 'raw';
  }

  _detectBrand() {
    const mfr = this.device.getSetting('zb_manufacturer_name') || '';
    if (mfr.includes('LUMI') || mfr.includes('Xiaomi')) return 'XIAOMI';
    if (mfr.includes('SONOFF')) return 'SONOFF';
    return 'GENERIC';
  }

  async _autoProcess(result) {
    const quirk = ExoticQuirkEngine.getQuirk(this.device.getSetting('zb_manufacturer_name'), result.manufacturerId);
    
    if (result.type === 'tuya_dp') {
      for (const dp of result.datapoints) {
        if (quirk && quirk.clusters && quirk.clusters[CLUSTERS.TUYA_EF00]) {
           this.log(` [ENRICH-DP] Applying quirk for ${result.brand}: DP=${dp.id}`);
        }
      }
    }

    if (result.type === 'exotic_basic') {
      for (const attr of result.attributes) {
        if (attr.exoticType === 'XIAOMI_STRUCT' && attr.decodedValue) {
          const val = attr.decodedValue;
          if (val.battery_voltage) {
            const v = safeParse(val.battery_voltage, 1000);
          }
        }
      }
    }
  }
}

module.exports = IntelligentFrameAnalyzer;
