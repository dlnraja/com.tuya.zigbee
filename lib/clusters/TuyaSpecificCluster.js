'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * Tuya Specific Cluster (CLUSTERS.TUYA_EF00)  v5.10.5
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
 * @see https://developer.tuya.com / en/docs / iot/zigbee-cluster-introduction
 * @see https://github.com/dresden-elektronik/deconz-rest-plugin / wiki/Tuya-Data-Point-Protocol
 */
class TuyaSpecificCluster extends Cluster {

  static get ID() {
    return CLUSTERS.TUYA_EF00;
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
     * Structure based on: https://github.com / JohanBendz/com.tuya.zigbee / blob/master / lib/TuyaSpecificCluster.js
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
      // 
      // OUTGOING COMMAND (Homey  Device)
      // 

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

      // 
      // INCOMING COMMANDS (Device  Homey) - emit events via onResponse/onReporting!
      // 

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
       * v5.5.960: CRITICAL - Must capture sequence number from device request
       * and echo it back in the response!
       * 
       * Request format: [payloadSize:2] (usually contains the sequence number)
       * Response format: [seqHi:1][seqLo:1][UTC:4 BE][Local:4 BE] (10 bytes)
       */
      mcuSyncTime: {
        id: 0x24,
        args: {
          payloadSize: ZCLDataTypes.uint16,  // Contains sequence number from device
          payload: ZCLDataTypes.buffer,       // Additional payload data
        },
      },

      // 
      // v5.5.89: CRITICAL COMMANDS FOR TZE284 DEVICES
      // Source: https:
      // These commands trigger the device to start reporting data!
      // 

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
        // v5.8.54: Accept optional payload buffer (Tuya expects [seqHi:1][seqLo:1])
        // Empty args caused frame errors on some devices (diag cf2e5ebe)
        args: {
          data: ZCLDataTypes.buffer,
        },
      },

