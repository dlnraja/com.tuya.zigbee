'use strict';

/**
 * UniversalDataHandler - v5.5.397
 * Unified facade for all data handling operations
 * Imports modular components from lib/utils/data/
 *
 * Architecture:
 * - DataConverter: Raw data format conversion (Buffer/Hex/Array/Binary)
 * - TuyaProtocolParser: Tuya EF00 DP frame parsing & building
 * - ZCLProtocolParser: Zigbee ZCL frame parsing & building
 * - TypedDataReader: Typed value read/write (uint8/int16/float/etc)
 * - SemanticConverter: Sensor value conversion (temp/humidity/battery/etc)
 * - DPMappingEngine: DP to capability mapping with transformations
 */

// Import modular components
const DataConverter = require('./data/DataConverter');
const TuyaProtocolParser = require('./data/TuyaProtocolParser');
const ZCLProtocolParser = require('./data/ZCLProtocolParser');
const TypedDataReader = require('./data/TypedDataReader');
const SemanticConverter = require('./data/SemanticConverter');
const DPMappingEngine = require('./data/DPMappingEngine');

// Re-export constants for backward compatibility
const { TUYA_DP_TYPE, TUYA_DP_TYPE_NAME, TUYA_COMMAND } = TuyaProtocolParser;
const { ZCL_TYPE, ZCL_FRAME_CONTROL, ZCL_COMMAND } = ZCLProtocolParser;
const { TYPE_SIZES } = TypedDataReader;
const { CONVERSIONS } = SemanticConverter;

/**
 * UniversalDataHandler - Unified API for all data operations
 * Provides backward-compatible static methods while exposing modular components
 */
class UniversalDataHandler {
  // ============ DATA CONVERSION ============

  /** Convert any input to Buffer */
  static toBuffer(data) { return DataConverter.toBuffer(data); }

  /** Convert to formatted hex string with spaces */
  static toHex(data, separator = ' ') { return DataConverter.toHex(data, separator); }

  /** Convert to compact hex string (no spaces) */
  static toHexCompact(data) { return DataConverter.toHexCompact(data); }

  /** Convert to byte array */
  static toArray(data) { return DataConverter.toArray(data); }

  /** Convert to binary string */
  static toBinary(data) { return DataConverter.toBinary(data); }

  /** Convert to JSON-safe format */
  static toJSON(data) { return DataConverter.toJSON(data); }

  /** Compare two data inputs for equality */
  static equals(a, b) { return DataConverter.equals(a, b); }

  /** Concatenate multiple data inputs */
  static concat(...inputs) { return DataConverter.concat(...inputs); }

  /** Slice buffer with safety checks */
  static slice(data, start, end) { return DataConverter.slice(data, start, end); }

  /** XOR two buffers */
  static xor(a, b) { return DataConverter.xor(a, b); }

  /** Calculate simple checksum */
  static checksum(data) { return DataConverter.checksum(data); }

  // ============ TUYA PROTOCOL ============

  /** Parse Tuya EF00 frame */
  static parseTuyaFrame(data) { return TuyaProtocolParser.parseFrame(data); }

  /** Build single Tuya DP */
  static buildTuyaDP(id, type, value) { return TuyaProtocolParser.buildDP(id, type, value); }

  /** Build complete Tuya frame */
  static buildTuyaFrame(seqNum, command, dps) { return TuyaProtocolParser.buildFrame(seqNum, command, dps); }

  /** Build DP set frame */
  static buildSetFrame(seqNum, dpId, dpType, value) { return TuyaProtocolParser.buildSetFrame(seqNum, dpId, dpType, value); }

  /** Build multi-DP frame */
  static buildMultiDPFrame(seqNum, datapoints) { return TuyaProtocolParser.buildMultiDPFrame(seqNum, datapoints); }

  /** Check if data looks like Tuya frame */
  static isTuyaFrame(data) { return TuyaProtocolParser.isTuyaFrame(data); }

  /** Extract all DPs from raw data */
  static extractAllDPs(data) { return TuyaProtocolParser.extractAllDPs(data); }

