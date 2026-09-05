'use strict';

/**
 * Presence Sensor Configurations - v8.0.0
 * Separated from device.js for better maintainability
 */

// Helper to normalize strings for comparison
const normalize = (s) => (s || '').toLowerCase().trim();
const containsCI = (s, sub) => normalize(s).includes(normalize(sub));

const SENSOR_CONFIGS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE A: ZY-M100 Standard (most common)
  'ZY_M100_STANDARD': {
    sensors: [
      '_TZE200_ges7h5mj', '_TZE204_ges7h5mj',
      '_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa',
      '_TZE200_holel4dk', '_TZE204_holel4dk',
      '_TZE200_sfiy8puu', '_TZE204_sfiy8puu',
      '_TZE200_pnyz5qpy', '_TZE204_pnyz5qpy',
      '_TZE200_qomxlryd', '_TZE204_qomxlryd',
      '_TZE200_xpq2rber', '_TZE204_xpq2rber',
      '_TZE200_ybwa4x5a', '_TZE204_ybwa4x5a',
      '_TZE204_mrf6vtua',
      '_TZE204_sfiy5tfs',
      '_TZE204_ikvncluo',
      '_TZE204_no6qtgtl',
    ],
    battery: false,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
       2: { cap: null, setting: 'sensitivity', min: 0, max: 9 },
       3: { cap: null, setting: 'near_distance', min: 0, max: 10 },
       4: { cap: null, setting: 'far_distance', min: 0, max: 10 },
       9: { cap: 'measure_luminance.distance', smartDivisor: true },
       12: { cap: 'measure_luminance', type: 'lux_direct' },
       101: { cap: null, setting: 'static_sensitivity', min: 0, max: 10 },
       102: { cap: null, setting: 'motion_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE A2: Mains-powered mmWave radars (230V ceiling/wall)
  // These devices report battery DPs but are actually mains-powered.
  // Battery capability and polling must be suppressed.
  'MAINS_POWERED_RADAR': {
    configName: 'MAINS_POWERED_RADAR',
    sensors: [
      '_TZE204_lyetpprm', '_TZE200_lyetpprm',
      '_TZE204_wukb7rhc', '_TZE200_wukb7rhc',
      '_TZE204_jva8ink8', '_TZE200_jva8ink8',
      // P102: SZR07U 24GHz (Z2M) — presence + fading_time
      '_TZE204_muvkrjr5', '_TZE200_muvkrjr5',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    suppressBatteryCapability: true,
    disableBatteryReporting: true,
    invertPresence: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: null, setting: 'sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'near_distance', min: 0, max: 10 },
      4: { cap: null, setting: 'far_distance', min: 0, max: 10 },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      101: { cap: null, setting: 'static_sensitivity', min: 0, max: 10 },
      102: { cap: null, setting: 'motion_sensitivity', min: 0, max: 10 },
      105: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
    }
  },

  // TYPE A3: MTG075/MTG035 relay presence radar family
  // Source: Zigbee2MQTT MTG075-ZB-RL / MTG035-ZB-RL and GitHub issue #87.
  // These are mains-powered ceiling radars with a relay exposed on DP108.
  'MTG075_ZB_RL_RELAY': {
    configName: 'MTG075_ZB_RL_RELAY',
    sensors: [
      '_TZE204_sbyx0lm6', '_TZE204_clrdrnya',
      '_TZE204_dtzziy1e', '_TZE204_iaeejhvf',
      '_TZE204_mtoaryre', '_TZE200_mp902om5',
      '_TZE204_pfayrzcw', '_TZE284_4qznlkbu',
      '_TZE200_clrdrnya', '_TZE200_sbyx0lm6',
      '_TZE284_clrdrnya', // compose FP family; avoid DEFAULT DP fallback
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    hasRelay: true,
    relayDp: 108,
    relayType: 'enum',
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    suppressBatteryCapability: true,
    disableBatteryReporting: true,
    invertPresence: false,
    // WHY(P2389): VicHY/clrdrnya firmware floods DP9 distance + DP104 lux (~196 msg/min, Z2M#14742).
    // Presence (DP1) stays immediate; telemetry coalesced in device.js.
    floodCalm: true,
    ultraAggressiveDebounce: true,
    dpThrottleMs: { 9: 2500, 104: 5000 },
    dpMinDelta: { 9: 0.15, 104: 2 },
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'shield_range', divisor: 100, min: 0, max: 8 },
      4: { cap: null, setting: 'detection_range', divisor: 100, min: 0, max: 8 },
      6: { cap: null, internal: 'equipment_status' },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      101: { cap: null, setting: 'entry_filter_time', divisor: 10, min: 0, max: 10 },
      102: { cap: null, setting: 'departure_delay', min: 0, max: 3600 },
      103: { cap: null, internal: 'cline' },
      104: { cap: 'measure_luminance', divisor: 10 },
      105: { cap: null, setting: 'entry_sensitivity', min: 0, max: 9 },
      106: { cap: null, setting: 'entry_distance_indentation', divisor: 100, min: 0, max: 8 },
      107: {
        cap: null,
        setting: 'breaker_mode',
        type: 'enum',
        enumMap: { 0: 'standard', 1: 'local' },
        reverseEnumMap: { standard: 0, local: 1 },
      },
      108: { cap: 'onoff', type: 'enum_onoff', enumMap: { 0: false, 1: true }, writable: true },
      109: {
        cap: null,
        setting: 'status_indication',
        type: 'enum',
        enumMap: { 0: false, 1: true },
        reverseEnumMap: { false: 0, true: 1, OFF: 0, ON: 1, off: 0, on: 1 },
      },
      110: { cap: null, setting: 'illuminance_threshold', divisor: 10, min: 0, max: 420 },
      111: {
        cap: null,
        setting: 'breaker_polarity',
        type: 'enum',
        enumMap: { 0: 'NC', 1: 'NO' },
        reverseEnumMap: { NC: 0, NO: 1, nc: 0, no: 1 },
      },
      112: { cap: null, setting: 'block_time', divisor: 10, min: 0, max: 10 },
      113: { cap: null, internal: 'parameter_setting_result' },
      114: { cap: null, internal: 'factory_parameters' },
      115: {
        cap: null,
        setting: 'sensor_mode',
        type: 'enum',
        enumMap: { 0: 'on', 1: 'off', 2: 'occupied', 3: 'unoccupied' },
        reverseEnumMap: { on: 0, off: 1, occupied: 2, unoccupied: 3 },
      },
    }
  },

  // TYPE B: 24GHz Ceiling Radar (gkfbdvyx variants)
  'ZY_M100_CEILING_24G': {
    configName: 'ZY_M100_CEILING_24G',
    sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx',
      '_TZE204_laokfqwu',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    ultraAggressiveDebounce: true,
    disableBatteryReporting: true,
    suppressBatteryCapability: true,
    invertPresence: false,
    presenceEnumMapping: { 0: false, 1: true, 2: true },
    motionThrottleEnabled: true,
    motionThrottleMs: 10000,
    motionDebounceMs: 5000,
    ignoreMovementState: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      2: { cap: null, internal: 'move_sensitivity' },
      3: { cap: null, internal: 'detection_distance_min', divisor: 100 },
      4: { cap: null, internal: 'detection_distance_max', divisor: 100 },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      101: { cap: null, internal: 'distance_tracking' },
      102: { cap: null, internal: 'presence_sensitivity' },
      103: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      105: { cap: null, internal: 'fading_time' },
    }
  },

  // TYPE B2: ZG-204ZV MULTISENSOR
  // P64.12: DP mapping aligned with Z2M herdsman-converters (canonical source).
  // Z2M ZG-204ZV uses: DP 102=fading_time, 104=humidity_calibration,
  // 105=temperature_calibration, 107=illuminance_interval, 108=indicator,
  // 109=temperature_unit. We previously had 102/103/104/105/107 SWAPPED.
  'ZG_204ZV_MULTISENSOR': {
    sensors: [
      '_TZE200_grgol3xp', '_TZE204_grgol3xp',
      '_TZE200_uli8wasj', '_TZE204_uli8wasj',
      '_TZE200_rhgsbacq', '_TZE204_rhgsbacq',
      '_TZE200_y8jijhba', '_TZE204_y8jijhba',
      'HOBEIAN',
      // WHY(P2415): do NOT list _TZ3000_8bxrzyxz here — din_rail couple, not ZG-204ZV
    ],
    modelId: 'ZG-204ZV',
    battery: true,
    hasIlluminance: true,
    noTemperature: false,
    noHumidity: false,
    luxSmoothingEnabled: true,
    luxMinChangePercent: 15,
    motionThrottleEnabled: true,
    motionThrottleMs: 5000,
    motionDebounceMs: 3000,
    noIasMotion: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: 'measure_humidity', divisor: 1 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      108: { cap: null, setting: 'indicator' },
      109: { cap: null, setting: 'temperature_unit' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', smartDivisor: true },
      2: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      103: { cap: null, setting: 'anti_interference' },
      104: { cap: null, setting: 'humidity_calibration', min: -30, max: 30 },
      105: { cap: null, setting: 'temperature_calibration', min: -20, max: 20 },
      107: { cap: null, setting: 'illuminance_interval', min: 1, max: 720 },
      // Best-effort extra DPs (not in Z2M, but observed in some firmware variants)
      3: { cap: 'measure_temperature', smartDivisor: true },
      4: { cap: 'measure_humidity', multiplier: 10 },
      9: { cap: 'measure_luminance', type: 'lux_direct' },
      10: { cap: 'measure_battery', divisor: 1 },
      11: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 19 },
      17: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      18: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      113: { cap: null, internal: 'radar_scene' },
      119: { cap: null, internal: 'radar_breathing' },
      122: { cap: null, internal: 'radar_energy' },
      123: { cap: null, internal: 'radar_static_energy' },
      124: { cap: null, internal: 'radar_self_test' },
    }
  },

  // TYPE D: TZE284_IADRO9BF (Low DP) — with multi-zone support (Idea #21)
  'TZE284_IADRO9BF': {
    configName: 'TZE284_IADRO9BF',
    sensors: [
      '_TZE284_iadro9bf', '_TZE204_iadro9bf',
      '_TZE204_qasjif9e', '_TZE284_qasjif9e',
      '_TZE204_ztqnh5cg', '_TZE284_ztqnh5cg',
      '_TZE284_sbyx0lm6',
      '_TZE284_debczeci',
      '_TZE284_ar5przmw',
      '_TZE284_rlytpmij', '_TZE284_pzm3wab5',
      '_TZE284_twybxdzl', '_TZE284_hgeqeyuv', '_TZE284_vceqncho',
      '_TZE284_who1jxwd', '_TZE284_9ovska9w', '_TZE284_bquwrqh1',
      '_TZE284_gw05grph', '_TZE284_chcnj5st',
      '_TZE200_qasjif9e',
      '_TZE200_ya4ft0w4', '_TZE204_ya4ft0w4',
      '_TZE200_sgfmfpiy', '_TZE204_sgfmfpiy',
      '_TZE200_ikvncluo', '_TZE200_nbkshs6k', '_TZE204_nbkshs6k',
      '_TZE204_bvfld3xc', '_TZE204_sbkgeilo',
      '_TZE200_f1pvdgoh', '_TZE200_hyhl5y36',
      '_TZE204_b8vxct9l', '_TZE204_hyt4iucb',
      '_TZE200_juzago6i',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    hasMultiZone: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    invertPresence: false,
    useIntelligentInference: true,
    useDistanceInference: true,
    useAggressivePolling: false,
    ultraAggressiveLuxSmoothing: true,
    luxSmoothingWindowMs: 120000,
    luxOscillationLock: true,
    ultraAggressiveDebounce: true,
    firmwareQuirks: {
      74: { presenceWorking: true, inferenceWeight: 0.2 },
      78: { presenceWorking: false, inferenceWeight: 1.0 },
    },
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool', useInference: true, unreliable: true },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'min_range', divisor: 100, min: 0, max: 950 },
      4: { cap: null, setting: 'max_range', divisor: 100, feedInference: true, min: 0, max: 950 },
      6: { cap: null, internal: 'self_test' },
      9: { cap: 'measure_luminance.distance', smartDivisor: true, feedInference: true, primaryInference: true },
      12: { cap: 'measure_luminance', type: 'lux_direct', ultraSmooth: true },
      // Idea #21: Multi-zone presence detection DPs
      13: { cap: 'alarm_motion.zone1', type: 'presence_bool', zone: 1 },
      14: { cap: 'alarm_motion.zone2', type: 'presence_bool', zone: 2 },
      15: { cap: 'alarm_motion.zone3', type: 'presence_bool', zone: 3 },
      16: { cap: 'measure_luminance.distance.zone1', smartDivisor: true, zone: 1 },
      17: { cap: 'measure_luminance.distance.zone2', smartDivisor: true, zone: 2 },
      18: { cap: 'measure_luminance.distance.zone3', smartDivisor: true, zone: 3 },
      19: { cap: 'measure_motion.classification', type: 'movement_enum', zone: 0 },
      101: { cap: null, setting: 'detection_delay', divisor: 10, min: 0, max: 100 },
      102: { cap: null, setting: 'fading_time', divisor: 10, min: 5, max: 15000 },
      104: { cap: 'alarm_motion', type: 'presence_enum', enumMap: { 0: false, 1: true, 2: true } },
    }
  },

  // TYPE G: HOBEIAN_ZG204ZM (Hybrid) — Z2M herdsman tuya.ts canonical (P2421)
  // WHY: old map invented large/small/micro DPs + used DP3 as distance; Z2M locks
  // DP2=static_detection_sensitivity, DP4=static_detection_distance/100, DP101=motion_state.
  'HOBEIAN_ZG204ZM': {
    configName: 'HOBEIAN_ZG204ZM',
    sensors: [
      'HOBEIAN',
      '_TZE200_2aaelwxk', '_TZE204_2aaelwxk',
      '_TZE200_kb5noeto', '_TZE204_kb5noeto',
      '_TZE200_tyffvoij', '_TZE204_tyffvoij',
      '_TZE200_yflzeeqj', '_TZE204_yflzeeqj',
    ],
    modelId: 'ZG-204ZM',
    battery: true,
    useZcl: true,
    useIasZone: true,
    useTuyaDP: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    writableDPs: [2, 4, 102, 107, 122, 123],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 },
      4: { cap: null, setting: 'static_detection_distance', divisor: 100, min: 0, max: 6 },
      101: { cap: 'alarm_motion', type: 'motion_state_enum', enumMap: { 0: false, 1: true, 2: true, 3: true } },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      107: { cap: null, setting: 'indicator' },
      121: { cap: 'measure_battery', divisor: 1 },
      122: { cap: null, setting: 'motion_detection_mode' },
      123: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE G2: HOBEIAN ZG-204ZH — presence + climate (Z2M P2421)
  'HOBEIAN_ZG204ZH': {
    configName: 'HOBEIAN_ZG204ZH',
    sensors: [
      '_TZE200_vuqzj1ej', '_TZE204_vuqzj1ej',
      '_TZE200_hdih4foa', '_TZE204_hdih4foa',
    ],
    modelId: 'ZG-204ZH',
    battery: true,
    useTuyaDP: true,
    hasIlluminance: true,
    noTemperature: false,
    noHumidity: false,
    noIasMotion: true,
    writableDPs: [2, 4, 102, 104, 105, 107, 108, 109, 112, 123],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 },
      4: { cap: null, setting: 'static_detection_distance', divisor: 100, min: 0, max: 5 },
      101: { cap: 'measure_humidity', divisor: 1 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      103: { cap: 'alarm_motion', type: 'motion_state_enum', enumMap: { 0: false, 1: true, 2: true, 3: true } },
      104: { cap: null, setting: 'humidity_calibration', min: -30, max: 30 },
      105: { cap: null, setting: 'temperature_calibration', divisor: 10, min: -20, max: 20 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      107: { cap: null, setting: 'illuminance_interval', min: 1, max: 720 },
      108: { cap: null, setting: 'indicator' },
      109: { cap: null, setting: 'temperature_unit' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', smartDivisor: true },
      112: { cap: null, setting: 'motion_detection_mode' },
      123: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE G3: HOBEIAN ZG-302ZM motion sensing switch (Z2M P2421)
  'HOBEIAN_ZG302ZM': {
    configName: 'HOBEIAN_ZG302ZM',
    sensors: [
      '_TZE200_kccdzaeo', '_TZE200_s7rsrtbg', '_TZE200_tmszbtzq',
      '_TZE200_bfmfhxra', '_TZE200_ahpcyzth', '_TZE200_kijxnb8q',
    ],
    modelId: 'ZG-302ZM',
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    useTuyaDP: true,
    hasIlluminance: false,
    hasRelay: true,
    relayDp: 101,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    writableDPs: [2, 4, 101, 102, 103, 108, 111, 112, 113, 114, 115],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 19 },
      4: { cap: 'measure_luminance.distance', divisor: 100 },
      101: { cap: 'onoff', type: 'bool' },
      102: { cap: null, internal: 'switch2' },
      103: { cap: null, internal: 'switch3' },
      108: { cap: null, internal: 'trigger_switch' },
      111: { cap: null, setting: 'indicator' },
      112: { cap: null, setting: 'power_on_behavior' },
      113: { cap: null, internal: 'auto_on' },
      114: { cap: null, setting: 'fading_time', min: 5, max: 28800 },
      115: { cap: null, internal: 'auto_off' },
    }
  },

  // TYPE G4: HOBEIAN ZG-302ZL motion sensing switch (Z2M P2421) — different DP layout
  'HOBEIAN_ZG302ZL': {
    configName: 'HOBEIAN_ZG302ZL',
    sensors: [
      '_TZE200_khzbklyh', '_TZE200_df04ghrb', '_TZE200_toeldckg',
      '_TZE200_cqtamhh5', '_TZE200_xlnzk169', '_TZE200_llvwkkde',
    ],
    modelId: 'ZG-302ZL',
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    useTuyaDP: true,
    hasIlluminance: false,
    hasRelay: true,
    relayDp: 1,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    writableDPs: [1, 2, 3, 14, 16, 102, 103, 104, 105],
    dpMap: {
      101: { cap: 'alarm_motion', type: 'presence_bool' },
      102: { cap: null, setting: 'radar_sensitivity', min: 0, max: 19 },
      1: { cap: 'onoff', type: 'bool' },
      2: { cap: null, internal: 'switch2' },
      3: { cap: null, internal: 'switch3' },
      16: { cap: null, setting: 'indicator' },
      103: { cap: null, setting: 'fading_time', min: 5, max: 28800 },
      14: { cap: null, setting: 'power_on_behavior' },
      104: { cap: null, internal: 'auto_on' },
      105: { cap: null, internal: 'auto_off' },
    }
  },

  // TYPE H: KA8L86IU Battery Presence Sensor (haadeess #374/#382/#399/#406)
  'KA8L86IU_BATTERY': {
    configName: 'KA8L86IU_BATTERY',
    sensors: [
      '_TZE200_ka8l86iu', '_tze200_ka8l86iu', '_TZE200_KA8L86IU', '_tze200_KA8L86IU',
      '_TZE284_ka8l86iu', '_tze284_ka8l86iu', '_TZE284_KA8L86IU', '_tze284_KA8L86IU',
    ],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: true,
    invertPresence: false,
    presenceEnumMapping: { 0: true, 1: false },
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum', enumMap: { 0: true, 1: false } },
      4: { cap: 'measure_luminance.distance', smartDivisor: true }, // detection_distance (dp_registry/Z2M ZG-204ZK)
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
      121: { cap: 'measure_battery', divisor: 1 }, // battery (dp_registry/Z2M ZG-204ZK — alt DP to 110)
    }
  },

  // TYPE G5: HOBEIAN ZG-204ZK (P2422 Z2M)
  'HOBEIAN_ZG204ZK': {
    configName: 'HOBEIAN_ZG204ZK',
    sensors: ['_TZE200_ka8l86iu', '_TZE200_zbfmvj13', '_TZE284_ka8l86iu'],
    modelId: 'ZG-204ZK',
    battery: true,
    useTuyaDP: true,
    hasIlluminance: false,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    writableDPs: [2, 4, 102, 107, 122, 123],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 },
      4: { cap: null, setting: 'static_detection_distance', divisor: 100, min: 0, max: 5 },
      102: { cap: null, setting: 'fading_time', min: 10, max: 28800 },
      107: { cap: null, setting: 'indicator' },
      121: { cap: 'measure_battery', divisor: 1 },
      122: { cap: null, setting: 'anti_interference' },
      123: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE G6: HOBEIAN ZG-204ZE (P2422 Z2M)
  'HOBEIAN_ZG204ZE': {
    configName: 'HOBEIAN_ZG204ZE',
    sensors: ['_TZE200_4pm4pekt', '_TZE200_cq8lu23i', '_TZE200_y8jijhba'],
    modelId: 'ZG-204ZE',
    battery: true,
    useTuyaDP: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    writableDPs: [2, 102, 107, 108],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 19 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      107: { cap: null, setting: 'illuminance_interval', min: 1, max: 720 },
      108: { cap: null, setting: 'indicator' },
      110: { cap: 'measure_battery', divisor: 1 },
    }
  },

  // TYPE G7: HOBEIAN ZG-204ZQ PIR + climate (P2422 Z2M)
  'HOBEIAN_ZG204ZQ': {
    configName: 'HOBEIAN_ZG204ZQ',
    sensors: ['_TZE200_p9zbdqgs'],
    modelId: 'ZG-204ZQ',
    battery: true,
    useTuyaDP: true,
    hasIlluminance: true,
    noTemperature: false,
    noHumidity: false,
    noIasMotion: true,
    writableDPs: [102, 104, 105, 107, 108, 109],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: 'measure_humidity', divisor: 1 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      104: { cap: null, setting: 'humidity_calibration', min: -30, max: 30 },
      105: { cap: null, setting: 'temperature_calibration', divisor: 10, min: -20, max: 20 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      107: { cap: null, setting: 'illuminance_interval', min: 1, max: 720 },
      108: { cap: null, setting: 'indicator' },
      109: { cap: null, setting: 'temperature_unit' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', smartDivisor: true },
    }
  },

  // TYPE G8: HOBEIAN ZG-204ZX mmWave + T&H (P2422 Z2M)
  'HOBEIAN_ZG204ZX': {
    configName: 'HOBEIAN_ZG204ZX',
    sensors: ['_TZE200_w0ap83qu'],
    modelId: 'ZG-204ZX',
    battery: true,
    useTuyaDP: true,
    hasIlluminance: true,
    noTemperature: false,
    noHumidity: false,
    noIasMotion: true,
    writableDPs: [2, 4, 102, 103],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 },
      4: { cap: null, setting: 'static_detection_distance', divisor: 100, min: 0, max: 5 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      103: { cap: null, setting: 'anti_interference' },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      // Soft climate extras observed on sibling firmwares
      101: { cap: 'measure_humidity', divisor: 1 },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', smartDivisor: true },
    }
  },

  // DEFAULT fallback — with multi-zone support (Idea #21)
  'DEFAULT': {
    sensors: [],
    configName: 'DEFAULT',
    battery: false,
    hasIlluminance: true,
    hasMultiZone: true,
    needsPolling: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      // Idea #21: Multi-zone presence DPs (generic Tuya mmWave zone mapping)
      13: { cap: 'alarm_motion.zone1', type: 'presence_bool', zone: 1 },
      14: { cap: 'alarm_motion.zone2', type: 'presence_bool', zone: 2 },
      15: { cap: 'alarm_motion.zone3', type: 'presence_bool', zone: 3 },
      16: { cap: 'measure_luminance.distance.zone1', smartDivisor: true, zone: 1 },
      17: { cap: 'measure_luminance.distance.zone2', smartDivisor: true, zone: 2 },
      18: { cap: 'measure_luminance.distance.zone3', smartDivisor: true, zone: 3 },
      19: { cap: 'measure_motion.classification', type: 'movement_enum', zone: 0 },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      109: { cap: 'measure_luminance.distance', smartDivisor: true },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
      119: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },
};