      /**
       * v5.10.2: MCU Version Response (0x11) - Device reports MCU firmware version
       * Payload: [seqHi:1][seqLo:1][version:1]  version byte = xx.yy.zzzz binary
       * Enables TuyaTimeSyncManager mcuVersionRsp event
       */
      mcuVersionResponse: {
        id: 0x11,
        args: {
          seq: ZCLDataTypes.uint16,
          version: ZCLDataTypes.uint8,
        },
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

      // v5.11.16: Removed duplicate timeResponse (id 0x24) - conflicts with mcuSyncTime above
      // Time sync now handled via mcuSyncTime with integer fallback in TuyaTimeSync.js

      // v5.10.5: Missing cmds  ZHA TUYA_SEND_DATA, Domoticz wiki
      sendData: {
        id: 0x04,
        args: {
          status: ZCLDataTypes.uint8,
          transid: ZCLDataTypes.uint8,
          dp: ZCLDataTypes.uint8,
          datatype: ZCLDataTypes.uint8,
          length: ZCLDataTypes.data16,
          data: ZCLDataTypes.buffer,
        },
      },
      statusReport: {
        id: 0x05,
        args: {
          status: ZCLDataTypes.uint8,
          transid: ZCLDataTypes.uint8,
          dp: ZCLDataTypes.uint8,
          datatype: ZCLDataTypes.uint8,
          length: ZCLDataTypes.data16,
          data: ZCLDataTypes.buffer,
        },
      },
      sceneQuery: {
        id: 0x09,
        args: { data: ZCLDataTypes.buffer },
      },
      sceneWakeup: {
        id: 0x0A,
        args: { data: ZCLDataTypes.buffer },
      },

      // v5.12.x: Comprehensive coverage  ensure ALL Tuya EF00 command IDs are defined
      dpStatusUpdate: { id: 0x07, args: { data: ZCLDataTypes.buffer } },
      dpQueryResponse: { id: 0x08, args: { data: ZCLDataTypes.buffer } },
      cmd0B: { id: 0x0B, args: { data: ZCLDataTypes.buffer } },
      cmd0C: { id: 0x0C, args: { data: ZCLDataTypes.buffer } },
      cmd0D: { id: 0x0D, args: { data: ZCLDataTypes.buffer } },
      cmd0E: { id: 0x0E, args: { data: ZCLDataTypes.buffer } },
      cmd0F: { id: 0x0F, args: { data: ZCLDataTypes.buffer } },
    };
  }

  /**
   * v5.5.89: Send Magic Packet sequence to TZE284 devices
   * This is what Z2M calls configureMagicPacket + dataQuery
   */
  async sendMagicPacket() {
    try {
      // Step 1: MCU Version Request
      await this.mcuVersionRequest({ data: Buffer.from([0x00, 0x00]) });

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

  // v5.10.5: Handlers for missing commands  prevent frame drops
  onSendData(response) { this.emit('sendData', response); }
  onStatusReport(response) { this.emit('statusReport', response); }
  onSceneQuery(response) { this.emit('sceneQuery', response); }
  onSceneWakeup(response) { this.emit('sceneWakeup', response); }

  // v5.12.x: Handlers for comprehensive Tuya EF00 command coverage
  onDpStatusUpdate(response) { this.emit('dpStatusUpdate', response); }
  onDpQueryResponse(response) { this.emit('dpQueryResponse', response); }
  onCmd0B(response) { this.emit('cmd0B', response); }
  onCmd0C(response) { this.emit('cmd0C', response); }
  onCmd0D(response) { this.emit('cmd0D', response); }
  onCmd0E(response) { this.emit('cmd0E', response); }
  onCmd0F(response) { this.emit('cmd0F', response); }

  /**
   * v5.10.2: Handler for MCU Version Response (0x11)
   * Decodes version byte (xx.yy.zzzz binary) and emits mcuVersionRsp event
   * This enables TuyaTimeSyncManager to trigger time sync on MCU heartbeat
   */
  onMcuVersionResponse(data) {
    const v = data?.version || 0;const decoded = `${(v >> 6) & 3}.${(v >> 4) & 3}.${v & 0xF}`;
    this.emit('mcuVersionRsp', { ...data, versionDecoded: decoded });
  }

  /**
   * v5.5.960: Handler for MCU Sync Time request (0x24)
   * When device requests time, we respond automatically with current time
   * 
   * CRITICAL: Must extract sequence number and include it in response!
   * Source: https://github.com / Koenkk/zigbee2mqtt / issues/26078
   */
  onMcuSyncTime(data) {
    // v5.5.960: Extract sequence number from payloadSize field
    const sequenceNumber = data?.payloadSize ?? 0;
    
    this.emit('mcuSyncTime', {
      ...data,
      sequenceNumber,
      timestamp: Date.now()
    });
    
    // Auto-respond with current time including sequence number
    this.timeSync({ 
      sequenceNumber,
      manufacturerName: this.device?.getSetting?.('zb_manufacturer_name') || null
    }).catch(() => { });
  }

  /**
   * v5.5.960: Send time sync to device (TZE284 LCD clock sync)
   * This is CRITICAL for _TZE284_vvmbj46n (TH05Z) LCD display!
   *
   * v5.5.960: CRITICAL FIX - Must include sequence number in response!
   * Format: [seqHi:1][seqLo:1][UTC:4 BE][Local:4 BE] (10 bytes)
   *
   * @param {Object} options - Optional overrides
   * @param {number} options.utcTime - UTC timestamp in seconds
   * @param {number} options.localTime - Local timestamp in seconds
   * @param {number} options.sequenceNumber - Sequence number from device request (CRITICAL!)
   */
  async timeSync(options = {}) {
    const ts = TuyaSpecificCluster.getTimestamps(options.manufacturerName || null);
    const utcSeconds = options.utcTime || ts.utc;
    const localSeconds = options.localTime || ts.local;
    const seqNum = options.sequenceNumber ?? 0;
    const mfr = CI.normalize(options.manufacturerName || '');

    try {
      // v5.5.960: Build payload based on device requirement
      // TZE284 LCD devices often expect exactly 8 bytes (UTC + Local)
      const use8Byte = mfr.includes('_tze284_');
      const payload = Buffer.alloc(use8Byte ? 8 : 10);
      
      if (use8Byte) {
        payload.writeUInt32BE(utcSeconds, 0);
        payload.writeUInt32BE(localSeconds, 4);
      } else {
        payload.writeUInt16BE(seqNum, 0);        // Sequence number (MUST echo from request!)
        payload.writeUInt32BE(utcSeconds, 2);    // UTC timestamp
        payload.writeUInt32BE(localSeconds, 6);  // Local timestamp
      }
      
      // Send as mcuSyncTime command with proper payload
      await this.mcuSyncTime({
        payloadSize: payload.length,
        payload,
      });
      
      return { utcTime: utcSeconds, localTime: localSeconds, sequenceNumber: seqNum };
    } catch (err) {
      throw new Error(`Time sync failed: ${err.message}`);
    }
  }
}

/**
 * Tuya Data Types
 * Used in dataType field of commands
 */
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
  if (!mfr) return false;
  const m = mfr.toLowerCase();
  // v5.13.5: Generically support all _TZE284_ multiframe devices
  if (m.includes('_tze284_')) return true;
  return this.EPOCH_2000_MFRS.some(e => m.includes(e.toLowerCase()));
};

TuyaSpecificCluster.getTimestamps = function(mfr) {
  const now = new Date();
  const unix = Math.floor(safeDivide(now.getTime(), 1000));
  const tz = safeMultiply(now.getTimezoneOffset(), -60);
  const e2k = this.needsEpoch2000(mfr);
  const utc = e2k ? (unix - this.EPOCH_2000) : unix;
  const local = utc + tz;
  return { utc, local, tz, epoch: e2k ? 2000 : 1970, unix };
};

TuyaSpecificCluster.DATA_TYPES = {
  RAW: 0x00,      // Raw bytes
  BOOL: 0x01,     // Boolean (1 byte)
  VALUE: 0x02,    // Integer (4 bytes, big-endian)
  STRING: 0x03,   // String (length-prefixed)
  ENUM: 0x04,     // Enum (1 byte)
  BITMAP: 0x05,   // Bitmap (1, 2, or 4 bytes)
  FAULT: 0x05,    // ZHA alias for BITMAP (TUYA_DP_TYPE_FAULT)
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