  // ============ ZCL PROTOCOL ============

  /** Parse ZCL frame */
  static parseZCLFrame(data) { return ZCLProtocolParser.parseFrame(data); }

  /** Build ZCL frame header */
  static buildZCLHeader(options) { return ZCLProtocolParser.buildFrameHeader(options); }

  /** Build ZCL attribute payload */
  static buildAttributePayload(attrId, dataType, value) { return ZCLProtocolParser.buildAttributePayload(attrId, dataType, value); }

  /** Check if data is ZCL frame */
  static isZCLFrame(data) { return ZCLProtocolParser.isZCLFrame(data); }

  // ============ TYPED DATA ============

  /** Read typed value from buffer */
  static read(data, type, offset = 0) { return TypedDataReader.read(data, type, offset); }

  /** Write typed value to buffer */
  static write(type, value) { return TypedDataReader.write(type, value); }

  /** Read multiple values using schema */
  static readSchema(data, schema) { return TypedDataReader.readSchema(data, schema); }

  /** Write multiple values using schema */
  static writeSchema(schema) { return TypedDataReader.writeSchema(schema); }

  /** Get size of type in bytes */
  static getTypeSize(type) { return TypedDataReader.getTypeSize(type); }

  /** Auto-detect and read value based on size */
  static readAuto(data, signed = false, endian = 'be') { return TypedDataReader.readAuto(data, signed, endian); }

  // ============ SEMANTIC CONVERSION ============

  /** Convert raw value to semantic value */
  static convert(raw, conversion) { return SemanticConverter.convert(raw, conversion); }

  /** Convert semantic value back to raw */
  static toRaw(value, conversion) { return SemanticConverter.toRaw(value, conversion); }

  /** Get unit for conversion */
  static getUnit(conversion) { return SemanticConverter.getUnit(conversion); }

  /** Format value with unit */
  static format(raw, conversion) { return SemanticConverter.format(raw, conversion); }

  /** Detect conversion from capability name */
  static detectConversion(capability) { return SemanticConverter.detectConversion(capability); }

  /** Batch convert multiple values */
  static convertBatch(rawValues, conversions) { return SemanticConverter.convertBatch(rawValues, conversions); }

  // ============ DP MAPPING ============

  /** Create new DP mapping engine */
  static createMappingEngine(mappings) { return new DPMappingEngine(mappings); }

  /** Create mapping engine from device type preset */
  static createPresetEngine(deviceType) { return DPMappingEngine.fromPreset(deviceType); }

  // ============ UTILITY ============

  /** Get all available conversion names */
  static getConversionNames() { return SemanticConverter.getConversionNames(); }

  /** Check if conversion exists */
  static hasConversion(conversion) { return SemanticConverter.hasConversion(conversion); }

  /** Add custom conversion */
  static addConversion(name, config) { return SemanticConverter.addConversion(name, config); }
}

// Export main class
module.exports = UniversalDataHandler;

// Export modular components for direct access
module.exports.DataConverter = DataConverter;
module.exports.TuyaProtocolParser = TuyaProtocolParser;
module.exports.ZCLProtocolParser = ZCLProtocolParser;
module.exports.TypedDataReader = TypedDataReader;
module.exports.SemanticConverter = SemanticConverter;
module.exports.DPMappingEngine = DPMappingEngine;

// Backward compatibility aliases
module.exports.ProtocolParser = TuyaProtocolParser; // Old name
module.exports.TypedReader = TypedDataReader; // Old name

// Export constants
module.exports.TUYA_DP_TYPE = TUYA_DP_TYPE;
module.exports.TUYA_DP_TYPE_NAME = TUYA_DP_TYPE_NAME;
module.exports.TUYA_COMMAND = TUYA_COMMAND;
module.exports.ZCL_TYPE = ZCL_TYPE;
module.exports.ZCL_FRAME_CONTROL = ZCL_FRAME_CONTROL;
module.exports.ZCL_COMMAND = ZCL_COMMAND;
module.exports.TYPE_SIZES = TYPE_SIZES;
module.exports.CONVERSIONS = CONVERSIONS;
