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
     * v5.5.80: ALIGNED WITH JOHAN'S WORKING IMPLEMENTATION
     *
     * Structure based on: https://github.com/JohanBendz/com.tuya.zigbee/blob/master/lib/TuyaSpecificCluster.js
     *
     * Key differences from previous versions:
     * 1. Command args now match the actual Tuya DP protocol structure
     * 2. Added 'datapoint' command (id: 0) for sending data
     * 3. 'reporting' (id: 0x01) and 'response' (id: 0x02) for receiving data
     *
     * Tuya DP Frame structure:
     * | status | transid | dp | datatype | length (2 bytes) | data (variable) |
     */
    return {
      // ═══════════════════════════════════════════════════════════════════
      // OUTGOING COMMAND (Homey → Device)
      // ═══════════════════════════════════════════════════════════════════

      /**
       * Send datapoint to device (0x00)
       * This is the command used to control the device
       */
      datapoint: {
        id: 0x00,
        args: {
          status: ZCLDataTypes.uint8,     // Status byte (usually 0)
          transid: ZCLDataTypes.uint8,    // Transaction ID (increment each command)
          dp: ZCLDataTypes.uint8,         // Datapoint ID
          datatype: ZCLDataTypes.uint8,   // Datatype (bool=1, value=2, string=3, enum=4, raw=0)
          length: ZCLDataTypes.data16,    // Length of data (big-endian)
          data: ZCLDataTypes.buffer,      // Data payload
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // INCOMING COMMANDS (Device → Homey) - emit events via onResponse/onReporting!
      // ═══════════════════════════════════════════════════════════════════

      /**
       * Report datapoint change (0x01) - device reports a change
       * Method onReporting() will be called and emit 'reporting' event
       */
      reporting: {
        id: 0x01,
        args: {
          status: ZCLDataTypes.uint8,     // Status byte
          transid: ZCLDataTypes.uint8,    // Transaction ID
          dp: ZCLDataTypes.uint8,         // Datapoint ID
          datatype: ZCLDataTypes.uint8,   // Datatype ID
          length: ZCLDataTypes.data16,    // Length of data
          data: ZCLDataTypes.buffer,      // Data payload
        },
      },

      /**
       * Response to datapoint query (0x02) - device responds to our request
       * Method onResponse() will be called and emit 'response' event
       */
      response: {
        id: 0x02,
        args: {
          status: ZCLDataTypes.uint8,     // Status byte
          transid: ZCLDataTypes.uint8,    // Transaction ID
          dp: ZCLDataTypes.uint8,         // Datapoint ID
          datatype: ZCLDataTypes.uint8,   // Datatype ID
          length: ZCLDataTypes.data16,    // Length of data
          data: ZCLDataTypes.buffer,      // Data payload
        },
      },

      /**
       * Reporting configuration (0x06)
       */
      reportingConfiguration: {
        id: 0x06,
        args: {
          status: ZCLDataTypes.uint8,
          transid: ZCLDataTypes.uint8,
          dp: ZCLDataTypes.uint8,
          datatype: ZCLDataTypes.uint8,
          length: ZCLDataTypes.data16,
          data: ZCLDataTypes.buffer,
        },
      },

      /**
       * MCU sync time (0x24) - device requests time
       */
      mcuSyncTime: {
        id: 0x24,
        args: {
          utc: ZCLDataTypes.uint32,
          local: ZCLDataTypes.int32,
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.89: CRITICAL COMMANDS FOR TZE284 DEVICES
      // Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
      // These commands trigger the device to start reporting data!
      // ═══════════════════════════════════════════════════════════════════

      /**
       * Data Query (0x03) - Request device to report all DPs
       * Z2M: device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {})
       */
      dataQuery: {
        id: 0x03,
        args: {},  // No arguments needed
      },

      /**
       * MCU Version Request (0x10) - Magic Packet to configure device
       * Z2M: tuya.configureMagicPacket(device, coordinatorEndpoint)
       * This must be sent BEFORE dataQuery for TZE284 devices!
       */
      mcuVersionRequest: {
        id: 0x10,
        args: {},  // No arguments needed
      },

      /**
       * MCU Gateway Sniffer (0x25) - Extended time sync
       * Some devices need this for proper time sync
       */
      mcuGatewaySniffer: {
        id: 0x25,
        args: {
          payload: ZCLDataTypes.buffer,
        },
      },

      /**
       * Time Response (0x24) - Response to time sync request
       * Used to send time to device
       */
      timeResponse: {
        id: 0x24,
        manufacturerSpecific: true,
        args: {
          utcTime: ZCLDataTypes.uint32,
          localTime: ZCLDataTypes.uint32,
        },
      },
    };
  }

  /**
   * v5.5.89: Send Magic Packet sequence to TZE284 devices
   * This is what Z2M calls configureMagicPacket + dataQuery
   */
  async sendMagicPacket() {
    try {
      // Step 1: MCU Version Request
      await this.mcuVersionRequest({});

      // Small delay
      await new Promise(r => setTimeout(r, 100));

      // Step 2: Data Query
      await this.dataQuery({});

      return true;
    } catch (err) {
      throw new Error(`Magic packet failed: ${err.message}`);
    }
  }

  /**
   * v5.5.80: Added from Johan's working implementation
   * Method called when a 'response' command is received.
   * Emits a 'response' event with the response data.
   *
   * This is called automatically by zigbee-clusters SDK when the
   * command ID 0x01 (named 'response') is received.
   *
   * @param {Object} response - The response data from the device
   */
  onResponse(response) {
    this.emit('response', response);
  }

  /**
   * v5.5.80: Added from Johan's working implementation
   * Method called when a 'reporting' command is received.
   * Emits a 'reporting' event with the response data.
   *
   * This is called automatically by zigbee-clusters SDK when the
   * command ID 0x01 (named 'reporting') is received.
   *
   * @param {Object} response - The response data from the device
   */
  onReporting(response) {
    this.emit('reporting', response);
  }

  /**
   * v5.5.80: Added from Johan's working implementation
   * Method called when a 'reportingConfiguration' command is received.
   * Emits a 'reportingConfiguration' event with the response data.
   *
   * @param {Object} response - The response data from the device
   */
  onReportingConfiguration(response) {
    this.emit('reportingConfiguration', response);
  }

  /**
   * v5.5.95: Handler for MCU Sync Time request (0x24)
   * When device requests time, we respond automatically with current time
   * Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
   */
  onMcuSyncTime(data) {
    this.emit('mcuSyncTime', data);
    // Auto-respond with current time
    this.timeSync().catch(() => { });
  }

  /**
   * v5.5.95: Send time sync to device (TZE284 LCD clock sync)
   * This is CRITICAL for _TZE284_vvmbj46n (TH05Z) LCD display!
   *
   * The device expects:
   * - utcTime: Unix timestamp (seconds since 1970)
   * - localTime: Unix timestamp + timezone offset
   *
   * @param {Object} options - Optional time override
   * @param {number} options.utcTime - UTC timestamp in seconds
   * @param {number} options.localTime - Local timestamp in seconds
   */
  async timeSync(options = {}) {
    const now = new Date();
    const utcSeconds = options.utcTime || Math.floor(now.getTime() / 1000);
    const timezoneOffset = -now.getTimezoneOffset() * 60; // In seconds
    const localSeconds = options.localTime || (utcSeconds + timezoneOffset);

    try {
      await this.timeResponse({
        utcTime: utcSeconds,
        localTime: localSeconds,
      });
      return { utcTime: utcSeconds, localTime: localSeconds };
    } catch (err) {
      throw new Error(`Time sync failed: ${err.message}`);
    }
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