const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors || []) {
    MANUFACTURER_CONFIG_MAP[normalize(mfr)] = { ...config, configName };
  }
}

function getSensorConfig(manufacturerName, modelId = null) {
  // WHY(P2421/P2422): route by modelId first, then verified TZE mfr — never invent pid.
  const model = (modelId && modelId !== 'null') ? String(modelId).toUpperCase() : '';
  if (model.includes('ZG-204ZH') || model.includes('AY208Z')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZH, configName: 'HOBEIAN_ZG204ZH' };
  }
  if (model.includes('ZG-204ZX')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZX, configName: 'HOBEIAN_ZG204ZX' };
  }
  if (model.includes('ZG-204ZK') || model.includes('AY-204ZX')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZK, configName: 'HOBEIAN_ZG204ZK' };
  }
  if (model.includes('ZG-204ZE')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZE, configName: 'HOBEIAN_ZG204ZE' };
  }
  if (model.includes('ZG-204ZQ')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZQ, configName: 'HOBEIAN_ZG204ZQ' };
  }
  if (model.includes('ZG-204ZM') || model.includes('AY205Z')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
  }
  if (model.includes('ZG-302ZM')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG302ZM, configName: 'HOBEIAN_ZG302ZM' };
  }
  if (model.includes('ZG-302ZL')) {
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG302ZL, configName: 'HOBEIAN_ZG302ZL' };
  }
  if (model.includes('ZG-204ZV') || model.includes('AY204T')) {
    return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
  }

  if (containsCI(manufacturerName, 'HOBEIAN')) {
    // Brand-only: soft ZG204ZM (no climate phantoms) — never HOBEIAN_10G_MULTI
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  const mfrKey = normalize(manufacturerName);
  if (MANUFACTURER_CONFIG_MAP[mfrKey]) {return MANUFACTURER_CONFIG_MAP[mfrKey];}

  if (manufacturerName) {
    if (containsCI(manufacturerName, 'vuqzj1ej') || containsCI(manufacturerName, 'hdih4foa')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZH, configName: 'HOBEIAN_ZG204ZH' };
    }
    if (containsCI(manufacturerName, 'w0ap83qu')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZX, configName: 'HOBEIAN_ZG204ZX' };
    }
    if (containsCI(manufacturerName, 'ka8l86iu') || containsCI(manufacturerName, 'zbfmvj13')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZK, configName: 'HOBEIAN_ZG204ZK' };
    }
    if (containsCI(manufacturerName, '4pm4pekt') || containsCI(manufacturerName, 'cq8lu23i')
      || containsCI(manufacturerName, 'y8jijhba')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZE, configName: 'HOBEIAN_ZG204ZE' };
    }
    if (containsCI(manufacturerName, 'p9zbdqgs')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZQ, configName: 'HOBEIAN_ZG204ZQ' };
    }
    if (containsCI(manufacturerName, '2aaelwxk') || containsCI(manufacturerName, 'kb5noeto')
      || containsCI(manufacturerName, 'tyffvoij') || containsCI(manufacturerName, 'yflzeeqj')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
    }
    if (containsCI(manufacturerName, 'kccdzaeo') || containsCI(manufacturerName, 's7rsrtbg')
      || containsCI(manufacturerName, 'tmszbtzq') || containsCI(manufacturerName, 'bfmfhxra')
      || containsCI(manufacturerName, 'ahpcyzth') || containsCI(manufacturerName, 'kijxnb8q')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG302ZM, configName: 'HOBEIAN_ZG302ZM' };
    }
    if (containsCI(manufacturerName, 'khzbklyh') || containsCI(manufacturerName, 'df04ghrb')
      || containsCI(manufacturerName, 'toeldckg') || containsCI(manufacturerName, 'cqtamhh5')
      || containsCI(manufacturerName, 'xlnzk169') || containsCI(manufacturerName, 'llvwkkde')) {
      return { ...SENSOR_CONFIGS.HOBEIAN_ZG302ZL, configName: 'HOBEIAN_ZG302ZL' };
    }
    if (containsCI(manufacturerName, 'iadro9bf') || containsCI(manufacturerName, 'qasjif9e')) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF' };
    }
  }

  return SENSOR_CONFIGS.DEFAULT;
}

