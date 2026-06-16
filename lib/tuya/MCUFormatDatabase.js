'use strict';

/**
 * MCUFormatDatabase - v1.0.0
 *
 * Comprehensive reference database mapping manufacturers + device IDs
 * to the correct time sync format.
 *
 * Sources:
 * - Z2M: zigbee-herdsman-converters/src/lib/tuya.ts (mcuSyncTime, timeStart)
 * - ZHA: zhaquirks/tuya/__init__.py (TuyaManufCluster time handling)
 * - Tuya MCU UART: developer.tuya.com/en/docs/iot-device-dev/rvc_time_service
 * - Community research and firmware analysis
 *
 * Time Format Legend:
 * - Z2M_DUAL_1970: [UTC:4BE][Local:4BE] epoch 1970 (Z2M default for timeStart: "1970")
 * - Z2M_DUAL_2000: [UTC:4BE][Local:4BE] epoch 2000 (Z2M default for timeStart: "2000")
 * - TUYA_DUAL_2000: [Local:4BE][UTC:4BE] epoch 2000 (Tuya LCD sensors)
 * - TUYA_MCU: [0x00,0x07,YY,MM,DD,HH,MM,SS,Wd] (MCU header format)
 * - TUYA_SEQ_10: [Seq:2BE][UTC:4BE][Local:4BE] epoch 1970 (MCU v3.3+)
 * - TUYA_STANDARD: [YY,MM,DD,HH,MM,SS,Wd] (7 bytes local)
 * - ZT08_DP17: Z2M_DUAL_1970 + DP17 commit trigger (ZT08 weather station)
 */

const { TIME_FORMAT } = require('./TuyaTimeSyncFormats');

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT CONSTANTS (Mapped to TuyaTimeSyncFormats.TIME_FORMAT)
// ═══════════════════════════════════════════════════════════════════════════════

