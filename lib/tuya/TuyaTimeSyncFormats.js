'use strict';

/**
 * TuyaTimeSyncFormats - v5.5.388
 *
 * COMPREHENSIVE Time Synchronization Format Library
 * Based on Tuya MCU Protocol + Zigbee ZCL Cluster 0x000A + Community Research
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ EPOCH-BASED FORMATS (Timestamps)                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ZIGBEE_2000    │ 4 bytes BE │ Seconds since 2000-01-01 UTC                   ║
 * ║ ZIGBEE_2000_LE │ 4 bytes LE │ Seconds since 2000-01-01 UTC (some modules)    ║
 * ║ UNIX_1970      │ 4 bytes BE │ Seconds since 1970-01-01 UTC                   ║
 * ║ UNIX_1970_LE   │ 4 bytes LE │ Seconds since 1970-01-01 UTC                   ║
 * ║ UNIX_1970_MS   │ 8 bytes BE │ Milliseconds since 1970 (data logging)         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ DATE-STRING FORMATS (Decomposed bytes)                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ TUYA_STANDARD  │ 7 bytes │ [YY, MM, DD, HH, MM, SS, Weekday] LOCAL           ║
 * ║ TUYA_UTC       │ 7 bytes │ [YY, MM, DD, HH, MM, SS, Weekday] UTC             ║
 * ║ TUYA_MCU       │ 9 bytes │ [0x00, 0x07, YY, MM, DD, HH, MM, SS, Weekday]     ║
 * ║ TUYA_EXT_TZ    │ 9 bytes │ [YY, MM, DD, HH, MM, SS, Weekday, TZ_MSB, TZ_LSB] ║
 * ║ TUYA_FULL_TZ   │ 10 bytes│ [YY..., Weekday, TZ_h, TZ_m, DST]                 ║
 * ║ TUYA_GATEWAY   │ 12 bytes│ [YYYY:2, MM, DD, HH, MM, SS, Wd, TZ_h, TZ_m, DST] ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ DUAL TIMESTAMP FORMATS (8 bytes)                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ TUYA_DUAL_2000 │ 8 bytes │ [Local:4BE][UTC:4BE] epoch 2000 (LCD sensors)     ║
 * ║ TUYA_DUAL_1970 │ 8 bytes │ [Local:4BE][UTC:4BE] epoch 1970                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * DEVICE INTELLIGENCE LEVELS:
 * - "Dumb" devices: Display exactly what you send → Send LOCAL time
 * - "Smart" devices: Have internal TZ setting → Send UTC time + configure TZ DP
 *
 * WEEKDAY CONVENTION:
 * - Tuya: Monday=1, Tuesday=2, ..., Sunday=7
 * - JavaScript: Sunday=0, Monday=1, ..., Saturday=6
 * - Conversion: (jsDay === 0) ? 7 : jsDay
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TUYA_EPOCH_OFFSET = 946684800;    // Seconds from 1970-01-01 to 2000-01-01
const ZIGBEE_EPOCH_OFFSET = 946684800;  // Same as Tuya

// Format identifiers
const TIME_FORMAT = {
  // Epoch-based (4-8 bytes)
  ZIGBEE_2000: 'zigbee_2000',
  ZIGBEE_2000_LOCAL: 'zigbee_2000_local',
  ZIGBEE_2000_LE: 'zigbee_2000_le',
  UNIX_1970: 'unix_1970',
  UNIX_1970_LOCAL: 'unix_1970_local',
  UNIX_1970_LE: 'unix_1970_le',
  UNIX_1970_MS: 'unix_1970_ms',

  // Date-string (7-12 bytes)
  TUYA_STANDARD: 'tuya_standard',       // 7 bytes LOCAL
  TUYA_UTC: 'tuya_utc',                 // 7 bytes UTC
  TUYA_MCU: 'tuya_mcu',                 // 9 bytes with header
  TUYA_EXTENDED_TZ: 'tuya_ext_tz',      // 9 bytes with TZ
  TUYA_FULL_TZ: 'tuya_full_tz',         // 10 bytes with TZ + DST
  TUYA_GATEWAY: 'tuya_gateway',         // 12 bytes gateway format

  // Dual timestamp (8 bytes)
  TUYA_DUAL_2000: 'tuya_dual_2000',     // [Local:4][UTC:4] epoch 2000
  TUYA_DUAL_1970: 'tuya_dual_1970',     // [Local:4][UTC:4] epoch 1970

  AUTO: 'auto'
};

// Command/DP identifiers
const TIME_SYNC_CMD = {
  CLUSTER_TIME: 0x000A,         // Zigbee ZCL Time Cluster
  CLUSTER_TUYA: 0xEF00,         // Tuya Private Cluster (61184)
  CMD_TIME_REQUEST: 0x24,       // Tuya time request command
  CMD_TIME_RESPONSE: 0x24,      // Tuya time response command
  DP_TIME_SYNC: 103,            // DP 103 - Time sync
  DP_TIME_FORMAT: 101,          // DP 101 - 12h/24h format
  DP_TIMEZONE: 102,             // DP 102 - Timezone (-12 to +12)
  DP_TIME_VALID: 106            // DP 106 - Time valid flag
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANUFACTURER FORMAT MAPPINGS
// Based on Z2M, ZHA, and community research
// ═══════════════════════════════════════════════════════════════════════════════

const MANUFACTURER_FORMAT_MAP = {
  // === LCD Climate Sensors (Round displays) - Use TUYA_DUAL_2000 ===
  '_TZE200_bjawzodf': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE200_yjjdcqsq': TIME_FORMAT.TUYA_DUAL_2000,  // ZTH01
  '_TZE204_yjjdcqsq': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE284_yjjdcqsq': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE200_qoy0ekbd': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE200_znbl8dj5': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE284_znbl8dj5': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE200_locansqn': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE200_vvmbj46n': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE284_vvmbj46n': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE200_utkemkbs': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE204_utkemkbs': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE284_utkemkbs': TIME_FORMAT.TUYA_DUAL_2000,
  '_TZE284_5m4nchbm': TIME_FORMAT.TUYA_DUAL_2000,  // Router temp sensor

  // === Thermostats with TZ support - Use TUYA_EXTENDED_TZ or TUYA_FULL_TZ ===
  '_TZE200_ckud7u2l': TIME_FORMAT.TUYA_FULL_TZ,    // TRV
  '_TZE200_aoclfnxz': TIME_FORMAT.TUYA_EXTENDED_TZ, // Wall thermostat
  '_TZE200_kds0pmmv': TIME_FORMAT.TUYA_FULL_TZ,
  '_TZE200_bvu2wnxz': TIME_FORMAT.TUYA_EXTENDED_TZ,
  '_TZE200_c88teujp': TIME_FORMAT.TUYA_EXTENDED_TZ,
  '_TZE200_yw7cahqs': TIME_FORMAT.TUYA_FULL_TZ,

  // === MCU-based devices - Use TUYA_MCU ===
  '_TZE200_3towulqd': TIME_FORMAT.TUYA_MCU,        // PIR sensor
  '_TZE200_rhgsbacq': TIME_FORMAT.TUYA_MCU,        // ZG-204ZM
  '_TZE204_sxm7l9xa': TIME_FORMAT.TUYA_MCU,        // mmWave radar

  // === Simple devices - Use TUYA_STANDARD (local time) ===
  '_TZE200_cowvfni3': TIME_FORMAT.TUYA_STANDARD,   // Curtain motor
  '_TZE200_nv6nxo0c': TIME_FORMAT.TUYA_STANDARD,
  '_TZE200_fzo2pocs': TIME_FORMAT.TUYA_STANDARD,

  // === Zigbee ZCL devices - Use ZIGBEE_2000 ===
  '_TZ3000_': TIME_FORMAT.ZIGBEE_2000,             // Pattern match
  '_TZ3210_': TIME_FORMAT.ZIGBEE_2000,
  '_TYZB01_': TIME_FORMAT.ZIGBEE_2000,
};

// Model ID to format mapping
const MODEL_FORMAT_MAP = {
  'TS0601': TIME_FORMAT.TUYA_MCU,       // Default for TS0601
  'TS0201': TIME_FORMAT.ZIGBEE_2000,    // ZCL temp sensor
  'TS0203': TIME_FORMAT.ZIGBEE_2000,    // ZCL contact sensor
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIMEZONE DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

const TIMEZONE_DB = {
  'UTC': { offset: 0, name: 'UTC' },
  'GMT': { offset: 0, name: 'GMT' },
  'GMT+1': { offset: 60, name: 'CET', regions: ['Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam'] },
  'GMT+2': { offset: 120, name: 'EET/CEST', regions: ['Europe/Helsinki', 'Europe/Athens'] },
  'GMT+3': { offset: 180, name: 'MSK', regions: ['Europe/Moscow'] },
  'GMT+4': { offset: 240, name: 'GST', regions: ['Asia/Dubai'] },
  'GMT+5': { offset: 300, name: 'PKT', regions: ['Asia/Karachi'] },
  'GMT+5:30': { offset: 330, name: 'IST', regions: ['Asia/Kolkata'] },
  'GMT+6': { offset: 360, name: 'BST', regions: ['Asia/Dhaka'] },
  'GMT+7': { offset: 420, name: 'ICT', regions: ['Asia/Bangkok'] },
  'GMT+8': { offset: 480, name: 'CST', regions: ['Asia/Shanghai', 'Asia/Singapore'] },
  'GMT+9': { offset: 540, name: 'JST', regions: ['Asia/Tokyo'] },
  'GMT+10': { offset: 600, name: 'AEST', regions: ['Australia/Sydney'] },
  'GMT+12': { offset: 720, name: 'NZST', regions: ['Pacific/Auckland'] },
  'GMT-5': { offset: -300, name: 'EST', regions: ['America/New_York'] },
  'GMT-6': { offset: -360, name: 'CST', regions: ['America/Chicago'] },
  'GMT-7': { offset: -420, name: 'MST', regions: ['America/Denver'] },
  'GMT-8': { offset: -480, name: 'PST', regions: ['America/Los_Angeles'] },
  'GMT-10': { offset: -600, name: 'HST', regions: ['Pacific/Honolulu'] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class TuyaTimeSyncFormats {

  /**
   * Build time payload for given format
   * @param {string} format - TIME_FORMAT constant
   * @param {Object} options - { timezone: 'GMT+1' | 'auto', date: Date }
   * @returns {Buffer}
   */
  static buildPayload(format, options = {}) {
    const now = options.date || new Date();
    const tzMinutes = this._getTimezoneMinutes(options.timezone);

    // Calculate timestamps
    const unixUtc = Math.floor(now.getTime() / 1000);
    const unixLocal = unixUtc + (tzMinutes * 60);
    const zigbeeUtc = unixUtc - TUYA_EPOCH_OFFSET;
    const zigbeeLocal = zigbeeUtc + (tzMinutes * 60);

    // Date components
    const localDate = new Date(now.getTime() + (tzMinutes * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
    const utcDate = now;

    // Tuya weekday: 1=Mon, 7=Sun (JS: 0=Sun, 6=Sat)
    const weekdayLocal = localDate.getDay() === 0 ? 7 : localDate.getDay();
    const weekdayUtc = utcDate.getUTCDay() === 0 ? 7 : utcDate.getUTCDay();

    // DST detection
    const isDST = this._isDST(now);
    const tzHours = Math.floor(tzMinutes / 60);
    const tzMins = Math.abs(tzMinutes % 60);

    switch (format) {
      // ─────────────────────────────────────────────────────────────
      // EPOCH FORMATS
      // ─────────────────────────────────────────────────────────────
      case TIME_FORMAT.ZIGBEE_2000: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(Math.max(0, zigbeeUtc), 0);
        return buf;
      }

      case TIME_FORMAT.ZIGBEE_2000_LOCAL: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(Math.max(0, zigbeeLocal), 0);
        return buf;
      }

      case TIME_FORMAT.ZIGBEE_2000_LE: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(Math.max(0, zigbeeUtc), 0);
        return buf;
      }

      case TIME_FORMAT.UNIX_1970: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(unixUtc, 0);
        return buf;
      }

      case TIME_FORMAT.UNIX_1970_LOCAL: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(unixLocal, 0);
        return buf;
      }

      case TIME_FORMAT.UNIX_1970_LE: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(unixUtc, 0);
        return buf;
      }

      case TIME_FORMAT.UNIX_1970_MS: {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64BE(BigInt(now.getTime()), 0);
        return buf;
      }

      // ─────────────────────────────────────────────────────────────
      // DUAL TIMESTAMP FORMATS (8 bytes)
      // ─────────────────────────────────────────────────────────────
      case TIME_FORMAT.TUYA_DUAL_2000: {
        // [Local:4BE][UTC:4BE] - Epoch 2000 (for LCD climate sensors)
        const buf = Buffer.alloc(8);
        buf.writeUInt32BE(Math.max(0, zigbeeLocal), 0);  // Local FIRST
        buf.writeUInt32BE(Math.max(0, zigbeeUtc), 4);    // UTC SECOND
        return buf;
      }

      case TIME_FORMAT.TUYA_DUAL_1970: {
        // [Local:4BE][UTC:4BE] - Epoch 1970
        const buf = Buffer.alloc(8);
        buf.writeUInt32BE(unixLocal, 0);
        buf.writeUInt32BE(unixUtc, 4);
        return buf;
      }

      // ─────────────────────────────────────────────────────────────
      // DATE-STRING FORMATS (7-12 bytes)
      // ─────────────────────────────────────────────────────────────
      case TIME_FORMAT.TUYA_STANDARD:
        // 7 bytes: [YY, MM, DD, HH, MM, SS, Weekday] LOCAL
        return Buffer.from([
          localDate.getFullYear() - 2000,
          localDate.getMonth() + 1,
          localDate.getDate(),
          localDate.getHours(),
          localDate.getMinutes(),
          localDate.getSeconds(),
          weekdayLocal
        ]);

      case TIME_FORMAT.TUYA_UTC:
        // 7 bytes: [YY, MM, DD, HH, MM, SS, Weekday] UTC
        return Buffer.from([
          utcDate.getUTCFullYear() - 2000,
          utcDate.getUTCMonth() + 1,
          utcDate.getUTCDate(),
          utcDate.getUTCHours(),
          utcDate.getUTCMinutes(),
          utcDate.getUTCSeconds(),
          weekdayUtc
        ]);

      case TIME_FORMAT.TUYA_MCU:
        // 9 bytes: [Type=0x00, Len=0x07, YY, MM, DD, HH, MM, SS, Weekday]
        // Used via cluster 0xEF00, command 0x24
        return Buffer.from([
          0x00,  // Type
          0x07,  // Length (7 bytes follow)
          localDate.getFullYear() - 2000,
          localDate.getMonth() + 1,
          localDate.getDate(),
          localDate.getHours(),
          localDate.getMinutes(),
          localDate.getSeconds(),
          weekdayLocal
        ]);

      case TIME_FORMAT.TUYA_EXTENDED_TZ: {
        // 9 bytes: [YY, MM, DD, HH, MM, SS, Weekday, TZ_MSB, TZ_LSB]
        // TZ in minutes as signed 16-bit BE
        const buf = Buffer.alloc(9);
        buf.writeUInt8(localDate.getFullYear() - 2000, 0);
        buf.writeUInt8(localDate.getMonth() + 1, 1);
        buf.writeUInt8(localDate.getDate(), 2);
        buf.writeUInt8(localDate.getHours(), 3);
        buf.writeUInt8(localDate.getMinutes(), 4);
        buf.writeUInt8(localDate.getSeconds(), 5);
        buf.writeUInt8(weekdayLocal, 6);
        buf.writeInt16BE(tzMinutes, 7);
        return buf;
      }

      case TIME_FORMAT.TUYA_FULL_TZ:
        // 10 bytes: [YY, MM, DD, HH, MM, SS, Weekday, TZ_hour, TZ_min, DST]
        return Buffer.from([
          localDate.getFullYear() - 2000,
          localDate.getMonth() + 1,
          localDate.getDate(),
          localDate.getHours(),
          localDate.getMinutes(),
          localDate.getSeconds(),
          weekdayLocal,
          tzHours & 0xFF,
          tzMins,
          isDST ? 1 : 0
        ]);

      case TIME_FORMAT.TUYA_GATEWAY: {
        // 12 bytes: [YYYY_MSB, YYYY_LSB, MM, DD, HH, MM, SS, Weekday, TZ_h, TZ_m, DST, 0x00]
        const buf = Buffer.alloc(12);
        buf.writeUInt16BE(localDate.getFullYear(), 0);
        buf.writeUInt8(localDate.getMonth() + 1, 2);
        buf.writeUInt8(localDate.getDate(), 3);
        buf.writeUInt8(localDate.getHours(), 4);
        buf.writeUInt8(localDate.getMinutes(), 5);
        buf.writeUInt8(localDate.getSeconds(), 6);
        buf.writeUInt8(weekdayLocal, 7);
        buf.writeInt8(tzHours, 8);
        buf.writeUInt8(tzMins, 9);
        buf.writeUInt8(isDST ? 1 : 0, 10);
        buf.writeUInt8(0x00, 11);
        return buf;
      }

      default:
        // Default: TUYA_DUAL_2000 (safest for most devices)
        return this.buildPayload(TIME_FORMAT.TUYA_DUAL_2000, options);
    }
  }

  /**
   * Detect best format for device
   * @param {string} manufacturerName
   * @param {string} modelId
   * @returns {string} - TIME_FORMAT constant
   */
  static detectFormat(manufacturerName, modelId) {
    // Check exact manufacturer match
    if (manufacturerName && MANUFACTURER_FORMAT_MAP[manufacturerName]) {
      return MANUFACTURER_FORMAT_MAP[manufacturerName];
    }

    // Check manufacturer pattern
    if (manufacturerName) {
      for (const [pattern, format] of Object.entries(MANUFACTURER_FORMAT_MAP)) {
        if (pattern.endsWith('_') && manufacturerName.toLowerCase().startsWith(pattern.toLowerCase())) {
          return format;
        }
      }
    }

    // Check model ID
    if (modelId && MODEL_FORMAT_MAP[modelId]) {
      return MODEL_FORMAT_MAP[modelId];
    }

    // Default based on manufacturer pattern
    if (manufacturerName) {
      if (manufacturerName.match(/^_TZE(200|204|284)_/i)) {
        return TIME_FORMAT.TUYA_DUAL_2000;  // Most TS0601 devices
      }
      if (manufacturerName.match(/^_TZ3000_|^_TZ3210_|^_TYZB0/i)) {
        return TIME_FORMAT.ZIGBEE_2000;     // ZCL standard devices
      }
    }

    return TIME_FORMAT.TUYA_DUAL_2000;  // Safe default
  }

  /**
   * Get timezone offset in minutes
   * @param {string} timezone - 'auto' | 'GMT+1' | 'UTC' etc
   * @returns {number}
   */
  static _getTimezoneMinutes(timezone) {
    if (!timezone || timezone === 'auto') {
      return -new Date().getTimezoneOffset();
    }

    const tz = TIMEZONE_DB[timezone];
    if (tz) {
      return tz.offset;
    }

    // Parse GMT±X format
    const match = timezone.match(/^GMT([+-])?(\d+)(?::(\d+))?$/i);
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10);
      const mins = parseInt(match[3] || '0', 10);
      return sign * (hours * 60 + mins);
    }

    return -new Date().getTimezoneOffset();
  }

  /**
   * Detect Daylight Saving Time
   * @param {Date} date
   * @returns {boolean}
   */
  static _isDST(date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    return date.getTimezoneOffset() < stdOffset;
  }

  /**
   * Format payload as hex string for logging
   * @param {Buffer} payload
   * @returns {string}
   */
  static toHex(payload) {
    return payload.toString('hex').toUpperCase().match(/.{2}/g)?.join(' ') || '';
  }

  /**
   * Get human-readable format description
   * @param {string} format
   * @returns {string}
   */
  static getFormatDescription(format) {
    const descriptions = {
      [TIME_FORMAT.ZIGBEE_2000]: 'Zigbee ZCL (4 bytes BE, epoch 2000)',
      [TIME_FORMAT.ZIGBEE_2000_LE]: 'Zigbee ZCL LE (4 bytes LE, epoch 2000)',
      [TIME_FORMAT.UNIX_1970]: 'Unix timestamp (4 bytes BE, epoch 1970)',
      [TIME_FORMAT.UNIX_1970_MS]: 'Unix milliseconds (8 bytes BE)',
      [TIME_FORMAT.TUYA_STANDARD]: 'Tuya Standard (7 bytes local time)',
      [TIME_FORMAT.TUYA_UTC]: 'Tuya UTC (7 bytes UTC time)',
      [TIME_FORMAT.TUYA_MCU]: 'Tuya MCU (9 bytes with header)',
      [TIME_FORMAT.TUYA_EXTENDED_TZ]: 'Tuya Extended (9 bytes with TZ)',
      [TIME_FORMAT.TUYA_FULL_TZ]: 'Tuya Full TZ (10 bytes with DST)',
      [TIME_FORMAT.TUYA_GATEWAY]: 'Tuya Gateway (12 bytes full format)',
      [TIME_FORMAT.TUYA_DUAL_2000]: 'Tuya Dual (8 bytes [Local][UTC] epoch 2000)',
      [TIME_FORMAT.TUYA_DUAL_1970]: 'Tuya Dual (8 bytes [Local][UTC] epoch 1970)',
    };
    return descriptions[format] || format;
  }

  /**
   * Check if a message is a time sync request
   * Devices "hungry" for time send empty reports or read requests
   * @param {number} clusterId - 0x000A (ZCL Time) or 0xEF00 (Tuya)
   * @param {number} commandId - Command ID
   * @param {Buffer} payload - Payload data
   * @returns {Object} { isTimeRequest, format, source }
   */
  static isTimeSyncRequest(clusterId, commandId, payload) {
    // ZCL Time Cluster (0x000A) read request
    if (clusterId === 0x000A || clusterId === 10) {
      return { isTimeRequest: true, format: TIME_FORMAT.ZIGBEE_2000, source: 'ZCL_TIME_CLUSTER' };
    }

    // Tuya Private Cluster (0xEF00) time sync command (0x24)
    if ((clusterId === 0xEF00 || clusterId === 61184) && commandId === 0x24) {
      // Empty or minimal payload = time request
      if (!payload || payload.length === 0 || payload.length <= 2) {
        return { isTimeRequest: true, format: TIME_FORMAT.TUYA_MCU, source: 'TUYA_CMD_0x24' };
      }
    }

    // Tuya DP 103 (time sync DP) with empty value
    if ((clusterId === 0xEF00 || clusterId === 61184) && commandId === 0x01) {
      // Check if it's a DP report for DP 103 with empty/request flag
      if (payload && payload.length >= 2 && payload[0] === 103) {
        return { isTimeRequest: true, format: TIME_FORMAT.TUYA_DUAL_2000, source: 'TUYA_DP_103' };
      }
    }

    return { isTimeRequest: false, format: null, source: null };
  }

  /**
   * Parse incoming time from device (for validation/debugging)
   * @param {string} format - TIME_FORMAT constant
   * @param {Buffer} payload
   * @returns {Object} { valid, date, components }
   */
  static parsePayload(format, payload) {
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

    try {
      switch (format) {
        case TIME_FORMAT.ZIGBEE_2000: {
          const seconds = buf.readUInt32BE(0);
          const date = new Date((seconds + TUYA_EPOCH_OFFSET) * 1000);
          return { valid: true, date, seconds, epoch: 2000 };
        }

        case TIME_FORMAT.UNIX_1970: {
          const seconds = buf.readUInt32BE(0);
          const date = new Date(seconds * 1000);
          return { valid: true, date, seconds, epoch: 1970 };
        }

        case TIME_FORMAT.TUYA_STANDARD:
        case TIME_FORMAT.TUYA_UTC: {
          const year = 2000 + buf[0];
          const month = buf[1] - 1;
          const day = buf[2];
          const hour = buf[3];
          const min = buf[4];
          const sec = buf[5];
          const weekday = buf[6];
          const date = new Date(year, month, day, hour, min, sec);
          return { valid: true, date, components: { year, month: month + 1, day, hour, min, sec, weekday } };
        }

        case TIME_FORMAT.TUYA_DUAL_2000: {
          const localSeconds = buf.readUInt32BE(0);
          const utcSeconds = buf.readUInt32BE(4);
          const localDate = new Date((localSeconds + TUYA_EPOCH_OFFSET) * 1000);
          const utcDate = new Date((utcSeconds + TUYA_EPOCH_OFFSET) * 1000);
          return { valid: true, localDate, utcDate, localSeconds, utcSeconds };
        }

        default:
          return { valid: false, error: 'Unknown format' };
      }
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  /**
   * Get example payloads for documentation/testing
   * Example: May 20, 2024, 14:30:00 GMT+1
   * @returns {Object}
   */
  static getExamplePayloads() {
    const exampleDate = new Date('2024-05-20T14:30:00+01:00');
    const options = { timezone: 'GMT+1', date: exampleDate };

    return {
      'ZIGBEE_2000': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.ZIGBEE_2000, options)),
        desc: '769,617,000 seconds since 2000 (4 bytes BE)',
        example: '2D 3E D4 18'
      },
      'UNIX_1970': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.UNIX_1970, options)),
        desc: '1,716,216,600 seconds since 1970 (4 bytes BE)',
        example: '66 4B 5C 58'
      },
      'TUYA_STANDARD': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_STANDARD, options)),
        desc: '[YY, MM, DD, HH, MM, SS, Weekday] LOCAL',
        example: '18 05 14 0E 1E 00 01'
      },
      'TUYA_MCU': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_MCU, options)),
        desc: '[0x00, 0x07, YY, MM, DD, HH, MM, SS, Weekday]',
        example: '00 07 18 05 14 0E 1E 00 01'
      },
      'TUYA_EXTENDED_TZ': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_EXTENDED_TZ, options)),
        desc: '[YY..Wd, TZ_MSB, TZ_LSB] - TZ in minutes (60 = GMT+1)',
        example: '18 05 14 0E 1E 00 01 00 3C'
      },
      'TUYA_DUAL_2000': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_DUAL_2000, options)),
        desc: '[Local:4][UTC:4] epoch 2000 - For LCD sensors',
        example: '2D 3E E5 58 2D 3E D4 18'
      }
    };
  }

  /**
   * Get device intelligence level recommendation
   * @param {string} manufacturerName
   * @returns {Object} { level, recommendation, action }
   */
  static getDeviceIntelligence(manufacturerName) {
    // "Dumb" devices - display exactly what you send
    const dumbPatterns = [
      '_TZE200_cowvfni3', '_TZE200_nv6nxo0c', '_TZE200_fzo2pocs',
      '_TZE200_3towulqd', '_TZE200_rhgsbacq'
    ];

    // "Smart" devices - have internal TZ setting
    const smartPatterns = [
      '_TZE200_ckud7u2l', '_TZE200_aoclfnxz', '_TZE200_kds0pmmv',
      '_TZE200_yjjdcqsq', '_TZE204_yjjdcqsq', '_TZE284_yjjdcqsq'
    ];

    if (dumbPatterns.some(p => manufacturerName?.includes(p))) {
      return {
        level: 'DUMB',
        recommendation: 'Send LOCAL time (already adjusted for timezone)',
        action: 'Use TUYA_STANDARD with local time',
        format: TIME_FORMAT.TUYA_STANDARD
      };
    }

    if (smartPatterns.some(p => manufacturerName?.includes(p))) {
      return {
        level: 'SMART',
        recommendation: 'Send UTC time, device has internal TZ',
        action: 'Use TUYA_DUAL_2000 or check for TZ DP (102)',
        format: TIME_FORMAT.TUYA_DUAL_2000
      };
    }

    // Default - assume smart
    return {
      level: 'UNKNOWN',
      recommendation: 'Try TUYA_DUAL_2000 first, fallback to TUYA_STANDARD',
      action: 'Auto-detect based on device response',
      format: TIME_FORMAT.TUYA_DUAL_2000
    };
  }

  /**
   * Get DST transition dates for Europe (last Sunday of March/October)
   * @param {number} year
   * @returns {Object} { springForward, fallBack }
   */
  static getDSTTransitions(year) {
    // Last Sunday of March (spring forward)
    const march = new Date(year, 2, 31);
    while (march.getDay() !== 0) march.setDate(march.getDate() - 1);

    // Last Sunday of October (fall back)
    const october = new Date(year, 9, 31);
    while (october.getDay() !== 0) october.setDate(october.getDate() - 1);

    return {
      springForward: march,
      fallBack: october,
      description: `DST ${year}: Mar ${march.getDate()} → Oct ${october.getDate()}`
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE SETTINGS SCHEMA (for driver.compose.json)
// ═══════════════════════════════════════════════════════════════════════════════

const TIME_SYNC_SETTINGS = {
  time_sync_format: {
    type: 'dropdown',
    label: { en: 'Time Sync Format', fr: 'Format sync heure', nl: 'Tijdsync formaat' },
    hint: { en: 'Choose how time is sent to the device', fr: 'Choisir comment l\'heure est envoyée' },
    value: 'auto',
    values: [
      { id: 'auto', label: { en: 'Auto-detect', fr: 'Auto-détection' } },
      { id: 'zigbee_2000', label: { en: 'Zigbee Standard (epoch 2000)', fr: 'Zigbee Standard' } },
      { id: 'tuya_standard', label: { en: 'Tuya Raw (7 bytes)', fr: 'Tuya Raw' } },
      { id: 'tuya_mcu', label: { en: 'Tuya MCU (9 bytes)', fr: 'Tuya MCU' } },
      { id: 'tuya_dual_2000', label: { en: 'Tuya Dual (LCD sensors)', fr: 'Tuya Dual (capteurs LCD)' } },
      { id: 'tuya_ext_tz', label: { en: 'Tuya + Timezone', fr: 'Tuya + Fuseau horaire' } }
    ]
  },
  time_sync_timezone: {
    type: 'dropdown',
    label: { en: 'Timezone', fr: 'Fuseau horaire', nl: 'Tijdzone' },
    hint: { en: 'Timezone for time sync', fr: 'Fuseau horaire pour sync' },
    value: 'auto',
    values: [
      { id: 'auto', label: { en: 'Auto (system)', fr: 'Auto (système)' } },
      { id: 'UTC', label: { en: 'UTC / GMT' } },
      { id: 'GMT+1', label: { en: 'GMT+1 (Paris, Berlin)' } },
      { id: 'GMT+2', label: { en: 'GMT+2 (Helsinki, Athens)' } },
      { id: 'GMT-5', label: { en: 'GMT-5 (New York)' } },
      { id: 'GMT-8', label: { en: 'GMT-8 (Los Angeles)' } },
      { id: 'GMT+8', label: { en: 'GMT+8 (Shanghai, Singapore)' } }
    ]
  }
};

// Export everything
module.exports = TuyaTimeSyncFormats;
module.exports.TIME_FORMAT = TIME_FORMAT;
module.exports.TIME_SYNC_CMD = TIME_SYNC_CMD;
module.exports.TUYA_EPOCH_OFFSET = TUYA_EPOCH_OFFSET;
module.exports.TIMEZONE_DB = TIMEZONE_DB;
module.exports.MANUFACTURER_FORMAT_MAP = MANUFACTURER_FORMAT_MAP;
module.exports.MODEL_FORMAT_MAP = MODEL_FORMAT_MAP;
module.exports.TIME_SYNC_SETTINGS = TIME_SYNC_SETTINGS;