function transformPresence(value, type, invertPresence, configName) {
  if (type === 'presence_bool') {
    return invertPresence ? !value : !!value;
  }
  if (type === 'presence_enum') {
    // WHY (P2398): many radars use 0/1/2 (absent/move/present) — 2 must be present
    const bool = value === 1 || value === 2 || value === true;
    return invertPresence ? !bool : bool;
  }
  // v9.7.6 / P2398: gkfbdvyx-style enums — value 2 = present (not only 1).
  // Primary path in device.js uses mapping.enumMap; this is the fallback.
  if (type && type.startsWith('presence_enum_')) {
    const bool = value === 1 || value === 2 || value === true;
    return invertPresence ? !bool : bool;
  }
  if (type === 'motion_state_enum') {
    return value === 1 || value === 2 || value === 3;
  }
  // Idea #21: Movement classification enum
  // 0=none, 1=stationary, 2=micro-motion (breathing), 3=small motion (limb), 4=large motion (walking)
  if (type === 'movement_enum') {
    const MOVEMENT_LABELS = ['none', 'stationary', 'micro_motion', 'small_motion', 'large_motion'];
    return MOVEMENT_LABELS[value] || 'unknown';
  }
  return !!value;
}

module.exports = {
  SENSOR_CONFIGS,
  getSensorConfig,
  transformPresence,
  normalize,
  containsCI
};
