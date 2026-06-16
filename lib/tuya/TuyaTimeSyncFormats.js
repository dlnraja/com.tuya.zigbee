'use strict';

/**
 * TuyaTimeSyncFormats - v6.0.0
 *
 * COMPREHENSIVE Time Synchronization Format Library
 * Based on Tuya MCU Protocol + Zigbee ZCL Cluster 0x000A + Z2M + ZHA + Community Research
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ EPOCH-BASED FORMATS (Timestamps)                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ZIGBEE_2000       │ 4 bytes BE │ Seconds since 2000-01-01 UTC               ║
 * ║ ZIGBEE_2000_LOCAL │ 4 bytes BE │ Seconds since 2000-01-01 LOCAL             ║
 * ║ ZIGBEE_2000_LE    │ 4 bytes LE │ Seconds since 2000-01-01 UTC (some mods)   ║
 * ║ UNIX_1970         │ 4 bytes BE │ Seconds since 1970-01-01 UTC               ║
 * ║ UNIX_1970_LOCAL   │ 4 bytes BE │ Seconds since 1970-01-01 LOCAL             ║
 * ║ UNIX_1970_LE      │ 4 bytes LE │ Seconds since 1970-01-01 UTC               ║
 * ║ UNIX_1970_MS      │ 8 bytes BE │ Milliseconds since 1970 (data logging)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ DUAL TIMESTAMP FORMATS (8 bytes)                                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ TUYA_DUAL_2000    │ 8 bytes │ [Local:4BE][UTC:4BE] epoch 2000 (LCD sensors) ║
 * ║ TUYA_DUAL_1970    │ 8 bytes │ [Local:4BE][UTC:4BE] epoch 1970               ║
 * ║ Z2M_DUAL_1970     │ 8 bytes │ [UTC:4BE][Local:4BE] epoch 1970 (Z2M order)  ║
 * ║ Z2M_DUAL_2000     │ 8 bytes │ [UTC:4BE][Local:4BE] epoch 2000 (Z2M order)  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ MCU UART PROTOCOL FORMATS (9-10 bytes)                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ TUYA_MCU         │ 9 bytes  │ [0x00,0x07, YY,MM,DD,HH,MM,SS,Weekday]       ║
 * ║ TUYA_MCU_HDR_10  │ 10 bytes │ [0x00,0x08, UTC:4BE, TZ_Signed:4BE]          ║
 * ║ TUYA_MCU_HDR_8   │ 8 bytes  │ [0x00,0x06, UTC:4BE, Local:4BE]              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ SEQUENCE-ECHO FORMATS (10 bytes)                                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ TUYA_SEQ_10       │ 10 bytes│ [Seq:2BE][UTC:4BE][Local:4BE] epoch 1970      ║
 * ║ TUYA_SEQ_10_E2K   │ 10 bytes│ [Seq:2BE][UTC:4BE][Local:4BE] epoch 2000      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ MINIMAL FORMATS                                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ZCL_5            │ 5 bytes  │ [UTC:4BE, Weekday:1] minimal LCD              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ DATE-STRING FORMATS (Decomposed bytes, 7-12 bytes)                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ TUYA_STANDARD    │ 7 bytes  │ [YY,MM,DD,HH,MM,SS,Wd] LOCAL                ║
 * ║ TUYA_UTC         │ 7 bytes  │ [YY,MM,DD,HH,MM,SS,Wd] UTC                  ║
 * ║ TUYA_EXT_TZ      │ 9 bytes  │ [YY..Wd, TZ_MSB, TZ_LSB]                    ║
 * ║ TUYA_FULL_TZ     │ 10 bytes │ [YY..Wd, TZ_h, TZ_m, DST]                   ║
 * ║ TUYA_GATEWAY     │ 12 bytes │ [YYYY:2,MM,DD,HH,MM,SS,Wd,TZ_h,TZ_m,DST,0]  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ COMMIT-TRIGGER FORMATS                                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ZT08_DP17_COMMIT  │ DP17   │ Bool write (DP 17 false) after time sync       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * ENDIANNESS MATRIX:
 * ┌─────────────────────┬───────────┬──────────┬──────────────────────┐
 * │ Format              │ Byte Order│ Epoch    │ ARM Compatible       │
 * ├─────────────────────┼───────────┼──────────┼──────────────────────┤
 * │ ZIGBEE_2000         │ Big-Endian│ 2000     │ Yes (BE native)      │
 * │ ZIGBEE_2000_LE      │ Lit-Endian│ 2000     │ Yes (SWAP required)  │
 * │ UNIX_1970           │ Big-Endian│ 1970     │ Yes (BE native)      │
 * │ UNIX_1970_LE        │ Lit-Endian│ 1970     │ Yes (SWAP required)  │
 * │ TUYA_DUAL_2000      │ Big-Endian│ 2000     │ Yes                  │
 * │ TUYA_MCU_HDR_10     │ Big-Endian│ 1970     │ Yes                  │
 * │ TUYA_SEQ_10         │ Big-Endian│ 1970     │ Yes                  │
 * │ TUYA_STANDARD       │ N/A (raw) │ N/A      │ Yes (1-byte fields)  │
 * │ ZCL_5               │ Big-Endian│ var      │ Yes                  │
 * └─────────────────────┴───────────┴──────────┴──────────────────────┘
 *
 * EPOCH OFFSETS:
 * - 1970 (Unix): 0 seconds (standard)
 * - 1990 (Tuya MCU): 631152000 seconds from 1970 (rare, some old MCU firmware)
 * - 2000 (Zigbee/ZCL): 946684800 seconds from 1970
 *
 * DEVICE INTELLIGENCE LEVELS:
 * - "Dumb" devices: Display exactly what you send -> Send LOCAL time
 * - "Smart" devices: Have internal TZ setting -> Send UTC time + configure TZ DP
 * - "ZT08" devices: Need time sync + DP17 commit trigger
 *
 * WEEKDAY CONVENTION:
 * - Tuya: Monday=1, Tuesday=2, ..., Sunday=7
 * - JavaScript: Sunday=0, Monday=1, ..., Saturday=6
 * - Conversion: (jsDay === 0) ? 7 : jsDay
 *
 * MCU UART PROTOCOL VERSIONS:
 * - v3.1: 8-byte response [UTC:4BE][Local:4BE], no sequence echo
 * - v3.2: 8-byte response, optional sequence in payloadSize
 * - v3.3: 10-byte response [Seq:2BE][UTC:4BE][Local:4BE], sequence REQUIRED
 * - v3.4: 10-byte + DP17 commit trigger (ZT08 weather station)
 * - v3.5: 10-byte with extended TZ or 7-byte date-string fallback
 *
 * STRING-BASED TIME FORMAT SIZES (for date-string formats):
 * ┌──────┬─────────────────────────────────────────────────────────┐
 * │ Size │ Mapping                                                 │
 * ├──────┼─────────────────────────────────────────────────────────┤
 * │  1   │ Single field only (weekday, or DST flag)                │
 * │  2   │ [Year-2000, Month] or [TZ_MSB, TZ_LSB]                 │
 * │  3   │ [Year-2000, Month, Day]                                 │
 * │  4   │ [Year-2000, Month, Day, Hour]                           │
 * │  5   │ [Year-2000, Month, Day, Hour, Minute] + ZCL_5 fallback │
 * │  6   │ [Year-2000, Month, Day, Hour, Minute, Second]          │
 * │  7   │ TUYA_STANDARD/TUYA_UTC: Full date + weekday            │
 * │  8   │ TUYA_DUAL + TUYA_MCU_HDR_8                             │
 * │  9   │ TUYA_MCU + TUYA_EXT_TZ                                 │
 * │ 10   │ TUYA_FULL_TZ + TUYA_SEQ_10 + TUYA_MCU_HDR_10          │
 * │ 11   │ TUYA_FULL_TZ + reserved byte                           │
 * │ 12   │ TUYA_GATEWAY: Full date + TZ + DST + padding           │
 * └──────┴─────────────────────────────────────────────────────────┘
 *
 * Sources:
 * - Z2M: zigbee-herdsman-converters/src/lib/tuya.ts (mcuSyncTime, timeStart)
 * - ZHA: zhaquirks/tuya/__init__.py (TuyaManufCluster time handling)
 * - Tuya MCU UART: developer.tuya.com/en/docs/iot-device-dev/rvc_time_service
 * - Z2M Issue #30054: Epoch 1970 vs 2000 for TS0601 devices
 * - Z2M Issue #29627: ZT08 clock sync with DP17 commit
 * - Z2M Issue #26078: TZE284_vvmbj46n TH05Z LCD sync
 * - Hubitat: Tuya Zigbee MCUsender time payload format
 * - SmartThings: Edge driver Tuya time attribute handling
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TUYA_EPOCH_OFFSET = 946684800;    // Seconds from 1970-01-01 to 2000-01-01
const ZIGBEE_EPOCH_OFFSET = 946684800;  // Same as Tuya
const TUYA_1990_EPOCH_OFFSET = 631152000; // Seconds from 1970-01-01 to 1990-01-01 (rare old MCU)

// Format identifiers
const TIME_FORMAT = {
  // ─── Epoch-based (4-8 bytes) ───
  ZIGBEE_2000: 'zigbee_2000',
  ZIGBEE_2000_LOCAL: 'zigbee_2000_local',
  ZIGBEE_2000_LE: 'zigbee_2000_le',
  UNIX_1970: 'unix_1970',
  UNIX_1970_LOCAL: 'unix_1970_local',
  UNIX_1970_LE: 'unix_1970_le',
  UNIX_1970_MS: 'unix_1970_ms',

  // ─── Dual timestamp (8 bytes) ───
  TUYA_DUAL_2000: 'tuya_dual_2000',     // [Local:4BE][UTC:4BE] epoch 2000
  TUYA_DUAL_1970: 'tuya_dual_1970',     // [Local:4BE][UTC:4BE] epoch 1970
  Z2M_DUAL_1970: 'z2m_dual_1970',       // [UTC:4BE][Local:4BE] epoch 1970 (Z2M tuya.ts order)
  Z2M_DUAL_2000: 'z2m_dual_2000',       // [UTC:4BE][Local:4BE] epoch 2000 (Z2M tuya.ts order)

  // ─── MCU UART Protocol (8-10 bytes) ───
  TUYA_MCU: 'tuya_mcu',                 // 9 bytes: [0x00,0x07, YY..Wd]
  TUYA_MCU_HDR_10: 'tuya_mcu_hdr_10',   // 10 bytes: [0x00,0x08, UTC:4BE, TZ_Signed:4BE]
  TUYA_MCU_HDR_8: 'tuya_mcu_hdr_8',     // 8 bytes: [0x00,0x06, UTC:4BE, Local:4BE]

  // ─── Sequence-echo (10 bytes) ───
  TUYA_SEQ_10: 'tuya_seq_10',           // [Seq:2BE, UTC:4BE, Local:4BE] epoch 1970
  TUYA_SEQ_10_E2K: 'tuya_seq_10_e2k',   // [Seq:2BE, UTC:4BE, Local:4BE] epoch 2000

  // ─── Minimal ───
  ZCL_5: 'zcl_5',                       // 5 bytes: [UTC:4BE, Weekday:1]

  // ─── Date-string (7-12 bytes) ───
  TUYA_STANDARD: 'tuya_standard',       // 7 bytes LOCAL
  TUYA_UTC: 'tuya_utc',                 // 7 bytes UTC
  TUYA_EXTENDED_TZ: 'tuya_ext_tz',      // 9 bytes with TZ
  TUYA_FULL_TZ: 'tuya_full_tz',         // 10 bytes with TZ + DST
  TUYA_GATEWAY: 'tuya_gateway',         // 12 bytes gateway format

  AUTO: 'auto'
};

// Command/DP identifiers
const TIME_SYNC_CMD = {
  CLUSTER_TIME: 0x000A,         // Zigbee ZCL Time Cluster
  CLUSTER_TUYA: 0xEF00,         // Tuya Private Cluster (61184)
  CMD_TIME_REQUEST: 0x24,       // Tuya time request command (MCU -> Host)
  CMD_TIME_RESPONSE: 0x24,      // Tuya time response command (Host -> MCU, same ID)
  CMD_TIME_GW_PUSH: 0x64,       // Gateway push time command (100 decimal)
  CMD_MCU_ALT_SYNC: 0x28,       // Alternative MCU sync (40 decimal, used by some gateways)
  DP_TIME_SYNC: 103,            // DP 103 - Time sync
  DP_TIME_FORMAT: 101,          // DP 101 - 12h/24h format
  DP_TIMEZONE: 102,             // DP 102 - Timezone (-12 to +12)
  DP_TIME_VALID: 106,           // DP 106 - Time valid flag
  DP_ZT08_COMMIT: 17,           // DP 17 - ZT08 clock commit trigger (write false after time sync)
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
    // EPOCH FORMATS (4-8 bytes)
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

    case TIME_FORMAT.Z2M_DUAL_1970: {
      // [UTC:4BE][Local:4BE] - Epoch 1970 (Z2M tuya.ts order: UTC first!)
      // Reference: zigbee-herdsman-converters tuya-lib.ts mcuSyncTime
      const buf = Buffer.alloc(8);
      buf.writeUInt32BE(unixUtc, 0);     // UTC FIRST (Z2M order)
      buf.writeUInt32BE(unixLocal, 4);   // Local SECOND
      return buf;
    }

    case TIME_FORMAT.Z2M_DUAL_2000: {
      // [UTC:4BE][Local:4BE] - Epoch 2000 (Z2M tuya.ts order)
      const buf = Buffer.alloc(8);
      buf.writeUInt32BE(Math.max(0, zigbeeUtc), 0);    // UTC FIRST
      buf.writeUInt32BE(Math.max(0, zigbeeLocal), 4);  // Local SECOND
      return buf;
    }

    // ─────────────────────────────────────────────────────────────
    // MCU UART PROTOCOL FORMATS (8-10 bytes)
    // ─────────────────────────────────────────────────────────────
    case TIME_FORMAT.TUYA_MCU: {
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
    }

    case TIME_FORMAT.TUYA_MCU_HDR_10: {
      // 10 bytes: [0x00, 0x08, UTC:4BE, TZ_Signed:4BE]
      // Used by TuyaTimeManager.js for TRV/thermostat devices
      // Header byte 0x08 = payload length (8 bytes of data follow)
      const buf = Buffer.alloc(10);
      buf.writeUInt8(0x00, 0);           // Type
      buf.writeUInt8(0x08, 1);           // Length (8 bytes follow)
      buf.writeUInt32BE(unixUtc, 2);     // UTC timestamp (epoch 1970)
      buf.writeInt32BE(tzMinutes * 60, 6); // Timezone offset in seconds (signed)
      return buf;
    }

    case TIME_FORMAT.TUYA_MCU_HDR_8: {
      // 8 bytes: [0x00, 0x06, UTC:3BE, TZ_Signed:1]
      // Compact MCU header: 3-byte UTC (seconds since 1970, 24-bit) + 1-byte TZ (hours)
      // Used by some older MCU firmware with limited buffer
      const utcTruncated = unixUtc & 0x00FFFFFF; // Lower 24 bits
      const buf = Buffer.alloc(8);
      buf.writeUInt8(0x00, 0);                        // Type
      buf.writeUInt8(0x06, 1);                        // Length (6 bytes follow)
      buf.writeUInt8((utcTruncated >> 16) & 0xFF, 2); // UTC byte 2 (MSB)
      buf.writeUInt8((utcTruncated >> 8) & 0xFF, 3);  // UTC byte 1
      buf.writeUInt8(utcTruncated & 0xFF, 4);          // UTC byte 0 (LSB)
      buf.writeUInt8(0x00, 5);                         // Padding
      buf.writeInt8(Math.round(tzMinutes / 60), 6);    // TZ offset in hours (signed)
      buf.writeUInt8(0x00, 7);                         // Reserved
      return buf;
    }

    // ─────────────────────────────────────────────────────────────
    // SEQUENCE-ECHO FORMATS (10 bytes)
    // ─────────────────────────────────────────────────────────────
    case TIME_FORMAT.TUYA_SEQ_10: {
      // [Seq:2BE][UTC:4BE][Local:4BE] - Epoch 1970
      // Standard mcuSyncTime response with sequence echo
      // Reference: Tuya MCU UART v3.3+ protocol
      const seq = options.sequenceNumber || 0;
      const buf = Buffer.alloc(10);
      buf.writeUInt16BE(seq, 0);          // Sequence number (echo from device)
      buf.writeUInt32BE(unixUtc, 2);      // UTC timestamp (epoch 1970)
      buf.writeUInt32BE(unixLocal, 6);    // Local timestamp
      return buf;
    }

    case TIME_FORMAT.TUYA_SEQ_10_E2K: {
      // [Seq:2BE][UTC:4BE][Local:4BE] - Epoch 2000
      const seq = options.sequenceNumber || 0;
      const buf = Buffer.alloc(10);
      buf.writeUInt16BE(seq, 0);
      buf.writeUInt32BE(Math.max(0, zigbeeUtc), 2);
      buf.writeUInt32BE(Math.max(0, zigbeeLocal), 6);
      return buf;
    }

    // ─────────────────────────────────────────────────────────────
    // MINIMAL FORMATS (5 bytes)
    // ─────────────────────────────────────────────────────────────
    case TIME_FORMAT.ZCL_5: {
      // [UTC:4BE, Weekday:1] - Minimal LCD sensors
      // Reference: TuyaTimeSyncHandler v1.2.0
      const epochSec = options.epoch === 2000 ? zigbeeUtc : unixUtc;
      const buf = Buffer.alloc(5);
      buf.writeUInt32BE(epochSec, 0);
      buf.writeUInt8(weekdayLocal, 4);
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
   * @param {Object} options - { sequenceNumber, payloadSize }
   * @returns {string} - TIME_FORMAT constant
   */
  static detectFormat(manufacturerName, modelId, options = {}) {
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

    // Payload-size-based detection (from TuyaTimeSyncHandler v1.2.0)
    if (options.payloadSize) {
      const sizeMap = {
        5: TIME_FORMAT.ZCL_5,
        7: TIME_FORMAT.TUYA_STANDARD,
        8: TIME_FORMAT.TUYA_DUAL_2000,
        9: TIME_FORMAT.TUYA_MCU,
        10: TIME_FORMAT.TUYA_SEQ_10,
      };
      if (sizeMap[options.payloadSize]) {
        return sizeMap[options.payloadSize];
      }
    }

    // Sequence number presence suggests MCU v3.3+ format
    if (options.sequenceNumber && options.sequenceNumber > 0) {
      return TIME_FORMAT.TUYA_SEQ_10;
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
   * Guess the most likely time format for a device based on multiple heuristics.
   * Returns a ranked list of formats with confidence scores.
   *
   * @param {Object} deviceInfo - Device information
   * @param {string} deviceInfo.manufacturerName - Tuya manufacturer name (e.g., '_TZE200_bjawzodf')
   * @param {string} deviceInfo.productId - Product ID (e.g., 'TS0601', 'TS0201', 'TS130F')
   * @param {string} deviceInfo.driverClass - Driver class (e.g., 'sensor', 'thermostat', 'switch')
   * @param {Object} deviceInfo.endpoints - Endpoint info with clusters { 1: { inClusters: [], outClusters: [] } }
   * @param {string} deviceInfo.modelId - Model ID from settings
   * @returns {Object} { primary: string, confidence: number, candidates: Array<{format, score, reason}> }
   */
  static guessFormat(deviceInfo = {}) {
    const {
      manufacturerName = '',
      productId = '',
      driverClass = '',
      endpoints = {},
      modelId = '',
    } = deviceInfo;

    const mfr = manufacturerName.toLowerCase();
    const model = (productId || modelId).toUpperCase();
    const combined = `${manufacturerName}_${productId}_${modelId}`.toLowerCase();

    // Score accumulator: { format: number }
    const scores = {};

    // Helper to add score
    const addScore = (format, points, reason) => {
      scores[format] = (scores[format] || 0) + points;
      return reason;
    };

    const reasons = [];

    // ═══════════════════════════════════════════════════════════════════════════
    // HEURISTIC 1: Manufacturer prefix analysis
    // ═══════════════════════════════════════════════════════════════════════════
    if (mfr.startsWith('_tze200_') || mfr.startsWith('_tze204_') || mfr.startsWith('_tze284_')) {
      // TZE200/204/284 are MCU-based TS0601 devices
      addScore(TIME_FORMAT.TUYA_DUAL_2000, 30, 'TZE series = MCU-based TS0601');
      addScore(TIME_FORMAT.TUYA_MCU, 20, 'TZE series may use MCU format');
      addScore(TIME_FORMAT.TUYA_SEQ_10, 15, 'TZE series may need sequence echo');
      addScore(TIME_FORMAT.TUYA_STANDARD, 10, 'Fallback date-string format');
    } else if (mfr.startsWith('_tz3000_') || mfr.startsWith('_tz3210_') || mfr.startsWith('_tyzb0')) {
      // TZ3000/3210 are typically ZCL-compliant devices
      addScore(TIME_FORMAT.ZIGBEE_2000, 40, 'TZ3000/3210 = ZCL standard');
      addScore(TIME_FORMAT.ZIGBEE_2000_LE, 10, 'Some TZ3000 use LE');
      addScore(TIME_FORMAT.UNIX_1970, 5, 'Rare Unix epoch variant');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HEURISTIC 2: Product ID / Model analysis
    // ═══════════════════════════════════════════════════════════════════════════
    if (model === 'TS0601') {
      // TS0601 = Tuya MCU protocol
      addScore(TIME_FORMAT.TUYA_DUAL_2000, 25, 'TS0601 = Tuya MCU protocol');
      addScore(TIME_FORMAT.TUYA_MCU, 20, 'TS0601 may use MCU format');
      addScore(TIME_FORMAT.TUYA_SEQ_10, 15, 'TS0601 may need seq echo');
    } else if (model === 'TS0201') {
      // TS0201 = ZCL temperature/humidity sensor
      addScore(TIME_FORMAT.ZIGBEE_2000, 35, 'TS0201 = ZCL temp sensor');
      addScore(TIME_FORMAT.ZIGBEE_2000_LOCAL, 10, 'Some TS0201 need local time');
    } else if (model === 'TS0203') {
      // TS0203 = ZCL contact/door sensor
      addScore(TIME_FORMAT.ZIGBEE_2000, 35, 'TS0203 = ZCL contact sensor');
    } else if (model === 'TS0207') {
      // TS0207 = ZCL water leak sensor
      addScore(TIME_FORMAT.ZIGBEE_2000, 35, 'TS0207 = ZCL water sensor');
    } else if (model === 'TS130F') {
      // TS130F = Curtain/blind controller
      addScore(TIME_FORMAT.TUYA_STANDARD, 30, 'TS130F = curtain controller');
      addScore(TIME_FORMAT.TUYA_MCU, 15, 'TS130F may use MCU format');
    } else if (model.includes('TS0') || model.includes('TS1')) {
      // Other Tuya models
      addScore(TIME_FORMAT.TUYA_DUAL_2000, 15, 'Unknown TS model = likely MCU');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HEURISTIC 3: Endpoint cluster analysis
    // ═══════════════════════════════════════════════════════════════════════════
    const hasEF00 = this._checkClusterPresence(endpoints, 0xEF00);
    const hasTimeCluster = this._checkClusterPresence(endpoints, 0x000A);

    if (hasEF00) {
      // Has Tuya private cluster = MCU device
      addScore(TIME_FORMAT.TUYA_DUAL_2000, 20, 'Has Tuya EF00 cluster');
      addScore(TIME_FORMAT.TUYA_MCU, 15, 'EF00 cluster = MCU protocol');
    }

    if (hasTimeCluster) {
      // Has ZCL Time cluster = likely supports standard Zigbee time
      addScore(TIME_FORMAT.ZIGBEE_2000, 25, 'Has ZCL Time cluster (0x000A)');
      addScore(TIME_FORMAT.ZIGBEE_2000_LOCAL, 10, 'May need local time via Time cluster');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HEURISTIC 4: Driver class hints
    // ═══════════════════════════════════════════════════════════════════════════
    const dc = driverClass.toLowerCase();

    if (dc.includes('thermostat') || dc.includes('trv') || dc.includes('radiator')) {
      addScore(TIME_FORMAT.TUYA_FULL_TZ, 20, 'Thermostat = needs TZ + DST');
      addScore(TIME_FORMAT.TUYA_EXTENDED_TZ, 15, 'Thermostat may use extended TZ');
      addScore(TIME_FORMAT.TUYA_MCU_HDR_10, 10, 'Some TRVs use MCU HDR format');
    } else if (dc.includes('sensor') && (dc.includes('climate') || dc.includes('temp') || dc.includes('humid'))) {
      addScore(TIME_FORMAT.TUYA_DUAL_2000, 25, 'LCD climate sensor = dual timestamp');
      addScore(TIME_FORMAT.TUYA_STANDARD, 10, 'Sensor may use standard format');
    } else if (dc.includes('switch') || dc.includes('plug') || dc.includes('socket')) {
      addScore(TIME_FORMAT.TUYA_STANDARD, 15, 'Switch/plug = standard format');
      addScore(TIME_FORMAT.TUYA_FULL_TZ, 10, 'May need TZ for scheduling');
    } else if (dc.includes('light') || dc.includes('bulb')) {
      addScore(TIME_FORMAT.TUYA_STANDARD, 15, 'Light = standard format');
      addScore(TIME_FORMAT.ZIGBEE_2000, 10, 'Some lights use ZCL');
    } else if (dc.includes('cover') || dc.includes('curtain') || dc.includes('blind')) {
      addScore(TIME_FORMAT.TUYA_STANDARD, 20, 'Cover/curtain = standard format');
      addScore(TIME_FORMAT.TUYA_MCU, 10, 'Some curtains use MCU');
    } else if (dc.includes('lock')) {
      addScore(TIME_FORMAT.TUYA_STANDARD, 15, 'Lock = standard format');
      addScore(TIME_FORMAT.ZIGBEE_2000, 10, 'Lock may use ZCL');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HEURISTIC 5: Known device pattern matching
    // ═══════════════════════════════════════════════════════════════════════════

    // LCD sensors with round displays (TZE284 series)
    if (combined.includes('vvmbj46n') || combined.includes('qoy0ekbd') ||
        combined.includes('yjjdcqsq') || combined.includes('bawzodf') ||
        combined.includes('locansqn') || combined.includes('znbl8dj5')) {
      addScore(TIME_FORMAT.TUYA_DUAL_2000, 30, 'Known LCD climate sensor pattern');
    }

    // Thermostats with known patterns
    if (combined.includes('ckud7u2l') || combined.includes('kds0pmmv') ||
        combined.includes('yw7cahqs')) {
      addScore(TIME_FORMAT.TUYA_FULL_TZ, 25, 'Known thermostat with TZ');
    }

    if (combined.includes('aoclfnxz') || combined.includes('bvu2wnxz') ||
        combined.includes('c88teujp')) {
      addScore(TIME_FORMAT.TUYA_EXTENDED_TZ, 25, 'Known thermostat with extended TZ');
    }

    // MCU devices with known patterns
    if (combined.includes('3towulqd') || combined.includes('rhgsbacq') ||
        combined.includes('sxm7l9xa')) {
      addScore(TIME_FORMAT.TUYA_MCU, 25, 'Known MCU device pattern');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HEURISTIC 6: Model ID pattern matching
    // ═══════════════════════════════════════════════════════════════════════════
    if (modelId) {
      if (modelId.toLowerCase().includes('th') || modelId.toLowerCase().includes('temp')) {
        addScore(TIME_FORMAT.TUYA_DUAL_2000, 10, 'Model contains TH/temp');
      }
      if (modelId.toLowerCase().includes('trv') || modelId.toLowerCase().includes('valve')) {
        addScore(TIME_FORMAT.TUYA_FULL_TZ, 15, 'Model contains TRV/valve');
      }
      if (modelId.toLowerCase().includes('lcd') || modelId.toLowerCase().includes('display')) {
        addScore(TIME_FORMAT.TUYA_DUAL_2000, 15, 'Model contains LCD/display');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD RANKED CANDIDATE LIST
    // ═══════════════════════════════════════════════════════════════════════════
    const candidates = Object.entries(scores)
      .map(([format, score]) => ({ format, score, reason: reasons.find(r => r.format === format)?.reason || 'Combined heuristics' }))
      .sort((a, b) => b.score - a.score);

    // Normalize scores to confidence (0-100)
    const maxScore = candidates.length > 0 ? candidates[0].score : 1;
    const normalized = candidates.map(c => ({
      ...c,
      confidence: Math.min(100, Math.round((c.score / Math.max(maxScore, 1)) * 100)),
    }));

    // Primary format is the highest-scored one
    const primary = normalized.length > 0 ? normalized[0].format : TIME_FORMAT.TUYA_DUAL_2000;
    const confidence = normalized.length > 0 ? normalized[0].confidence : 50;

    return {
      primary,
      confidence,
      candidates: normalized,
      deviceInfo: {
        manufacturerName,
        productId,
        driverClass,
        modelId,
        hasEF00,
        hasTimeCluster,
      },
    };
  }

  /**
   * Check if a cluster exists on any endpoint
   * @param {Object} endpoints - { 1: { inClusters: [], outClusters: [] } }
   * @param {number} clusterId - Cluster ID to check
   * @returns {boolean}
   */
  static _checkClusterPresence(endpoints, clusterId) {
    if (!endpoints || typeof endpoints !== 'object') return false;

    for (const ep of Object.values(endpoints)) {
      const inClusters = ep?.inClusters || [];
      const outClusters = ep?.outClusters || [];
      const allClusters = [...inClusters, ...outClusters];

      if (allClusters.some(c => c === clusterId || c === `0x${clusterId.toString(16).toUpperCase()}`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get fallback chain for a primary format.
   * Returns an ordered list of formats to try if the primary fails.
   *
   * @param {string} primaryFormat - The primary format that failed
   * @param {Object} deviceInfo - Optional device info for smarter fallbacks
   * @returns {Array<{format: string, reason: string}>}
   */
  static getFallbackChain(primaryFormat, deviceInfo = {}) {
    const chain = [];

    // Alternate epoch (1970 vs 2000)
    const epochAlternates = {
      [TIME_FORMAT.ZIGBEE_2000]: [
        { format: TIME_FORMAT.UNIX_1970, reason: 'Try Unix epoch 1970 instead of Zigbee 2000' },
        { format: TIME_FORMAT.ZIGBEE_2000_LE, reason: 'Try little-endian byte order' },
      ],
      [TIME_FORMAT.ZIGBEE_2000_LE]: [
        { format: TIME_FORMAT.ZIGBEE_2000, reason: 'Try big-endian byte order' },
        { format: TIME_FORMAT.UNIX_1970_LE, reason: 'Try Unix epoch with LE' },
      ],
      [TIME_FORMAT.UNIX_1970]: [
        { format: TIME_FORMAT.ZIGBEE_2000, reason: 'Try Zigbee epoch 2000 instead of Unix 1970' },
        { format: TIME_FORMAT.UNIX_1970_LE, reason: 'Try little-endian byte order' },
      ],
      [TIME_FORMAT.UNIX_1970_LE]: [
        { format: TIME_FORMAT.UNIX_1970, reason: 'Try big-endian byte order' },
        { format: TIME_FORMAT.ZIGBEE_2000_LE, reason: 'Try Zigbee epoch with LE' },
      ],
    };

    // Dual timestamp alternates
    const dualAlternates = {
      [TIME_FORMAT.TUYA_DUAL_2000]: [
        { format: TIME_FORMAT.TUYA_DUAL_1970, reason: 'Try epoch 1970 dual timestamp' },
        { format: TIME_FORMAT.Z2M_DUAL_2000, reason: 'Try Z2M byte order (UTC first)' },
        { format: TIME_FORMAT.Z2M_DUAL_1970, reason: 'Try Z2M order with epoch 1970' },
      ],
      [TIME_FORMAT.TUYA_DUAL_1970]: [
        { format: TIME_FORMAT.TUYA_DUAL_2000, reason: 'Try epoch 2000 dual timestamp' },
        { format: TIME_FORMAT.Z2M_DUAL_1970, reason: 'Try Z2M byte order' },
      ],
      [TIME_FORMAT.Z2M_DUAL_2000]: [
        { format: TIME_FORMAT.TUYA_DUAL_2000, reason: 'Try Tuya byte order (Local first)' },
        { format: TIME_FORMAT.Z2M_DUAL_1970, reason: 'Try epoch 1970 Z2M order' },
      ],
      [TIME_FORMAT.Z2M_DUAL_1970]: [
        { format: TIME_FORMAT.TUYA_DUAL_1970, reason: 'Try Tuya byte order' },
        { format: TIME_FORMAT.Z2M_DUAL_2000, reason: 'Try epoch 2000 Z2M order' },
      ],
    };

    // MCU format alternates
    const mcuAlternates = {
      [TIME_FORMAT.TUYA_MCU]: [
        { format: TIME_FORMAT.TUYA_MCU_HDR_10, reason: 'Try MCU header 10-byte format' },
        { format: TIME_FORMAT.TUYA_MCU_HDR_8, reason: 'Try MCU header 8-byte format' },
        { format: TIME_FORMAT.TUYA_STANDARD, reason: 'Try date-string format (no header)' },
      ],
      [TIME_FORMAT.TUYA_MCU_HDR_10]: [
        { format: TIME_FORMAT.TUYA_MCU_HDR_8, reason: 'Try compact 8-byte MCU header' },
        { format: TIME_FORMAT.TUYA_MCU, reason: 'Try 9-byte MCU format' },
        { format: TIME_FORMAT.TUYA_SEQ_10, reason: 'Try sequence-echo format' },
      ],
      [TIME_FORMAT.TUYA_MCU_HDR_8]: [
        { format: TIME_FORMAT.TUYA_MCU_HDR_10, reason: 'Try extended 10-byte MCU header' },
        { format: TIME_FORMAT.TUYA_MCU, reason: 'Try 9-byte MCU format' },
      ],
    };

    // Sequence-echo alternates
    const seqAlternates = {
      [TIME_FORMAT.TUYA_SEQ_10]: [
        { format: TIME_FORMAT.TUYA_SEQ_10_E2K, reason: 'Try epoch 2000 sequence-echo' },
        { format: TIME_FORMAT.TUYA_MCU, reason: 'Try MCU format without sequence' },
        { format: TIME_FORMAT.TUYA_MCU_HDR_10, reason: 'Try MCU header format' },
      ],
      [TIME_FORMAT.TUYA_SEQ_10_E2K]: [
        { format: TIME_FORMAT.TUYA_SEQ_10, reason: 'Try epoch 1970 sequence-echo' },
        { format: TIME_FORMAT.TUYA_DUAL_2000, reason: 'Try dual timestamp format' },
      ],
    };

    // Date-string alternates
    const dateAlternates = {
      [TIME_FORMAT.TUYA_STANDARD]: [
        { format: TIME_FORMAT.TUYA_UTC, reason: 'Try UTC date-string instead of local' },
        { format: TIME_FORMAT.TUYA_EXTENDED_TZ, reason: 'Try with timezone info' },
        { format: TIME_FORMAT.TUYA_MCU, reason: 'Try MCU format with header' },
      ],
      [TIME_FORMAT.TUYA_UTC]: [
        { format: TIME_FORMAT.TUYA_STANDARD, reason: 'Try local date-string instead of UTC' },
        { format: TIME_FORMAT.TUYA_FULL_TZ, reason: 'Try full TZ format' },
      ],
      [TIME_FORMAT.TUYA_EXTENDED_TZ]: [
        { format: TIME_FORMAT.TUYA_FULL_TZ, reason: 'Try full TZ with DST flag' },
        { format: TIME_FORMAT.TUYA_STANDARD, reason: 'Try date-string without TZ' },
      ],
      [TIME_FORMAT.TUYA_FULL_TZ]: [
        { format: TIME_FORMAT.TUYA_EXTENDED_TZ, reason: 'Try extended TZ (no DST)' },
        { format: TIME_FORMAT.TUYA_STANDARD, reason: 'Try date-string without TZ' },
        { format: TIME_FORMAT.TUYA_GATEWAY, reason: 'Try 12-byte gateway format' },
      ],
      [TIME_FORMAT.TUYA_GATEWAY]: [
        { format: TIME_FORMAT.TUYA_FULL_TZ, reason: 'Try 10-byte TZ format' },
        { format: TIME_FORMAT.TUYA_STANDARD, reason: 'Try 7-byte standard format' },
      ],
    };

    // Get alternates for the primary format
    const allAlternates = {
      ...epochAlternates,
      ...dualAlternates,
      ...mcuAlternates,
      ...seqAlternates,
      ...dateAlternates,
    };

    if (allAlternates[primaryFormat]) {
      chain.push(...allAlternates[primaryFormat]);
    }

    // Always add safe defaults at the end
    const safeDefaults = [
      { format: TIME_FORMAT.TUYA_DUAL_2000, reason: 'Safe default for most Tuya devices' },
      { format: TIME_FORMAT.TUYA_STANDARD, reason: 'Universal date-string fallback' },
      { format: TIME_FORMAT.ZIGBEE_2000, reason: 'Standard Zigbee ZCL fallback' },
    ];

    // Add safe defaults if not already in chain
    for (const def of safeDefaults) {
      if (!chain.some(c => c.format === def.format) && def.format !== primaryFormat) {
        chain.push(def);
      }
    }

    return chain;
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
      // Epoch-based
      [TIME_FORMAT.ZIGBEE_2000]: 'Zigbee ZCL (4 bytes BE, epoch 2000)',
      [TIME_FORMAT.ZIGBEE_2000_LOCAL]: 'Zigbee ZCL Local (4 bytes BE, epoch 2000, local time)',
      [TIME_FORMAT.ZIGBEE_2000_LE]: 'Zigbee ZCL LE (4 bytes LE, epoch 2000)',
      [TIME_FORMAT.UNIX_1970]: 'Unix timestamp (4 bytes BE, epoch 1970)',
      [TIME_FORMAT.UNIX_1970_LOCAL]: 'Unix Local (4 bytes BE, epoch 1970, local time)',
      [TIME_FORMAT.UNIX_1970_LE]: 'Unix LE (4 bytes LE, epoch 1970)',
      [TIME_FORMAT.UNIX_1970_MS]: 'Unix milliseconds (8 bytes BE)',
      // Dual timestamp
      [TIME_FORMAT.TUYA_DUAL_2000]: 'Tuya Dual (8 bytes [Local][UTC] epoch 2000)',
      [TIME_FORMAT.TUYA_DUAL_1970]: 'Tuya Dual (8 bytes [Local][UTC] epoch 1970)',
      [TIME_FORMAT.Z2M_DUAL_1970]: 'Z2M Dual (8 bytes [UTC][Local] epoch 1970, Z2M order)',
      [TIME_FORMAT.Z2M_DUAL_2000]: 'Z2M Dual (8 bytes [UTC][Local] epoch 2000, Z2M order)',
      // MCU UART
      [TIME_FORMAT.TUYA_MCU]: 'Tuya MCU (9 bytes: [0x00,0x07,YY..Wd])',
      [TIME_FORMAT.TUYA_MCU_HDR_10]: 'Tuya MCU HDR-10 (10 bytes: [0x00,0x08,UTC:4,TZ:4])',
      [TIME_FORMAT.TUYA_MCU_HDR_8]: 'Tuya MCU HDR-8 (8 bytes: [0x00,0x06,UTC:4,Local:4])',
      // Sequence-echo
      [TIME_FORMAT.TUYA_SEQ_10]: 'Tuya Seq-Echo (10 bytes [Seq:2][UTC:4][Local:4] epoch 1970)',
      [TIME_FORMAT.TUYA_SEQ_10_E2K]: 'Tuya Seq-Echo (10 bytes [Seq:2][UTC:4][Local:4] epoch 2000)',
      // Minimal
      [TIME_FORMAT.ZCL_5]: 'ZCL-5 minimal (5 bytes: [UTC:4,Weekday:1])',
      // Date-string
      [TIME_FORMAT.TUYA_STANDARD]: 'Tuya Standard (7 bytes local time)',
      [TIME_FORMAT.TUYA_UTC]: 'Tuya UTC (7 bytes UTC time)',
      [TIME_FORMAT.TUYA_EXTENDED_TZ]: 'Tuya Extended (9 bytes with TZ minutes)',
      [TIME_FORMAT.TUYA_FULL_TZ]: 'Tuya Full TZ (10 bytes with DST)',
      [TIME_FORMAT.TUYA_GATEWAY]: 'Tuya Gateway (12 bytes full format)',
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
        return { isTimeRequest: true, format: TIME_FORMAT.TUYA_SEQ_10, source: 'TUYA_CMD_0x24' };
      }
      // Payload with sequence number
      if (payload.length === 2) {
        return { isTimeRequest: true, format: TIME_FORMAT.TUYA_SEQ_10, source: 'TUYA_CMD_0x24_SEQ' };
      }
    }

    // Tuya alternative time sync (0x28) - used by some gateways
    if ((clusterId === 0xEF00 || clusterId === 61184) && commandId === 0x28) {
      return { isTimeRequest: true, format: TIME_FORMAT.TUYA_SEQ_10, source: 'TUYA_CMD_0x28_ALT' };
    }

    // Tuya DP 103 (time sync DP) with empty value
    if ((clusterId === 0xEF00 || clusterId === 61184) && commandId === 0x01) {
      // Check if it's a DP report for DP 103 with empty/request flag
      if (payload && payload.length >= 2 && payload[0] === 103) {
        return { isTimeRequest: true, format: TIME_FORMAT.TUYA_DUAL_2000, source: 'TUYA_DP_103' };
      }
    }

    // Tuya MCU version response (0x11) / dataQuery (0x02) / dataReport (0x03)
    // Some devices expect implicit time sync during full MCU sync
    if ((clusterId === 0xEF00 || clusterId === 61184)) {
      if (commandId === 0x01 || commandId === 0x02 || commandId === 0x03 || commandId === 0x11) {
        return { isTimeRequest: true, format: TIME_FORMAT.TUYA_DUAL_2000, source: 'TUYA_MCU_IMPLICIT_SYNC' };
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
      // ─── Epoch-based ───
      case TIME_FORMAT.ZIGBEE_2000: {
        const seconds = buf.readUInt32BE(0);
        const date = new Date((seconds + TUYA_EPOCH_OFFSET) * 1000);
        return { valid: true, date, seconds, epoch: 2000 };
      }

      case TIME_FORMAT.ZIGBEE_2000_LE: {
        const seconds = buf.readUInt32LE(0);
        const date = new Date((seconds + TUYA_EPOCH_OFFSET) * 1000);
        return { valid: true, date, seconds, epoch: 2000 };
      }

      case TIME_FORMAT.ZIGBEE_2000_LOCAL: {
        const seconds = buf.readUInt32BE(0);
        const date = new Date((seconds + TUYA_EPOCH_OFFSET) * 1000);
        return { valid: true, date, seconds, epoch: 2000, isLocal: true };
      }

      case TIME_FORMAT.UNIX_1970: {
        const seconds = buf.readUInt32BE(0);
        const date = new Date(seconds * 1000);
        return { valid: true, date, seconds, epoch: 1970 };
      }

      case TIME_FORMAT.UNIX_1970_LE: {
        const seconds = buf.readUInt32LE(0);
        const date = new Date(seconds * 1000);
        return { valid: true, date, seconds, epoch: 1970 };
      }

      case TIME_FORMAT.UNIX_1970_LOCAL: {
        const seconds = buf.readUInt32BE(0);
        const date = new Date(seconds * 1000);
        return { valid: true, date, seconds, epoch: 1970, isLocal: true };
      }

      case TIME_FORMAT.UNIX_1970_MS: {
        const ms = Number(buf.readBigUInt64BE(0));
        const date = new Date(ms);
        return { valid: true, date, milliseconds: ms, epoch: 1970 };
      }

      // ─── Dual timestamp ───
      case TIME_FORMAT.TUYA_DUAL_2000: {
        const localSec = buf.readUInt32BE(0);
        const utcSec = buf.readUInt32BE(4);
        const localDt = new Date((localSec + TUYA_EPOCH_OFFSET) * 1000);
        const utcDt = new Date((utcSec + TUYA_EPOCH_OFFSET) * 1000);
        return { valid: true, localDate: localDt, utcDate: utcDt, localSeconds: localSec, utcSeconds: utcSec, epoch: 2000 };
      }

      case TIME_FORMAT.TUYA_DUAL_1970: {
        const localSec = buf.readUInt32BE(0);
        const utcSec = buf.readUInt32BE(4);
        const localDt = new Date(localSec * 1000);
        const utcDt = new Date(utcSec * 1000);
        return { valid: true, localDate: localDt, utcDate: utcDt, localSeconds: localSec, utcSeconds: utcSec, epoch: 1970 };
      }

      case TIME_FORMAT.Z2M_DUAL_1970: {
        const utcSec = buf.readUInt32BE(0);
        const localSec = buf.readUInt32BE(4);
        const utcDt = new Date(utcSec * 1000);
        const localDt = new Date(localSec * 1000);
        return { valid: true, localDate: localDt, utcDate: utcDt, localSeconds: localSec, utcSeconds: utcSec, epoch: 1970 };
      }

      case TIME_FORMAT.Z2M_DUAL_2000: {
        const utcSec = buf.readUInt32BE(0);
        const localSec = buf.readUInt32BE(4);
        const utcDt = new Date((utcSec + TUYA_EPOCH_OFFSET) * 1000);
        const localDt = new Date((localSec + TUYA_EPOCH_OFFSET) * 1000);
        return { valid: true, localDate: localDt, utcDate: utcDt, localSeconds: localSec, utcSeconds: utcSec, epoch: 2000 };
      }

      // ─── MCU UART ───
      case TIME_FORMAT.TUYA_MCU: {
        // [0x00, 0x07, YY, MM, DD, HH, MM, SS, Weekday]
        const year = 2000 + buf[2];
        const month = buf[3] - 1;
        const day = buf[4];
        const hour = buf[5];
        const min = buf[6];
        const sec = buf[7];
        const weekday = buf[8];
        const date = new Date(year, month, day, hour, min, sec);
        return { valid: true, date, components: { year, month: month + 1, day, hour, min, sec, weekday }, header: [buf[0], buf[1]] };
      }

      case TIME_FORMAT.TUYA_MCU_HDR_10: {
        // [0x00, 0x08, UTC:4BE, TZ_Signed:4BE]
        const utcSec = buf.readUInt32BE(2);
        const tzSec = buf.readInt32BE(6);
        const date = new Date(utcSec * 1000);
        return { valid: true, date, utcSeconds: utcSec, tzOffsetSeconds: tzSec, header: [buf[0], buf[1]] };
      }

      case TIME_FORMAT.TUYA_MCU_HDR_8: {
        // [0x00, 0x06, UTC:4BE, Local:4BE]
        const utcSec = buf.readUInt32BE(2);
        const localSec = buf.readUInt32BE(6);
        const utcDt = new Date(utcSec * 1000);
        const localDt = new Date(localSec * 1000);
        return { valid: true, utcDate: utcDt, localDate: localDt, utcSeconds: utcSec, localSeconds: localSec, header: [buf[0], buf[1]] };
      }

      // ─── Sequence-echo ───
      case TIME_FORMAT.TUYA_SEQ_10: {
        const seq = buf.readUInt16BE(0);
        const utcSec = buf.readUInt32BE(2);
        const localSec = buf.readUInt32BE(6);
        const utcDt = new Date(utcSec * 1000);
        const localDt = new Date(localSec * 1000);
        return { valid: true, sequenceNumber: seq, utcDate: utcDt, localDate: localDt, utcSeconds: utcSec, localSeconds: localSec, epoch: 1970 };
      }

      case TIME_FORMAT.TUYA_SEQ_10_E2K: {
        const seq = buf.readUInt16BE(0);
        const utcSec = buf.readUInt32BE(2);
        const localSec = buf.readUInt32BE(6);
        const utcDt = new Date((utcSec + TUYA_EPOCH_OFFSET) * 1000);
        const localDt = new Date((localSec + TUYA_EPOCH_OFFSET) * 1000);
        return { valid: true, sequenceNumber: seq, utcDate: utcDt, localDate: localDt, utcSeconds: utcSec, localSeconds: localSec, epoch: 2000 };
      }

      // ─── Minimal ───
      case TIME_FORMAT.ZCL_5: {
        const epochSec = buf.readUInt32BE(0);
        const weekday = buf[4];
        return { valid: true, epochSeconds: epochSec, weekday };
      }

      // ─── Date-string ───
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

      case TIME_FORMAT.TUYA_EXTENDED_TZ: {
        const year = 2000 + buf[0];
        const month = buf[1] - 1;
        const day = buf[2];
        const hour = buf[3];
        const min = buf[4];
        const sec = buf[5];
        const weekday = buf[6];
        const tzMinutes = buf.readInt16BE(7);
        const date = new Date(year, month, day, hour, min, sec);
        return { valid: true, date, components: { year, month: month + 1, day, hour, min, sec, weekday }, tzMinutes };
      }

      case TIME_FORMAT.TUYA_FULL_TZ: {
        const year = 2000 + buf[0];
        const month = buf[1] - 1;
        const day = buf[2];
        const hour = buf[3];
        const min = buf[4];
        const sec = buf[5];
        const weekday = buf[6];
        const tzHour = buf[7];
        const tzMin = buf[8];
        const dst = buf[9];
        const date = new Date(year, month, day, hour, min, sec);
        return { valid: true, date, components: { year, month: month + 1, day, hour, min, sec, weekday }, tzHour, tzMin, dst: dst === 1 };
      }

      case TIME_FORMAT.TUYA_GATEWAY: {
        const year = buf.readUInt16BE(0);
        const month = buf[2] - 1;
        const day = buf[3];
        const hour = buf[4];
        const min = buf[5];
        const sec = buf[6];
        const weekday = buf[7];
        const tzHour = buf.readInt8(8);
        const tzMin = buf[9];
        const dst = buf[10];
        const date = new Date(year, month, day, hour, min, sec);
        return { valid: true, date, components: { year, month: month + 1, day, hour, min, sec, weekday }, tzHour, tzMin, dst: dst === 1 };
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
      'TUYA_DUAL_2000': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_DUAL_2000, options)),
        desc: '[Local:4][UTC:4] epoch 2000 - LCD sensors (Local FIRST)',
        example: '2D 3E E5 58 2D 3E D4 18'
      },
      'Z2M_DUAL_1970': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.Z2M_DUAL_1970, options)),
        desc: '[UTC:4][Local:4] epoch 1970 - Z2M tuya.ts order (UTC FIRST)',
        example: '66 4B 5C 58 66 4B 89 18'
      },
      'TUYA_SEQ_10': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_SEQ_10, { ...options, sequenceNumber: 0x0001 })),
        desc: '[Seq:2][UTC:4][Local:4] epoch 1970 - Standard MCU v3.3+ response',
        example: '00 01 66 4B 5C 58 66 4B 89 18'
      },
      'TUYA_MCU_HDR_10': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_MCU_HDR_10, options)),
        desc: '[0x00,0x08,UTC:4,TZ:4] - MCU UART TRV format',
        example: '00 08 66 4B 5C 58 00 00 0E 10'
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
      'TUYA_FULL_TZ': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.TUYA_FULL_TZ, options)),
        desc: '[YY..Wd, TZ_h, TZ_m, DST]',
        example: '18 05 14 0E 1E 00 01 01 00 00'
      },
      'ZCL_5': {
        hex: this.toHex(this.buildPayload(TIME_FORMAT.ZCL_5, options)),
        desc: '[UTC:4BE, Weekday:1] - Minimal LCD',
        example: '2D 3E D4 18 01'
      },
    };
  }

  /**
   * Get device intelligence level recommendation
   * @param {string} manufacturerName
   * @returns {Object} { level, recommendation, action }
   */
  static getDeviceIntelligence(manufacturerName) {
    const mfrLower = (manufacturerName || '').toLowerCase();

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

    // "ZT08" devices - need time sync + DP17 commit trigger
    const zt08Patterns = [
      '_TZE284_hodyryli'  // ZT08 LCD weather station
    ];

    // MCU v3.3+ devices - need sequence echo
    const mcuV33Patterns = [
      '_TZE284_vvmbj46n', '_TZE200_vvmbj46n',  // TH05Z
      '_TZE284_qoy0ekbd', '_TZE200_qoy0ekbd',
      '_TZE284_oitavov2',  // ZG227C
    ];

    if (zt08Patterns.some(p => mfrLower.includes(p.toLowerCase()))) {
      return {
        level: 'ZT08',
        recommendation: 'Send time via mcuSyncTime + DP17 commit trigger (write false to DP 17 after 500ms)',
        action: 'Use TUYA_SEQ_10 then DP17 commit',
        format: TIME_FORMAT.TUYA_SEQ_10,
        commitDP: 17,
        commitDelay: 500,
      };
    }

    if (dumbPatterns.some(p => mfrLower.includes(p.toLowerCase()))) {
      return {
        level: 'DUMB',
        recommendation: 'Send LOCAL time (already adjusted for timezone)',
        action: 'Use TUYA_STANDARD with local time',
        format: TIME_FORMAT.TUYA_STANDARD
      };
    }

    if (mcuV33Patterns.some(p => mfrLower.includes(p.toLowerCase()))) {
      return {
        level: 'MCU_V33',
        recommendation: 'MCU v3.3+ requires sequence number echo in response',
        action: 'Use TUYA_SEQ_10 with echoed sequence number',
        format: TIME_FORMAT.TUYA_SEQ_10,
      };
    }

    if (smartPatterns.some(p => mfrLower.includes(p.toLowerCase()))) {
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
    while (march.getDay() !== 0) {march.setDate(march.getDate() - 1);}

    // Last Sunday of October (fall back)
    const october = new Date(year, 9, 31);
    while (october.getDay() !== 0) {october.setDate(october.getDate() - 1);}

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
module.exports.ZIGBEE_EPOCH_OFFSET = ZIGBEE_EPOCH_OFFSET;
module.exports.TUYA_1990_EPOCH_OFFSET = TUYA_1990_EPOCH_OFFSET;
module.exports.TIMEZONE_DB = TIMEZONE_DB;
module.exports.MANUFACTURER_FORMAT_MAP = MANUFACTURER_FORMAT_MAP;
module.exports.MODEL_FORMAT_MAP = MODEL_FORMAT_MAP;
module.exports.TIME_SYNC_SETTINGS = TIME_SYNC_SETTINGS;
module.exports.guessFormat = TuyaTimeSyncFormats.guessFormat.bind(TuyaTimeSyncFormats);
module.exports.getFallbackChain = TuyaTimeSyncFormats.getFallbackChain.bind(TuyaTimeSyncFormats);
