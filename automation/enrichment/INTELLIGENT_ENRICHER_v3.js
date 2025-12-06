#!/usr/bin/env node
/**
 * INTELLIGENT ENRICHER v3.0 - ULTRA OPTIMIZED
 *
 * OPTIMIZATIONS:
 * - Load ALL Z2M data ONCE at startup (1 API call for 3000+ devices)
 * - In-memory cache for instant lookups
 * - Skip GitHub API unless absolutely necessary
 * - Batch processing without rate limit issues
 * - Local DB with 100+ manufacturers pre-populated
 *
 * @author Universal Tuya Zigbee Project
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  DRIVERS_DIR: path.join(__dirname, '../../drivers'),
  DATA_DIR: path.join(__dirname, '../../data'),
  CACHE_DIR: path.join(__dirname, '../../data/cache'),

  Z2M_CACHE_FILE: path.join(__dirname, '../../data/cache/z2m_full_database.json'),
  ENRICHMENT_RESULTS_FILE: path.join(__dirname, '../../data/ENRICHMENT_RESULTS.json'),

  // Z2M raw data URL (one call = all devices)
  Z2M_DEVICES_URL: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
  Z2M_JSON_URL: 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/devices.json',
  Z2M_BACKUP_URL: 'https://www.zigbee2mqtt.io/devices.json',

  REQUEST_TIMEOUT: 30000,
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE LOCAL DATABASE
// Pre-populated from Z2M, GitHub Issues, Forum, and manual research
// ═══════════════════════════════════════════════════════════════════════════

const COMPREHENSIVE_LOCAL_DB = {
  // ═══════════════════════════════════════════════════════════════════════
  // MOTION SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_3towulqd': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 9: 'sensitivity', 10: 'keep_time', 12: 'measure_luminance' } },
  '_TZE200_ztc6ggyl': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 9: 'sensitivity', 10: 'keep_time', 12: 'measure_luminance' } },
  '_TZE200_mcxw5ehu': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 101: 'presence_time' } },
  '_TZE200_rhgsbacq': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 101: 'presence_time' } },
  '_TZE200_ya4ft0w4': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery' } },
  '_TZE200_bh3n6gk8': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 101: 'target_distance' } },
  '_TZE200_pay2byax': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery' } },
  '_TZE200_7hfcudw5': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 2: 'measure_battery' } },
  '_TZE200_ppuj1vem': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 12: 'measure_luminance' } },
  '_TZE200_auin8mzr': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 9: 'sensitivity' } },

  // Radar/mmWave Sensors
  '_TZE204_sxm7l9xa': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 9: 'sensitivity', 101: 'target_distance', 102: 'measure_luminance', 104: 'detection_delay' } },
  '_TZE204_sbyx0lm6': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 104: 'presence', 105: 'measure_luminance', 106: 'radar_sensitivity' } },
  '_TZE204_qasjif9e': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 2: 'radar_sensitivity', 101: 'presence', 102: 'target_distance' } },
  '_TZE200_hl0ss9oa': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 101: 'presence', 102: 'target_distance', 104: 'measure_luminance' } },
  '_TZE204_ztqnh5cg': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 101: 'target_distance', 102: 'measure_luminance' } },
  '_TZE200_vrfecyku': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 2: 'sensitivity', 102: 'target_distance', 104: 'measure_luminance' } },
  '_TZE200_lu01t0zlz': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 101: 'presence', 104: 'measure_luminance' } },
  '_TZE204_ijxvkhd0': { type: 'motion_sensor_radar', dps: { 1: 'presence', 101: 'target_distance', 102: 'measure_luminance', 103: 'radar_sensitivity' } },

  // ═══════════════════════════════════════════════════════════════════════
  // CLIMATE SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_dwcarsat': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_a8sdabtg': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_qoy0ekbd': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_znbl8dj5': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_yjjdcqsq': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_bjawzodf': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_zl1kmjqx': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_locansqn': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_nnrfa68v': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_vzqtvljm': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE284_aao3yzhs': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },

  // ═══════════════════════════════════════════════════════════════════════
  // SOIL SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_myd45weu': { type: 'soil_sensor', dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery', 15: 'battery_state' } },
  '_TZE284_oitavov2': { type: 'soil_sensor', dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery' } },
  '_TZE200_ip2akl4w': { type: 'soil_sensor', dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery' } },
  '_TZE200_ga1maeof': { type: 'soil_sensor', dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery' } },

  // ═══════════════════════════════════════════════════════════════════════
  // THERMOSTATS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_aoclfnxz': { type: 'thermostat', dps: { 1: 'onoff', 2: 'target_temperature', 3: 'measure_temperature', 4: 'mode', 101: 'child_lock' } },
  '_TZE200_2ekuz3dz': { type: 'thermostat', dps: { 1: 'onoff', 16: 'target_temperature', 24: 'measure_temperature', 28: 'child_lock' } },
  '_TZE200_b6wax7g0': { type: 'thermostat', dps: { 1: 'onoff', 16: 'target_temperature', 24: 'measure_temperature' } },
  '_TZE200_mudxchsu': { type: 'thermostat', dps: { 1: 'onoff', 2: 'mode', 16: 'target_temperature', 24: 'measure_temperature' } },
  '_TZE200_sur6q7ko': { type: 'thermostat', dps: { 1: 'onoff', 2: 'mode', 16: 'target_temperature', 24: 'measure_temperature' } },
  '_TZE200_9gvruqf5': { type: 'thermostat', dps: { 1: 'onoff', 16: 'target_temperature', 24: 'measure_temperature', 27: 'temp_calibration' } },
  '_TZE200_hve5txml': { type: 'thermostat', dps: { 1: 'onoff', 16: 'target_temperature', 24: 'measure_temperature' } },
  '_TZE204_aoclfnxz': { type: 'thermostat', dps: { 1: 'onoff', 2: 'target_temperature', 3: 'measure_temperature', 4: 'mode' } },

  // ═══════════════════════════════════════════════════════════════════════
  // CURTAIN MOTORS / BLINDS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_zah67ekd': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' } },
  '_TZE200_rddyvrci': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 3: 'position_alt', 5: 'direction', 7: 'work_state' } },
  '_TZE200_cowvfni3': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' } },
  '_TZE200_wmcdj3aq': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 5: 'direction', 7: 'work_state' } },
  '_TZE200_fzo2pocs': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' } },
  '_TZE200_nogaemzt': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set' } },
  '_TZE200_5zbp6j0u': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 5: 'direction' } },
  '_TZE200_nueqqe6k': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' } },
  '_TZE200_xuzcvlku': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 3: 'position', 7: 'work_state' } },
  '_TZE200_gubdgai2': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set' } },
  '_TZE204_guvc7pdy': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 3: 'position', 5: 'direction' } },

  // ═══════════════════════════════════════════════════════════════════════
  // SWITCHES 1-8 GANG
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_gjnozsaz': { type: 'switch_1gang', dps: { 1: 'onoff' } },
  '_TZ3000_npzfdcof': { type: 'switch_1gang', dps: { 1: 'onoff' } },
  '_TZ3000_tqlv4uj4': { type: 'switch_1gang', dps: { 1: 'onoff' } },
  '_TZ3000_18ejxno0': { type: 'switch_2gang', dps: { 1: 'onoff.1', 2: 'onoff.2' } },
  '_TZ3000_zmy1waw6': { type: 'switch_2gang', dps: { 1: 'onoff.1', 2: 'onoff.2' } },
  '_TZ3000_cfnprab5': { type: 'switch_3gang', dps: { 1: 'onoff.1', 2: 'onoff.2', 3: 'onoff.3' } },
  '_TZ3000_fvh3pjaz': { type: 'switch_4gang', dps: { 1: 'onoff.1', 2: 'onoff.2', 3: 'onoff.3', 4: 'onoff.4' } },
  '_TZ3000_wyhuocal': { type: 'switch_4gang', dps: { 1: 'onoff.1', 2: 'onoff.2', 3: 'onoff.3', 4: 'onoff.4' } },

  // ═══════════════════════════════════════════════════════════════════════
  // SOCKETS WITH POWER METERING
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_okaz9tjs': { type: 'socket_power', dps: { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage', 20: 'meter_power' } },
  '_TZ3000_typdpbpg': { type: 'socket_power', dps: { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage', 20: 'meter_power' } },
  '_TZ3000_w0qqde0g': { type: 'socket_power', dps: { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage' } },
  '_TZ3000_cehuw1lw': { type: 'socket_power', dps: { 1: 'onoff', 9: 'countdown', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage' } },
  '_TZ3000_5f43h46b': { type: 'socket_power', dps: { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage', 20: 'meter_power' } },
  '_TZ3000_cphmq0q7': { type: 'socket', dps: { 1: 'onoff' } },
  '_TZ3000_mraovvmm': { type: 'socket', dps: { 1: 'onoff' } },
  '_TZ3000_kx0pris5': { type: 'socket', dps: { 1: 'onoff' } },

  // ═══════════════════════════════════════════════════════════════════════
  // DIMMERS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_7ysdnebc': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim', 14: 'power_on_behavior' } },
  '_TZ3000_ktuoyvt5': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim', 3: 'dim_min', 4: 'dim_max' } },
  '_TZ3210_ngqk6jia': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim' } },
  '_TZ3210_zxbtub8r': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim', 3: 'dim_min' } },
  '_TZE200_dfxkcots': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim', 3: 'dim_min', 4: 'dim_max' } },

  // ═══════════════════════════════════════════════════════════════════════
  // LED CONTROLLERS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_s8gkrkxk': { type: 'led_rgb', dps: { 1: 'onoff', 2: 'mode', 3: 'dim', 5: 'light_hue', 6: 'light_saturation' } },
  '_TZB210_ngnt8kni': { type: 'led_cct', dps: { 1: 'onoff', 2: 'dim', 3: 'light_temperature' } },
  '_TZ3210_778wum3': { type: 'led_cct', dps: { 1: 'onoff', 2: 'dim', 3: 'light_temperature' } },
  '_TZ3000_g5xawfcq': { type: 'led_dimmable', dps: { 1: 'onoff', 2: 'dim' } },
  '_TZ3210_k1pe6ibm': { type: 'led_rgbw', dps: { 1: 'onoff', 2: 'mode', 3: 'dim', 5: 'color' } },

  // ═══════════════════════════════════════════════════════════════════════
  // CONTACT SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_decxrtwa': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_26fmupbb': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_oxslv1c9': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_2mbfxlzr': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_yxqnffam': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_402jjyro': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TYZB01_xph99wvr': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },

  // ═══════════════════════════════════════════════════════════════════════
  // WATER LEAK SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_kyb656no': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },
  '_TZ3000_upgcbody': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },
  '_TZ3000_kstbkt6a': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },
  '_TZ3000_mugyhz0q': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },
  '_TZ3000_fgk8xcm4': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },

  // ═══════════════════════════════════════════════════════════════════════
  // SMOKE / CO DETECTORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3210_up3pngle': { type: 'smoke_detector', dps: { 1: 'alarm_smoke', 4: 'measure_battery' }, ias: true },
  '_TZE200_ntcy3xu1': { type: 'smoke_detector', dps: { 1: 'alarm_smoke', 14: 'measure_battery' } },
  '_TZE200_yojqa8xn': { type: 'smoke_detector', dps: { 1: 'alarm_smoke', 4: 'measure_battery' } },
  '_TZE200_vzekyi4c': { type: 'co_detector', dps: { 1: 'alarm_co', 4: 'measure_battery' } },

  // ═══════════════════════════════════════════════════════════════════════
  // BUTTONS (SOS, WIRELESS)
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_peszejy7': { type: 'button_sos', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_fkp5hqga': { type: 'button_sos', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_4ygczxam': { type: 'button_sos', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_bi6lpsew': { type: 'button_1', dps: { 1: 'action' }, scenes: true },
  '_TZ3000_adkvzooy': { type: 'button_2', dps: { 1: 'action_1', 2: 'action_2' }, scenes: true },
  '_TZ3000_gbm10jnj': { type: 'button_3', dps: { 1: 'action_1', 2: 'action_2', 3: 'action_3' }, scenes: true },
  '_TZ3000_xabckq1v': { type: 'button_4', dps: { 1: 'action_1', 2: 'action_2', 3: 'action_3', 4: 'action_4' }, scenes: true },
  '_TZ3000_rrjr1q0u': { type: 'button_1', dps: { 1: 'action' }, scenes: true },
  '_TZ3000_fkvaniuu': { type: 'button_4', dps: { 1: 'action_1', 2: 'action_2', 3: 'action_3', 4: 'action_4' }, scenes: true },
  '_TZ3000_abrsvsou': { type: 'button_2', dps: { 1: 'action_1', 2: 'action_2' }, scenes: true },

  // ═══════════════════════════════════════════════════════════════════════
  // VALVES (IRRIGATION, GAS, WATER)
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_htnnfasr': { type: 'valve', dps: { 1: 'onoff', 5: 'countdown', 7: 'timer_remaining', 11: 'meter_water' } },
  '_TZE200_81isopgh': { type: 'valve', dps: { 1: 'onoff', 5: 'countdown', 6: 'weather_delay' } },
  '_TZE200_2wg5wcuq': { type: 'valve', dps: { 1: 'onoff', 2: 'measure_battery', 7: 'timer' } },
  '_TZE200_akjefhj5': { type: 'valve', dps: { 1: 'onoff', 5: 'countdown', 11: 'meter_water' } },

  // ═══════════════════════════════════════════════════════════════════════
  // AIR QUALITY SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_dwcarsat': { type: 'air_quality', dps: { 1: 'measure_co2', 2: 'measure_temperature', 3: 'measure_humidity', 18: 'measure_voc', 21: 'measure_pm25' } },
  '_TZE200_yvx5lh6k': { type: 'air_quality', dps: { 2: 'measure_co2', 18: 'measure_temperature', 19: 'measure_humidity' } },
  '_TZE200_ryfmq5rl': { type: 'air_quality', dps: { 2: 'measure_co2', 18: 'measure_temperature', 19: 'measure_humidity', 21: 'measure_formaldehyde' } },

  // ═══════════════════════════════════════════════════════════════════════
  // SIRENS / ALARMS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_fwh3kt5a': { type: 'siren', dps: { 1: 'onoff', 5: 'alarm_time', 7: 'alarm_mode', 13: 'alarm_volume' } },
  '_TZE200_d0yu2xgi': { type: 'siren', dps: { 1: 'onoff', 5: 'alarm_time', 7: 'alarm_mode', 13: 'alarm_volume', 15: 'measure_temperature', 16: 'measure_humidity' } },

  // ═══════════════════════════════════════════════════════════════════════
  // GARAGE DOOR CONTROLLERS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZE200_wfxuhoea': { type: 'garage_door', dps: { 1: 'trigger', 2: 'alarm_contact', 3: 'door_state', 12: 'motor_status' } },
  '_TZE200_nklqjk62': { type: 'garage_door', dps: { 1: 'trigger', 2: 'alarm_contact', 3: 'door_state' } },

  // ═══════════════════════════════════════════════════════════════════════
  // VIBRATION SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  '_TZ3000_bpkijo14': { type: 'vibration', dps: { 1: 'alarm_vibration' }, ias: true },
  '_TZ3000_bmg14ax2': { type: 'vibration', dps: { 1: 'alarm_vibration' }, ias: true },
};

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class HttpClient {
  static async get(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: { 'User-Agent': 'Universal-Tuya-Enricher/3.0' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}`));
        });
      });
      req.on('error', reject);
      req.setTimeout(CONFIG.REQUEST_TIMEOUT, () => { req.destroy(); reject(new Error('TIMEOUT')); });
      req.end();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Z2M DATABASE LOADER (ONE CALL FOR ALL)
// ═══════════════════════════════════════════════════════════════════════════

class Z2MDatabase {
  constructor() {
    this.cache = {};
    this.loaded = false;
  }

  async loadFromCache() {
    try {
      if (fs.existsSync(CONFIG.Z2M_CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CONFIG.Z2M_CACHE_FILE, 'utf8'));
        if (data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000) { // 24h cache
          this.cache = data.manufacturers;
          this.loaded = true;
          console.log(`📦 Loaded ${Object.keys(this.cache).length} manufacturers from Z2M cache`);
          return true;
        }
      }
    } catch (err) { }
    return false;
  }

  async loadFromAPI() {
    console.log('🌐 Fetching Z2M database (one-time)...');

    let data;
    try {
      data = await HttpClient.get(CONFIG.Z2M_JSON_URL);
    } catch (err) {
      console.log(`  Primary URL failed, trying backup...`);
      try {
        data = await HttpClient.get(CONFIG.Z2M_BACKUP_URL);
      } catch (err2) {
        console.log(`  Backup also failed: ${err2.message}`);
        return false;
      }
    }

    try {
      const devices = JSON.parse(data);

      for (const device of devices) {
        if (device.fingerprint) {
          for (const fp of device.fingerprint) {
            if (fp.manufacturerName) {
              this.cache[fp.manufacturerName] = {
                model: device.model,
                vendor: device.vendor,
                description: device.description,
                exposes: device.exposes?.map(e => e.name || e.type) || []
              };
            }
          }
        }
      }

      // Save cache
      fs.mkdirSync(path.dirname(CONFIG.Z2M_CACHE_FILE), { recursive: true });
      fs.writeFileSync(CONFIG.Z2M_CACHE_FILE, JSON.stringify({
        timestamp: Date.now(),
        manufacturers: this.cache
      }, null, 2));

      this.loaded = true;
      console.log(`✅ Cached ${Object.keys(this.cache).length} Z2M manufacturers`);
      return true;
    } catch (err) {
      console.log(`⚠️ Z2M API error: ${err.message}`);
      return false;
    }
  }

  async init() {
    if (!await this.loadFromCache()) {
      await this.loadFromAPI();
    }
  }

  get(mfr) {
    return this.cache[mfr] || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER ENRICHER
// ═══════════════════════════════════════════════════════════════════════════

class DriverEnricher {
  constructor() {
    this.z2mDb = new Z2MDatabase();
    this.stats = { processed: 0, enriched: 0, fromLocal: 0, fromZ2M: 0, notFound: 0 };
  }

  getAllManufacturers() {
    const manufacturers = new Set();
    const drivers = fs.readdirSync(CONFIG.DRIVERS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const driver of drivers) {
      try {
        const configPath = path.join(CONFIG.DRIVERS_DIR, driver.name, 'driver.compose.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config?.zigbee?.manufacturerName) {
            for (const mfr of config.zigbee.manufacturerName) {
              manufacturers.add(mfr);
            }
          }
        }
      } catch (err) { }
    }

    return Array.from(manufacturers).sort();
  }

  enrichManufacturer(mfr) {
    // 1. Check local comprehensive DB (instant)
    if (COMPREHENSIVE_LOCAL_DB[mfr]) {
      this.stats.fromLocal++;
      return { source: 'local_db', ...COMPREHENSIVE_LOCAL_DB[mfr] };
    }

    // 2. Check Z2M cache (instant, no API)
    const z2mData = this.z2mDb.get(mfr);
    if (z2mData) {
      this.stats.fromZ2M++;
      return { source: 'z2m', ...z2mData };
    }

    // 3. Not found
    this.stats.notFound++;
    return null;
  }

  async processAll(limit = 0) {
    await this.z2mDb.init();

    const manufacturers = this.getAllManufacturers();
    const toProcess = limit > 0 ? manufacturers.slice(0, limit) : manufacturers;

    console.log(`\n📦 Processing ${toProcess.length} of ${manufacturers.length} manufacturers\n`);

    const results = { enriched: [], notFound: [] };

    for (const mfr of toProcess) {
      const data = this.enrichManufacturer(mfr);
      this.stats.processed++;

      if (data) {
        this.stats.enriched++;
        results.enriched.push({ mfr, ...data });
        process.stdout.write(`✅ ${mfr} (${data.source})\n`);
      } else {
        results.notFound.push(mfr);
      }

      // Progress every 100
      if (this.stats.processed % 100 === 0) {
        console.log(`  --- Progress: ${this.stats.processed}/${toProcess.length} ---`);
      }
    }

    return results;
  }

  saveResults(results) {
    fs.writeFileSync(CONFIG.ENRICHMENT_RESULTS_FILE, JSON.stringify({
      generated: new Date().toISOString(),
      stats: this.stats,
      enriched: results.enriched,
      notFoundCount: results.notFound.length,
      notFoundSample: results.notFound.slice(0, 50)
    }, null, 2));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 INTELLIGENT ENRICHER v3.0 - ULTRA OPTIMIZED');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ Local DB: NO API CALLS for known manufacturers');
  console.log('✅ Z2M: ONE API call loads ALL devices\n');

  console.log(`📦 Local DB: ${Object.keys(COMPREHENSIVE_LOCAL_DB).length} manufacturers pre-loaded`);

  const enricher = new DriverEnricher();

  // Parse args
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

  const results = await enricher.processAll(limit);

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Processed: ${enricher.stats.processed}`);
  console.log(`  Enriched: ${enricher.stats.enriched}`);
  console.log(`  From Local DB: ${enricher.stats.fromLocal}`);
  console.log(`  From Z2M: ${enricher.stats.fromZ2M}`);
  console.log(`  Not Found: ${enricher.stats.notFound}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  enricher.saveResults(results);
  console.log(`📄 Results saved to: ${CONFIG.ENRICHMENT_RESULTS_FILE}\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { COMPREHENSIVE_LOCAL_DB, DriverEnricher };
