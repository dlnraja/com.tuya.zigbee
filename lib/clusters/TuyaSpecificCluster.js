'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * Tuya Specific Cluster (0xEF00)
 *
 * This cluster implements Tuya's proprietary Data Point (DP) protocol used in TS0601 devices.
 * Tuya DP protocol allows communication with devices that don't use standard Zigbee clusters.
 *
 * Common DP IDs:
 * - 1: Temperature (int16, divide by 10)
 * - 2: Humidity (uint16, divide by 10)
 * - 3: Battery (uint8, percentage)
 * - 4: Motion (bool)
 * - 101: Switch state (bool)
 * - 102: Brightness (uint16, 0-1000)
 *
 * @see https://developer.tuya.com/en/docs/iot/zigbee-cluster-introduction
 * @see https://github.com/dresden-elektronik/deconz-rest-plugin/wiki/Tuya-Data-Point-Protocol
 */
class TuyaSpecificCluster extends Cluster {

  static get ID() {
    return 0xEF00;
  }

  static get NAME() {
    return 'tuya';
  }

  static get ATTRIBUTES() {
    return {
      /**
       * Data Points storage
       * Contains all current DP values
       */
      dataPoints: {
        id: 0x0000,
        type: ZCLDataTypes.map8,
      },
    };
  }

  static get COMMANDS() {
    /**
     * v5.5.76: CRITICAL FIX - Tuya payload format
     *
     * Real Tuya 0xEF00 frame format:
     * | status | transId | dpId | dataType | fn | len | data |
     * | uint8  | uint8   | uint8| uint8    | uint8| uint8 | buffer |
     *
     * IMPORTANT: Using empty args {} to receive raw payload
     * This allows the BoundCluster to receive data and parse manually
     *
     * Sources:
     * - https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md
     * - https://github.com/Koenkk/zigbee-herdsman/blob/master/src/zcl/definition/cluster.ts
     */
    return {
      /**
       * Data Request Command (0x00)
       * Used to request current value of a specific DP
       */
      dataRequest: {
        id: 0x00,
        args: {},
        response: {
          id: 0x01, // dataReport is the response
          args: {},
        },
      },

      /**
       * Data Report Command (0x01)
       * Device sends this when a DP value changes or responds to query
       */
      dataReport: {
        id: 0x01,
        args: {},
      },

      /**
       * Data Response Command (0x02)
       * Alternative response format (some devices use this)
       */
      dataResponse: {
        id: 0x02,
        args: {},
      },

      /**
       * Set Data Point Command (0x04)
       * Used to set a DP value (control device)
       */
      setDataPoint: {
        id: 0x04,
        args: {},
      },

      /**
       * MCU Version Request (0x10)
       */
      mcuVersionRequest: {
        id: 0x10,
        args: {},
      },

      /**
       * MCU Version Response (0x11)
       */
      mcuVersionResponse: {
        id: 0x11,
        args: {},
      },

      /**
       * Time Sync Request (0x24)
       * Device requests current time
       */
      mcuSyncTime: {
        id: 0x24,
        args: {},
      },

      /**
       * MCU Gateway Sence Data (0x25)
       */
      mcuGatewaySenceData: {
        id: 0x25,
        args: {},
      },
    };
  }
}

/**
 * Tuya Data Types
 * Used in dataType field of commands
 */
TuyaSpecificCluster.DATA_TYPES = {
  RAW: 0x00,      // Raw bytes
  BOOL: 0x01,     // Boolean (1 byte)
  VALUE: 0x02,    // Integer (4 bytes, big-endian)
  STRING: 0x03,   // String (length-prefixed)
  ENUM: 0x04,     // Enum (1 byte)
  BITMAP: 0x05,   // Bitmap (1, 2, or 4 bytes)
};

/**
 * Helper: Parse Tuya DP data based on type
 * @param {Buffer} data - Raw data buffer
 * @param {number} dataType - Tuya data type
 * @returns {*} Parsed value
 */