const FORMAT = {
  // Z2M standard formats (8 bytes: UTC + Local)
  Z2M_1970: TIME_FORMAT.Z2M_DUAL_1970,       // [UTC:4BE][Local:4BE] epoch 1970
  Z2M_2000: TIME_FORMAT.Z2M_DUAL_2000,       // [UTC:4BE][Local:4BE] epoch 2000

  // Tuya standard formats (8 bytes: Local + UTC)
  TUYA_DUAL_2000: TIME_FORMAT.TUYA_DUAL_2000, // [Local:4BE][UTC:4BE] epoch 2000
  TUYA_DUAL_1970: TIME_FORMAT.TUYA_DUAL_1970, // [Local:4BE][UTC:4BE] epoch 1970

  // MCU header formats
  TUYA_MCU: TIME_FORMAT.TUYA_MCU,             // 9 bytes with header
  TUYA_MCU_HDR_10: TIME_FORMAT.TUYA_MCU_HDR_10, // 10 bytes with header
  TUYA_MCU_HDR_8: TIME_FORMAT.TUYA_MCU_HDR_8,   // 8 bytes compact header

  // Sequence echo formats (10 bytes: Seq + UTC + Local)
  TUYA_SEQ_10: TIME_FORMAT.TUYA_SEQ_10,       // [Seq:2BE][UTC:4BE][Local:4BE] epoch 1970
  TUYA_SEQ_10_E2K: TIME_FORMAT.TUYA_SEQ_10_E2K, // [Seq:2BE][UTC:4BE][Local:4BE] epoch 2000

  // Date-string formats
  TUYA_STANDARD: TIME_FORMAT.TUYA_STANDARD,   // [YY,MM,DD,HH,MM,SS,Wd] local
  TUYA_UTC: TIME_FORMAT.TUYA_UTC,             // [YY,MM,DD,HH,MM,SS,Wd] UTC
  TUYA_EXTENDED_TZ: TIME_FORMAT.TUYA_EXTENDED_TZ, // [YY..Wd, TZ_MSB, TZ_LSB]
  TUYA_FULL_TZ: TIME_FORMAT.TUYA_FULL_TZ,     // [YY..Wd, TZ_h, TZ_m, DST]

  // Minimal formats
  ZCL_5: TIME_FORMAT.ZCL_5,                   // [UTC:4BE, Weekday:1]

  // Special: ZT08 with DP17 commit (uses Z2M_1970 format but needs commit)
  ZT08_DP17: TIME_FORMAT.Z2M_DUAL_1970,       // Same as Z2M_1970 but requires DP17 commit
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANUFACTURER NAME → FORMAT MAPPING
// Priority: Exact match > Pattern match > Generic fallback
// Confidence: 100 = certain, 80+ = high, 60+ = medium, <60 = low
// ═══════════════════════════════════════════════════════════════════════════════

const MANUFACTURER_FORMAT_DB = {
  // ─────────────────────────────────────────────────────────────────────────────
  // LCD CLIMATE SENSORS - Use Z2M_DUAL_1970 (timeStart: "1970")
  // Z2M: TS0601_temperature_humidity_sensor_2, TS0601_temperature_humidity_sensor_3
  // Devices: ZTH01, ZTH02, ZTH05, ZTH08, TH05Z, etc.
  // ─────────────────────────────────────────────────────────────────────────────
  '_TZE200_yjjdcqsq': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2778', device: 'ZTH01' },
  '_TZE204_yjjdcqsq': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2778', device: 'ZTH01' },
  '_TZE284_yjjdcqsq': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2778', device: 'ZTH01' },
  '_TZE200_utkemkbs': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2782', device: 'SZTH02' },
  '_TZE204_utkemkbs': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2783', device: 'SZTH02' },
  '_TZE284_utkemkbs': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2784', device: 'SZTH02' },
  '_TZE200_9yapgbuv': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2781', device: 'ZTH02' },
  '_TZE204_9yapgbuv': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2785', device: 'ZTH02' },
  '_TZE284_9yapgbuv': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2780', device: 'ZTH02' },
  '_TZE200_upagmta9': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2789', device: 'ZTH05' },
  '_TZE204_upagmta9': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2786', device: 'ZTH05' },
  '_TZE284_upagmta9': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2797', device: 'ZTH05' },
  '_TZE200_cirvgep4': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2787', device: 'ZTH08-E' },
  '_TZE204_cirvgep4': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2792', device: 'ZTH08-E' },
  '_TZE200_d7lpruvi': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2794', device: 'ZTH08' },
  '_TZE204_d7lpruvi': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2788', device: 'ZTH08' },
  '_TZE284_d7lpruvi': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2796', device: 'ZTH08' },
  '_TZE284_hdyjyqjm': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2795', device: 'ZTH08' },
  '_TZE204_jygvp6fk': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2791', device: 'ZTH series' },
  '_TZE204_ksz749x8': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2798', device: 'ZTH series' },
  '_TZE204_1wnh8bqp': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2799', device: 'ZTH series' },
  '_TZE284_1wnh8bqp': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2800', device: 'ZTH series' },

  // ZTH05Z (TH05Z) - temperature humidity sensor with clock
  '_TZE200_vvmbj46n': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2868', device: 'ZTH05Z/TH05Z' },
  '_TZE284_vvmbj46n': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2868', device: 'ZTH05Z/TH05Z' },
  '_TZE200_w6n8jeuu': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2868', device: 'ZTH05Z' },
  '_TZE284_cwyqwqbf': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2868', device: 'ZTH05Z' },

  // TS0601_temperature_humidity_sensor_3 (generic)
  '_TZE200_s1xgth2u': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2833', device: 'TH sensor' },
  '_TZE200_t3xd7l44': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2833', device: 'TH sensor' },
  '_TZE284_kdqrazmy': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 2833', device: 'TH sensor' },

  // ─────────────────────────────────────────────────────────────────────────────
  // THERMOSTATIC RADIATOR VALVES (TRVs) - Use Z2M_DUAL_1970 (timeStart: "1970")
  // ─────────────────────────────────────────────────────────────────────────────

  // AR331 TRV
  '_TZE284_noixx2uz': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 4202', device: 'AR331 TRV' },

  // AR331Pro TRV
  '_TZE284_nbv4tdaz': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 4260', device: 'AR331Pro TRV' },

  // BAC-002-ALZB FCU thermostat
  '_TZE200_dzuqwsyg': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 6182', device: 'BAC-002-ALZB' },
  '_TZE204_dzuqwsyg': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 6182', device: 'BAC-002-ALZB' },

  // TV06 TRV (GIEX)
  '_TZE200_py4cm3he': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8208', device: 'TV06 TRV' },
  '_TZE200_x9axofse': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8209', device: 'ZTRV-ZX-TV02' },
  '_TZE200_lhzapfg9': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8210', device: 'ETT-8 TRV' },

  // TS0601_thermostat_2 (Cloud Even S366)
  '_TZE200_0hg58wyk': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8329', device: 'Cloud Even TRV' },

  // TS0601_thermostat_4
  '_TZE204_pcdmj88b': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8520', device: 'TRV thermostat' },
  '_TZE284_pcdmj88b': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8520', device: 'TRV thermostat' },

  // GTZ06 TRV (id3)
  '_TZE200_z1tyspqw': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8750', device: 'GTZ06 TRV' },
  '_TZE200_bvrlmajk': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8751', device: 'TRV07' },

  // TRV601/Moes TRV801_1
  '_TZE204_cvcu2p6e': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8844', device: 'SBDV-00185' },
  '_TZE204_rtrmfadk': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8845', device: 'TRV801_1' },

  // TRV602/Moes TRV801
  '_TZE204_9mjy74mp': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8925', device: 'TRV801' },
  '_TZE200_9mjy74mp': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8925', device: 'TRV801' },
  '_TZE200_rtrmfadk': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 8925', device: 'TRV801' },

  // TRV603-WZ
  '_TZE284_ymldrmzx': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 9292', device: 'TRV603-WZ' },

  // Beok wall thermostat (battery)
  '_TZE284_agcxaw3f': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 11435', device: 'Beok wall thermostat' },

  // Wall thermostat (AVATTO WT-100-BH)
  '_TZE204_gops3slb': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 11512', device: 'AVATTO WT-100-BH' },
  '_TZE284_gops3slb': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 11512', device: 'AVATTO WT-100-BH' },

  // Beok wall thermostat TGM50-ZB
  '_TZE204_mwomyz5n': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 11658', device: 'TGM50-ZB' },
  '_TZE204_cvub6xbb': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 11658', device: 'TGM50-ZB' },
  '_TZE284_cvub6xbb': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 11658', device: 'TGM50-ZB' },

  // M8 Pro weather station (forceTimeUpdates: true)
  '_TZE284_hodyryli': { format: FORMAT.ZT08_DP17, confidence: 100, source: 'Z2M tuya.ts line 1056', device: 'ZT08 weather station', notes: 'Needs DP17 commit after time sync' },

  // Nous LCD temperature humidity sensor (JM-TRH-ZGB-V1)
  '_TZE200_a8sdmlas': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M nous.ts line 140', device: 'Nous LCD TH sensor' },

  // TYBAC-006 FCU thermostat
  '_TZE204_mpbki2zm': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 17596', device: 'TYBAC-006' },

  // ThermoSphere thermostat
  '_TZE200_ha0vwoew': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 20264', device: 'ThermoSphere' },

  // GTZ10 TRV
  '_TZE200_pbo8cj0z': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 20435', device: 'GTZ10 TRV' },
  '_TZE200_eo6xhfbo': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 20435', device: 'GTZ10 TRV' },

  // Pilot wire heating module
  '_TZE204_d6i25bwg': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 21104', device: 'PO-BOCO-ELEC' },
  '_TZE204_3q3maeoo': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 21104', device: 'PO-BOCO-ELEC' },

  // TR-M3Z TRV
  '_TZE204_eekpf0ft': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 21383', device: 'TR-M3Z' },
  '_TZE284_eekpf0ft': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 21383', device: 'TR-M3Z' },

  // Smart thermostat for electric radiator
  '_TZE204_3regm3h6': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23150', device: 'Pilot wire thermostat' },
  '_TZE204_0hcjew5p': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23150', device: 'Pilot wire thermostat' },
  '_TZE204_6vwfjkcj': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23150', device: 'Pilot wire thermostat' },
  '_TZE284_3regm3h6': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23150', device: 'Pilot wire thermostat' },
  '_TZE204_ouy7vpm1': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23150', device: 'Pilot wire thermostat' },

  // AVATTO TRV14
  '_TZE204_vjpaih9f': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23954', device: 'AVATTO TRV' },
  '_TZE284_vjpaih9f': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 23954', device: 'AVATTO TRV' },

  // M9 Pro weather station
  '_TZE284_ltwbm23f': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 24389', device: 'M9 Pro weather', notes: 'timeStart: "1970" for M9 Pro' },

  // Smart temperature switch
  '_TZE200_mwgdizer': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 25122', device: 'Smart temp switch' },

  // L2-T-F-MF fan coil thermostat
  '_TZE284_4vbj3fxh': { format: FORMAT.Z2M_1970, confidence: 100, source: 'Z2M tuya.ts line 26266', device: 'Fan coil thermostat' },

  // ─────────────────────────────────────────────────────────────────────────────
  // THERMOSTATS - Use Z2M_DUAL_2000 (timeStart: "2000")
  // ─────────────────────────────────────────────────────────────────────────────

  // BAB-1413_Pro TRV
  '_TZE204_g2ki0ejr': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 7854', device: 'BAB-1413_Pro' },

  // PO-THCO-EAU TRV (Powernity)
  '_TZE204_tbgecldg': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 7971', device: 'PO-THCO-EAU' },
  '_TZE284_tbgecldg': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 7971', device: 'PO-THCO-EAU' },
  '_TZE200_tbgecldg': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 7971', device: 'PO-THCO-EAU' },

  // Eco-4160 TRV (Echos)
  '_TZE200_d3z1ukqw': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 8451', device: 'Eco-4160' },

  // AVATTO ME167_1 / TRV06_1b
  '_TZE200_p3dbf6qs': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 8609', device: 'ME167_1 TRV' },
  '_TZE200_hvaxb2tc': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 8610', device: 'TRV06_1b' },

  // Moes TRV801Z (requires 2000)
  '_TZE204_qyr2m29i': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 9025', device: 'TRV801Z', notes: 'Requires 2000 epoch' },

  // Moes ZHT-002
  '_TZE204_xalsoe3m': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 9192', device: 'ZHT-002' },

  // HY08WE wall thermostat
  '_TZE200_aoclfnxz': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 11180', device: 'HY08WE' },

  // ZWT07 wall thermostat
  '_TZE200_g9a3awaj': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 11196', device: 'ZWT07' },

  // Floor thermostat
  '_TZE200_edl8pz1k': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 18730', device: 'Floor thermostat' },
  '_TZE204_edl8pz1k': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 18730', device: 'Floor thermostat' },
  '_TZE204_6a4vxfnv': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 18730', device: 'Floor thermostat' },

  // TE-1Z floor heating
  '_TZE284_khah2lkr': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 18780', device: 'TE-1Z' },

  // PRO-900Z (ElectSmart)
  '_TZE204_tagezcph': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 18892', device: 'PRO-900Z' },

  // ACMELEC Daikin VRV
  '_TZE200_wem3gxyx': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 21582', device: 'AE-940K' },
  '_TZE284_mul9abs3': { format: FORMAT.Z2M_2000, confidence: 100, source: 'Z2M tuya.ts line 21626', device: 'AE-720K' },

  // ─────────────────────────────────────────────────────────────────────────────
  // LCD SENSORS WITH CLOCK - Use TUYA_DUAL_2000 (Local + UTC order)
  // These devices have round LCD displays and show time
  // ─────────────────────────────────────────────────────────────────────────────

  '_TZE200_bjawzodf': { format: FORMAT.TUYA_DUAL_2000, confidence: 95, source: 'TuyaTimeSyncFormats.js', device: 'LCD climate sensor' },
  '_TZE200_qoy0ekbd': { format: FORMAT.TUYA_DUAL_2000, confidence: 95, source: 'TuyaTimeSyncFormats.js', device: 'LCD climate sensor' },
  '_TZE200_znbl8dj5': { format: FORMAT.TUYA_DUAL_2000, confidence: 95, source: 'TuyaTimeSyncFormats.js', device: 'LCD climate sensor' },
  '_TZE284_znbl8dj5': { format: FORMAT.TUYA_DUAL_2000, confidence: 95, source: 'TuyaTimeSyncFormats.js', device: 'LCD climate sensor' },
  '_TZE200_locansqn': { format: FORMAT.TUYA_DUAL_2000, confidence: 95, source: 'TuyaTimeSyncFormats.js', device: 'LCD climate sensor' },
  '_TZE284_5m4nchbm': { format: FORMAT.TUYA_DUAL_2000, confidence: 95, source: 'TuyaTimeSyncFormats.js', device: 'Router temp sensor' },

  // ─────────────────────────────────────────────────────────────────────────────
  // THERMOSTATS WITH TZ SUPPORT
  // ─────────────────────────────────────────────────────────────────────────────

  '_TZE200_ckud7u2l': { format: FORMAT.TUYA_FULL_TZ, confidence: 90, source: 'TuyaTimeSyncFormats.js', device: 'TRV' },
  '_TZE200_kds0pmmv': { format: FORMAT.TUYA_FULL_TZ, confidence: 90, source: 'TuyaTimeSyncFormats.js', device: 'TRV' },
  '_TZE200_yw7cahqs': { format: FORMAT.TUYA_FULL_TZ, confidence: 90, source: 'TuyaTimeSyncFormats.js', device: 'TRV' },
  '_TZE200_bvu2wnxz': { format: FORMAT.TUYA_EXTENDED_TZ, confidence: 90, source: 'TuyaTimeSyncFormats.js', device: 'Wall thermostat' },
  '_TZE200_c88teujp': { format: FORMAT.TUYA_EXTENDED_TZ, confidence: 90, source: 'TuyaTimeSyncFormats.js', device: 'Wall thermostat' },

  // ─────────────────────────────────────────────────────────────────────────────
  // MCU-BASED DEVICES
  // ─────────────────────────────────────────────────────────────────────────────

  '_TZE200_3towulqd': { format: FORMAT.TUYA_MCU, confidence: 85, source: 'TuyaTimeSyncFormats.js', device: 'PIR sensor' },
  '_TZE200_rhgsbacq': { format: FORMAT.TUYA_MCU, confidence: 85, source: 'TuyaTimeSyncFormats.js', device: 'ZG-204ZM' },
  '_TZE204_sxm7l9xa': { format: FORMAT.TUYA_MCU, confidence: 85, source: 'TuyaTimeSyncFormats.js', device: 'mmWave radar' },

  // ─────────────────────────────────────────────────────────────────────────────
  // SIMPLE DEVICES - Use TUYA_STANDARD (local time)
  // ─────────────────────────────────────────────────────────────────────────────

  '_TZE200_cowvfni3': { format: FORMAT.TUYA_STANDARD, confidence: 85, source: 'TuyaTimeSyncFormats.js', device: 'Curtain motor' },
  '_TZE200_nv6nxo0c': { format: FORMAT.TUYA_STANDARD, confidence: 85, source: 'TuyaTimeSyncFormats.js', device: 'Switch' },
  '_TZE200_fzo2pocs': { format: FORMAT.TUYA_STANDARD, confidence: 85, source: 'TuyaTimeSyncFormats.js', device: 'Switch' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT ID → FORMAT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const PRODUCT_FORMAT_DB = {
  'TS0601': { format: FORMAT.Z2M_1970, confidence: 70, notes: 'Default for TS0601 - most need timeStart: "1970"' },
  'TS0201': { format: FORMAT.ZCL_5, confidence: 85, notes: 'ZCL temperature/humidity sensor' },
  'TS0203': { format: FORMAT.ZCL_5, confidence: 85, notes: 'ZCL contact/door sensor' },
  'TS0207': { format: FORMAT.ZCL_5, confidence: 85, notes: 'ZCL water leak sensor' },
  'TS130F': { format: FORMAT.TUYA_STANDARD, confidence: 80, notes: 'Curtain/blind controller' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE NAME/DESCRIPTION → FORMAT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const DEVICE_NAME_FORMAT_DB = {
  // Temperature/Humidity sensors
  'temperature_humidity_sensor': { format: FORMAT.Z2M_1970, confidence: 80, notes: 'Most TH sensors use epoch 1970' },
  'temp_humidity_sensor': { format: FORMAT.Z2M_1970, confidence: 80 },
  'lcd_temperature_humidity': { format: FORMAT.Z2M_1970, confidence: 85, notes: 'LCD TH sensors almost always 1970' },
  'climate_sensor': { format: FORMAT.TUYA_DUAL_2000, confidence: 75, notes: 'LCD climate sensors use dual 2000' },

  // Thermostats
  'thermostat': { format: FORMAT.Z2M_1970, confidence: 70, notes: 'Most thermostats use 1970' },
  'radiator_valve': { format: FORMAT.Z2M_1970, confidence: 75, notes: 'TRVs usually use 1970' },
  'trv': { format: FORMAT.Z2M_1970, confidence: 75 },
  'wall_thermostat': { format: FORMAT.Z2M_1970, confidence: 70 },
  'floor_thermostat': { format: FORMAT.Z2M_2000, confidence: 80, notes: 'Floor thermostats often use 2000' },

  // Switches and plugs
  'switch': { format: FORMAT.TUYA_STANDARD, confidence: 65, notes: 'Simple switches may not need time' },
  'plug': { format: FORMAT.TUYA_STANDARD, confidence: 65 },
  'socket': { format: FORMAT.TUYA_STANDARD, confidence: 65 },

  // Covers
  'curtain': { format: FORMAT.TUYA_STANDARD, confidence: 70 },
  'blind': { format: FORMAT.TUYA_STANDARD, confidence: 70 },
  'cover': { format: FORMAT.TUYA_STANDARD, confidence: 70 },

  // Weather stations
  'weather_station': { format: FORMAT.ZT08_DP17, confidence: 90, notes: 'ZT08 needs DP17 commit after time sync' },
  'weather_forecast': { format: FORMAT.Z2M_1970, confidence: 80 },

  // Presence sensors
  'presence_sensor': { format: FORMAT.Z2M_1970, confidence: 70 },
  'radar_sensor': { format: FORMAT.Z2M_1970, confidence: 70 },
  'mmwave': { format: FORMAT.Z2M_1970, confidence: 70 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MCU VERSION → FORMAT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const MCU_VERSION_FORMAT_DB = {
  // MCU v3.1-3.2: Basic time sync, no sequence echo
  '3.1': { format: FORMAT.Z2M_1970, confidence: 75, notes: 'Basic MCU, no sequence echo needed' },
  '3.2': { format: FORMAT.Z2M_1970, confidence: 75, notes: 'Basic MCU with optional sequence' },

  // MCU v3.3+: Sequence echo required
  '3.3': { format: FORMAT.TUYA_SEQ_10, confidence: 85, notes: 'Sequence echo required' },
  '3.4': { format: FORMAT.TUYA_SEQ_10, confidence: 85, notes: 'Sequence echo + DP17 commit for ZT08' },
  '3.5': { format: FORMAT.TUYA_SEQ_10, confidence: 85, notes: 'Extended TZ support' },

  // Generic MCU versions
  'MCU_V33': { format: FORMAT.TUYA_SEQ_10, confidence: 85, notes: 'MCU v3.3+ requires sequence echo' },
  'MCU_V34': { format: FORMAT.TUYA_SEQ_10, confidence: 85, notes: 'MCU v3.4+ with DP17 commit' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWN FIRMWARE BUGS AND WORKAROUNDS
// ═══════════════════════════════════════════════════════════════════════════════

const FIRMWARE_BUGS_DB = {
  // ZT08 weather station - Clock stays at 00:xx without DP17 commit
  '_TZE284_hodyryli': {
    bug: 'MCU silently ignores time sync without DP17 commit',
    workaround: 'Send time via mcuSyncTime, wait 500ms, then write false to DP 17',
    source: 'Z2M issue #29627',
    severity: 'critical',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'DP17_COMMIT',
      delay_ms: 500,
      dp: 17,
      value: false,
    },
  },

  // ZTH05Z - Clock drifts if time not updated frequently
  '_TZE200_vvmbj46n': {
    bug: 'Clock drifts significantly if not synced every hour',
    workaround: 'Force time updates every hour (forceTimeUpdates: true)',
    source: 'Z2M tuya.ts line 2878',
    severity: 'medium',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'FORCE_UPDATE',
      interval_ms: 3600000, // 1 hour
    },
  },
  '_TZE284_vvmbj46n': {
    bug: 'Clock drifts significantly if not synced every hour',
    workaround: 'Force time updates every hour (forceTimeUpdates: true)',
    source: 'Z2M tuya.ts line 2878',
    severity: 'medium',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'FORCE_UPDATE',
      interval_ms: 3600000,
    },
  },

  // TRV801Z - Requires epoch 2000, not 1970
  '_TZE204_qyr2m29i': {
    bug: 'Device expects epoch 2000, returns garbage with epoch 1970',
    workaround: 'Use timeStart: "2000" instead of default "1970"',
    source: 'Z2M issue #30054',
    severity: 'critical',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'EPOCH_OVERRIDE',
      required_epoch: 2000,
    },
  },
  '_TZE284_ltwbm23f': {
    bug: 'Device expects epoch 2000, returns garbage with epoch 1970',
    workaround: 'Use timeStart: "2000" instead of default "1970"',
    source: 'Z2M issue #30054',
    severity: 'critical',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'EPOCH_OVERRIDE',
      required_epoch: 2000,
    },
  },

  // M8 Pro - Weather condition only updates on power cycle
  '_TZE284_ltwbm23f': {
    bug: 'Weather condition and temperature only update on power cycle and once per hour',
    workaround: 'Accept hourly updates, no workaround for weather data',
    source: 'Z2M tuya.ts line 24389',
    severity: 'low',
    affected_formats: [FORMAT.Z2M_1970],
    fix: null,
  },

  // Beok wall thermostat - MCU version response causes issues
  '_TZE284_agcxaw3f': {
    bug: 'Enabling respondToMcuVersionResponse causes communication issues',
    workaround: 'Do not enable mcuVersionResponse for this device',
    source: 'Z2M issue #28455',
    severity: 'medium',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'DISABLE_MCU_VERSION_RESPONSE',
    },
  },

  // Wall thermostat - MCU version response causes issues
  '_TZE204_gops3slb': {
    bug: 'Enabling respondToMcuVersionResponse causes communication issues',
    workaround: 'Do not enable mcuVersionResponse for this device',
    source: 'Z2M issue #28455',
    severity: 'medium',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'DISABLE_MCU_VERSION_RESPONSE',
    },
  },
  '_TZE284_gops3slb': {
    bug: 'Enabling respondToMcuVersionResponse causes communication issues',
    workaround: 'Do not enable mcuVersionResponse for this device',
    source: 'Z2M issue #28455',
    severity: 'medium',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'DISABLE_MCU_VERSION_RESPONSE',
    },
  },

  // OTA can brick TRV
  '_TZE200_qsoecqlk': {
    bug: 'OTA update can brick the device',
    workaround: 'Do not perform OTA updates on this device',
    source: 'Z2M issue #18840',
    severity: 'critical',
    affected_formats: [FORMAT.Z2M_1970],
    fix: {
      type: 'DISABLE_OTA',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTIVE FALLBACK LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

const MANUFACTURER_PREFIX_RULES = [
  { prefix: '_TZE200_', default_format: FORMAT.Z2M_1970, confidence: 60, notes: 'TZE200 series defaults to 1970' },
  { prefix: '_TZE204_', default_format: FORMAT.Z2M_1970, confidence: 60, notes: 'TZE204 series defaults to 1970' },
  { prefix: '_TZE284_', default_format: FORMAT.Z2M_1970, confidence: 60, notes: 'TZE284 series defaults to 1970' },
  { prefix: '_TZ3000_', default_format: FORMAT.Z2M_2000, confidence: 50, notes: 'TZ3000 series may use ZCL 2000' },
  { prefix: '_TZ3210_', default_format: FORMAT.Z2M_2000, confidence: 50, notes: 'TZ3210 series may use ZCL 2000' },
  { prefix: '_TYZB01_', default_format: FORMAT.Z2M_2000, confidence: 50, notes: 'TYZB01 series may use ZCL 2000' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class MCUFormatDatabase {

  /**
   * Get the time sync format for a device based on manufacturer name.
   * @param {string} manufacturerName - Tuya manufacturer name (e.g., '_TZE200_yjjdcqsq')
   * @returns {Object|null} { format, confidence, source, device, notes } or null if not found
   */
  static getByManufacturer(manufacturerName) {
    if (!manufacturerName) return null;

    // Exact match
    const exact = MANUFACTURER_FORMAT_DB[manufacturerName];
    if (exact) return { ...exact, matchType: 'exact' };

    // Case-insensitive match
    const lower = manufacturerName.toLowerCase();
    for (const [key, value] of Object.entries(MANUFACTURER_FORMAT_DB)) {
      if (key.toLowerCase() === lower) {
        return { ...value, matchType: 'case_insensitive' };
      }
    }

    return null;
  }

  /**
   * Get the time sync format based on product/model ID.
   * @param {string} productId - Product ID (e.g., 'TS0601', 'TS0201')
   * @returns {Object|null} { format, confidence, notes }
   */
  static getByProductId(productId) {
    if (!productId) return null;
    const upper = productId.toUpperCase();
    return PRODUCT_FORMAT_DB[upper] || null;
  }

  /**
   * Get the time sync format based on device name/description.
   * @param {string} deviceName - Device name or description (case-insensitive)
   * @returns {Object|null} { format, confidence, notes }
   */
  static getByDeviceName(deviceName) {
    if (!deviceName) return null;
    const lower = deviceName.toLowerCase();

    for (const [key, value] of Object.entries(DEVICE_NAME_FORMAT_DB)) {
      if (lower.includes(key.toLowerCase())) {
        return { ...value, matchType: 'substring' };
      }
    }

    return null;
  }

  /**
   * Get the time sync format based on MCU version.
   * @param {string} mcuVersion - MCU version string (e.g., '3.3', 'MCU_V33')
   * @returns {Object|null} { format, confidence, notes }
   */
  static getByMcuVersion(mcuVersion) {
    if (!mcuVersion) return null;

    // Exact match
    const exact = MCU_VERSION_FORMAT_DB[mcuVersion];
    if (exact) return exact;

    // Partial match
    const lower = mcuVersion.toLowerCase();
    for (const [key, value] of Object.entries(MCU_VERSION_FORMAT_DB)) {
      if (lower.includes(key.toLowerCase())) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get known firmware bugs for a device.
   * @param {string} manufacturerName - Tuya manufacturer name
   * @returns {Object|null} Bug information with workaround
   */
  static getFirmwareBug(manufacturerName) {
    if (!manufacturerName) return null;
    return FIRMWARE_BUGS_DB[manufacturerName] || null;
  }

  /**
   * Predictive fallback: guess format for unknown devices based on multiple heuristics.
   * @param {Object} deviceInfo - Device information
   * @param {string} deviceInfo.manufacturerName - Tuya manufacturer name
   * @param {string} deviceInfo.productId - Product ID (e.g., 'TS0601')
   * @param {string} deviceInfo.driverClass - Driver class (e.g., 'sensor', 'thermostat')
   * @param {Object} deviceInfo.endpoints - Endpoint info with clusters
   * @param {string} deviceInfo.mcuVersion - MCU version string
   * @returns {Object} { format, confidence, candidates, reasons }
   */
  static predictFormat(deviceInfo = {}) {
    const {
      manufacturerName = '',
      productId = '',
      driverClass = '',
      endpoints = {},
      mcuVersion = '',
    } = deviceInfo;

    const candidates = [];
    const reasons = [];

    // 1. Check exact manufacturer match
    const mfrResult = this.getByManufacturer(manufacturerName);
    if (mfrResult) {
      candidates.push({ format: mfrResult.format, confidence: mfrResult.confidence, reason: `Manufacturer match: ${mfrResult.device || manufacturerName}` });
      reasons.push(`Exact manufacturer match: ${mfrResult.source}`);
    }

    // 2. Check product ID
    const prodResult = this.getByProductId(productId);
    if (prodResult) {
      candidates.push({ format: prodResult.format, confidence: prodResult.confidence, reason: `Product ID: ${productId}` });
      reasons.push(prodResult.notes);
    }

    // 3. Check MCU version
    const mcuResult = this.getByMcuVersion(mcuVersion);
    if (mcuResult) {
      candidates.push({ format: mcuResult.format, confidence: mcuResult.confidence, reason: `MCU version: ${mcuVersion}` });
      reasons.push(mcuResult.notes);
    }

    // 4. Check manufacturer prefix rules
    if (manufacturerName) {
      for (const rule of MANUFACTURER_PREFIX_RULES) {
        if (manufacturerName.toLowerCase().startsWith(rule.prefix.toLowerCase())) {
          candidates.push({ format: rule.default_format, confidence: rule.confidence, reason: `Manufacturer prefix: ${rule.prefix}` });
          reasons.push(rule.notes);
          break;
        }
      }
    }

    // 5. Check endpoint clusters
    const hasEF00 = this._checkClusterPresence(endpoints, 0xEF00);
    const hasTimeCluster = this._checkClusterPresence(endpoints, 0x000A);

    if (hasEF00) {
      candidates.push({ format: FORMAT.Z2M_1970, confidence: 65, reason: 'Has Tuya EF00 cluster' });
      reasons.push('EF00 cluster indicates MCU device, defaulting to 1970');
    }

    if (hasTimeCluster) {
      candidates.push({ format: FORMAT.Z2M_2000, confidence: 60, reason: 'Has ZCL Time cluster (0x000A)' });
      reasons.push('ZCL Time cluster indicates ZCL standard, may use 2000');
    }

    // 6. Driver class heuristics
    if (driverClass) {
      const dc = driverClass.toLowerCase();
      if (dc.includes('thermostat') || dc.includes('trv')) {
        candidates.push({ format: FORMAT.Z2M_1970, confidence: 55, reason: 'Thermostat class heuristic' });
        reasons.push('Thermostats typically use epoch 1970');
      } else if (dc.includes('sensor') && (dc.includes('climate') || dc.includes('temp'))) {
        candidates.push({ format: FORMAT.Z2M_1970, confidence: 55, reason: 'Climate sensor class heuristic' });
        reasons.push('Climate sensors typically use epoch 1970');
      }
    }

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Default fallback
    if (candidates.length === 0) {
      candidates.push({ format: FORMAT.Z2M_1970, confidence: 50, reason: 'Default fallback (epoch 1970)' });
      reasons.push('No specific match found, using Z2M default for TS0601 devices');
    }

    return {
      format: candidates[0].format,
      confidence: candidates[0].confidence,
      candidates,
      reasons,
      manufacturerName,
      productId,
    };
  }

  /**
   * Get the complete lookup result combining all databases.
   * @param {Object} deviceInfo - Device information
   * @returns {Object} { format, confidence, source, matchType, firmwareBug }
   */
  static lookup(deviceInfo = {}) {
    const {
      manufacturerName = '',
      productId = '',
      deviceName = '',
      mcuVersion = '',
      driverClass = '',
      endpoints = {},
    } = deviceInfo;

    // Priority 1: Exact manufacturer match
    const mfrExact = this.getByManufacturer(manufacturerName);
    if (mfrExact && mfrExact.matchType === 'exact') {
      return {
        format: mfrExact.format,
        confidence: mfrExact.confidence,
        source: mfrExact.source,
        matchType: 'manufacturer_exact',
        device: mfrExact.device,
        firmwareBug: this.getFirmwareBug(manufacturerName),
      };
    }

    // Priority 2: Case-insensitive manufacturer match
    if (mfrExact) {
      return {
        format: mfrExact.format,
        confidence: mfrExact.confidence,
        source: mfrExact.source,
        matchType: 'manufacturer_case_insensitive',
        device: mfrExact.device,
        firmwareBug: this.getFirmwareBug(manufacturerName),
      };
    }

    // Priority 3: Product ID match
    const prodMatch = this.getByProductId(productId);
    if (prodMatch) {
      return {
        format: prodMatch.format,
        confidence: prodMatch.confidence,
        source: 'Product ID database',
        matchType: 'product_id',
        firmwareBug: this.getFirmwareBug(manufacturerName),
      };
    }

    // Priority 4: MCU version match
    const mcuMatch = this.getByMcuVersion(mcuVersion);
    if (mcuMatch) {
      return {
        format: mcuMatch.format,
        confidence: mcuMatch.confidence,
        source: 'MCU version database',
        matchType: 'mcu_version',
        firmwareBug: this.getFirmwareBug(manufacturerName),
      };
    }

    // Priority 5: Device name match
    const nameMatch = this.getByDeviceName(deviceName);
    if (nameMatch) {
      return {
        format: nameMatch.format,
        confidence: nameMatch.confidence,
        source: 'Device name database',
        matchType: 'device_name',
        firmwareBug: this.getFirmwareBug(manufacturerName),
      };
    }

    // Priority 6: Predictive fallback
    const prediction = this.predictFormat(deviceInfo);
    return {
      format: prediction.format,
      confidence: prediction.confidence,
      source: 'Predictive fallback',
      matchType: 'predictive',
      candidates: prediction.candidates,
      reasons: prediction.reasons,
      firmwareBug: this.getFirmwareBug(manufacturerName),
    };
  }

  /**
   * Check if a cluster exists on any endpoint.
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
   * Get all entries for a specific format (for debugging/analysis).
   * @param {string} format - Format constant
   * @returns {Array} Array of entries using this format
   */
  static getEntriesByFormat(format) {
    const results = [];
    for (const [key, value] of Object.entries(MANUFACTURER_FORMAT_DB)) {
      if (value.format === format) {
        results.push({ manufacturer: key, ...value });
      }
    }
    return results;
  }

  /**
   * Get statistics about the database.
   * @returns {Object} Statistics
   */
  static getStats() {
    const formatCounts = {};
    for (const value of Object.values(MANUFACTURER_FORMAT_DB)) {
      formatCounts[value.format] = (formatCounts[value.format] || 0) + 1;
    }

    return {
      totalManufacturers: Object.keys(MANUFACTURER_FORMAT_DB).length,
      totalProducts: Object.keys(PRODUCT_FORMAT_DB).length,
      totalDeviceNames: Object.keys(DEVICE_NAME_FORMAT_DB).length,
      totalMcuVersions: Object.keys(MCU_VERSION_FORMAT_DB).length,
      totalFirmwareBugs: Object.keys(FIRMWARE_BUGS_DB).length,
      formatDistribution: formatCounts,
      confidenceDistribution: {
        high: Object.values(MANUFACTURER_FORMAT_DB).filter(e => e.confidence >= 90).length,
        medium: Object.values(MANUFACTURER_FORMAT_DB).filter(e => e.confidence >= 70 && e.confidence < 90).length,
        low: Object.values(MANUFACTURER_FORMAT_DB).filter(e => e.confidence < 70).length,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = MCUFormatDatabase;
module.exports.FORMAT = FORMAT;
module.exports.MANUFACTURER_FORMAT_DB = MANUFACTURER_FORMAT_DB;
module.exports.PRODUCT_FORMAT_DB = PRODUCT_FORMAT_DB;
module.exports.DEVICE_NAME_FORMAT_DB = DEVICE_NAME_FORMAT_DB;
module.exports.MCU_VERSION_FORMAT_DB = MCU_VERSION_FORMAT_DB;
module.exports.FIRMWARE_BUGS_DB = FIRMWARE_BUGS_DB;
module.exports.MANUFACTURER_PREFIX_RULES = MANUFACTURER_PREFIX_RULES;