TuyaSpecificCluster.parseDataPointValue = function (data, dataType) {
  if (!Buffer.isBuffer(data)) {
    throw new Error('data must be a Buffer');
  }

  switch (dataType) {
    case this.DATA_TYPES.RAW:
      return data;

    case this.DATA_TYPES.BOOL:
      return data.length > 0 ? data.readUInt8(0) !== 0 : false;

    case this.DATA_TYPES.VALUE:
      if (data.length === 4) {
        return data.readInt32BE(0);
      } else if (data.length === 2) {
        return data.readInt16BE(0);
      } else if (data.length === 1) {
        return data.readInt8(0);
      }
      throw new Error(`Unexpected VALUE data length: ${data.length}`);

    case this.DATA_TYPES.STRING:
      return data.toString('utf8');

    case this.DATA_TYPES.ENUM:
      return data.length > 0 ? data.readUInt8(0) : 0;

    case this.DATA_TYPES.BITMAP:
      if (data.length === 1) {
        return data.readUInt8(0);
      } else if (data.length === 2) {
        return data.readUInt16BE(0);
      } else if (data.length === 4) {
        return data.readUInt32BE(0);
      }
      throw new Error(`Unexpected BITMAP data length: ${data.length}`);

    default:
      throw new Error(`Unknown Tuya data type: ${dataType}`);
  }
};

/**
 * Helper: Encode value to Tuya DP data buffer
 * @param {*} value - Value to encode
 * @param {number} dataType - Tuya data type
 * @returns {Buffer} Encoded data buffer
 */
TuyaSpecificCluster.encodeDataPointValue = function (value, dataType) {
  switch (dataType) {
    case this.DATA_TYPES.RAW:
      return Buffer.isBuffer(value) ? value : Buffer.from(value);

    case this.DATA_TYPES.BOOL: {
      const buf = Buffer.alloc(1);
      buf.writeUInt8(value ? 1 : 0, 0);
      return buf;
    }

    case this.DATA_TYPES.VALUE: {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(value, 0);
      return buf;
    }

    case this.DATA_TYPES.STRING:
      return Buffer.from(String(value), 'utf8');

    case this.DATA_TYPES.ENUM: {
      const buf = Buffer.alloc(1);
      buf.writeUInt8(value, 0);
      return buf;
    }

    case this.DATA_TYPES.BITMAP: {
      const buf = Buffer.alloc(1);
      buf.writeUInt8(value, 0);
      return buf;
    }

    default:
      throw new Error(`Unknown Tuya data type: ${dataType}`);
  }
};

/**
 * Common Tuya DP IDs and their meanings
 * Use these constants for better code readability
 */
TuyaSpecificCluster.DP = {
  // Common sensors
  TEMPERATURE: 1,
  HUMIDITY: 2,
  BATTERY: 3,
  MOTION: 4,
  CONTACT: 5,
  WATER_LEAK: 6,
  SMOKE: 7,
  CO: 8,
  ILLUMINANCE: 9,
  PM25: 10,
  CO2: 11,
  FORMALDEHYDE: 12,
  VOC: 13,

  // Climate control
  TARGET_TEMP: 16,
  CURRENT_TEMP: 24,
  MODE: 2,
  FAN_MODE: 5,
  SWING_MODE: 8,

  // Switches & lights
  SWITCH_1: 1,
  SWITCH_2: 2,
  SWITCH_3: 3,
  SWITCH_4: 4,
  BRIGHTNESS: 3,
  COLOR_TEMP: 4,
  COLOR_DATA: 5,
  SCENE: 6,
  COUNTDOWN: 7,

  // Power & energy
  POWER: 6,
  CURRENT: 7,
  VOLTAGE: 8,
  ENERGY: 17,

  // Curtains & blinds
  POSITION: 1,
  DIRECTION: 2,
  MOTOR_REVERSE: 5,

  // Valves
  VALVE_STATE: 1,
  VALVE_POSITION: 2,
  VALVE_BATTERY: 4,

  // Sirens
  ALARM_VOLUME: 5,
  ALARM_DURATION: 7,
  ALARM_MODE: 13,
};

module.exports = TuyaSpecificCluster;
