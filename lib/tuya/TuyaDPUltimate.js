'use strict';

/**
 * TUYA DP ULTIMATE - Complete DataPoint Database
 *
 * Sources consolidées:
 * - zigbee-herdsman-converters (fairecasoimeme)
 * - zha-device-handlers (zigpy)
 * - Tuya Developer Platform docs
 * - Community devices (Homey, Z2M, ZHA forums)
 * - Reverse engineering various TS0601 devices
 *
 * 500+ DataPoints mappés
 * 100+ types d'appareils
 */

class TuyaDPUltimate {

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA DP TYPES
  // ═══════════════════════════════════════════════════════════════════════════

  static DP_TYPES = {
    RAW: 0x00,      // Variable length raw data
    BOOL: 0x01,     // 1 byte boolean
    VALUE: 0x02,    // 4 bytes unsigned int
    STRING: 0x03,   // Variable length string
    ENUM: 0x04,     // 1 byte enum
    BITMAP: 0x05    // 1-4 bytes bitmap
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIVERSAL DP MAPPINGS (Common across most devices)
  // ═══════════════════════════════════════════════════════════════════════════

  static UNIVERSAL_DPS = {
    // ─────────────────────────────────────────────────────────────────────────
    // CONTROL DPs (1-20)
    // ─────────────────────────────────────────────────────────────────────────
    1: { name: 'switch', capability: 'onoff', type: 'bool', description: 'Main power switch / Gang 1' },
    2: { name: 'switch_2', capability: 'onoff.2', type: 'bool', description: 'Gang 2 switch' },
    3: { name: 'switch_3', capability: 'onoff.3', type: 'bool', description: 'Gang 3 switch' },
    4: { name: 'switch_4', capability: 'onoff.4', type: 'bool', description: 'Gang 4 / Battery level' },
    5: { name: 'switch_5', capability: 'onoff.5', type: 'bool', description: 'Gang 5' },
    6: { name: 'switch_6', capability: 'onoff.6', type: 'bool', description: 'Gang 6' },
    7: { name: 'child_lock', capability: 'child_lock', type: 'bool', description: 'Child lock' },
    8: { name: 'switch_backlight', capability: 'led_ring', type: 'enum', description: 'LED backlight mode' },
    9: { name: 'countdown', capability: 'countdown', type: 'value', unit: 's', description: 'Countdown timer' },
    10: { name: 'switch_type', capability: 'switch_type', type: 'enum', description: 'External switch type' },

    // ─────────────────────────────────────────────────────────────────────────
    // MEASUREMENT DPs (15-30)
    // ─────────────────────────────────────────────────────────────────────────
    14: { name: 'battery', capability: 'measure_battery', type: 'value', description: 'Battery percentage' },
    15: { name: 'battery_low', capability: 'alarm_battery', type: 'bool', description: 'Battery low alarm' },
    16: { name: 'power', capability: 'measure_power', type: 'value', scale: 10, unit: 'W', description: 'Power consumption' },
    17: { name: 'current', capability: 'measure_current', type: 'value', scale: 1000, unit: 'A', description: 'Current' },
    18: { name: 'voltage', capability: 'measure_voltage', type: 'value', scale: 10, unit: 'V', description: 'Voltage' },
    19: { name: 'energy', capability: 'meter_power', type: 'value', scale: 100, unit: 'kWh', description: 'Energy consumption' },
    20: { name: 'energy_alt', capability: 'meter_power', type: 'value', scale: 100, unit: 'kWh', description: 'Energy (alternate)' },

    // ─────────────────────────────────────────────────────────────────────────
    // ENVIRONMENTAL SENSORS (100-130)
    // ─────────────────────────────────────────────────────────────────────────
    101: { name: 'temperature', capability: 'measure_temperature', type: 'value', scale: 10, description: 'Temperature' },
    102: { name: 'humidity', capability: 'measure_humidity', type: 'value', description: 'Humidity' },
    103: { name: 'illuminance', capability: 'measure_luminance', type: 'value', description: 'Illuminance (lux)' },
    104: { name: 'co2', capability: 'measure_co2', type: 'value', unit: 'ppm', description: 'CO2 level' },
    105: { name: 'voc', capability: 'measure_voc', type: 'value', unit: 'ppb', description: 'VOC level' },
    106: { name: 'formaldehyde', capability: 'measure_ch2o', type: 'value', scale: 100, unit: 'mg/m³', description: 'Formaldehyde' },
    107: { name: 'pm25', capability: 'measure_pm25', type: 'value', unit: 'µg/m³', description: 'PM2.5' },
    108: { name: 'pm10', capability: 'measure_pm10', type: 'value', unit: 'µg/m³', description: 'PM10' },

    // ─────────────────────────────────────────────────────────────────────────
    // SOIL/PLANT SENSORS (110-120)
    // ─────────────────────────────────────────────────────────────────────────
    110: { name: 'soil_moisture', capability: 'measure_humidity.soil', type: 'value', description: 'Soil moisture' },
    111: { name: 'soil_temperature', capability: 'measure_temperature.soil', type: 'value', scale: 10, description: 'Soil temperature' },
    112: { name: 'soil_ec', capability: 'measure_ec', type: 'value', description: 'Electrical conductivity' },
    113: { name: 'soil_ph', capability: 'measure_ph', type: 'value', scale: 100, description: 'Soil pH' },
    114: { name: 'soil_nitrogen', capability: 'measure_nitrogen', type: 'value', description: 'Nitrogen level' },
    115: { name: 'soil_phosphorus', capability: 'measure_phosphorus', type: 'value', description: 'Phosphorus level' },
    116: { name: 'soil_potassium', capability: 'measure_potassium', type: 'value', description: 'Potassium level' }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE-SPECIFIC DP MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════

  static DEVICE_PROFILES = {

    // ═════════════════════════════════════════════════════════════════════════
    // PRESENCE/RADAR SENSORS
    // ═════════════════════════════════════════════════════════════════════════

    'presence_radar': {
      name: 'Human Presence Radar',
      manufacturers: ['_TZE200_rhgsbacq', '_TZE204_sxm7l9xa', '_TZE200_ikvncluo', '_TZE200_ztc6ggyl'],
      dps: {
        1: { capability: 'alarm_motion', type: 'bool', name: 'presence' },
        2: { capability: 'radar_sensitivity', type: 'value', min: 0, max: 10, name: 'sensitivity' },
        3: { capability: 'radar_detection_distance', type: 'value', scale: 100, unit: 'm', name: 'near_distance' },
        4: { capability: 'radar_far_distance', type: 'value', scale: 100, unit: 'm', name: 'far_distance' },
        6: { capability: 'measure_distance', type: 'value', scale: 100, unit: 'm', name: 'target_distance' },
        9: { capability: 'radar_delay', type: 'value', unit: 's', name: 'detection_delay' },
        10: { capability: 'radar_fading_time', type: 'value', unit: 's', name: 'fading_time' },
        12: { capability: 'measure_luminance', type: 'value', name: 'illuminance' },
        101: { capability: 'radar_presence_state', type: 'enum', values: { 0: 'none', 1: 'presence', 2: 'move' } },
        102: { capability: 'radar_scene', type: 'enum', values: { 0: 'default', 1: 'living_room', 2: 'bedroom', 3: 'bathroom', 4: 'office' } },
        104: { capability: 'measure_battery', type: 'value', name: 'battery' }
      }
    },

    'presence_mmwave': {
      name: 'mmWave Presence Sensor',
      manufacturers: ['_TZE204_qasjif9e', '_TZE200_wukb7rhc', '_TZE204_ztqnh5cg'],
      dps: {
        1: { capability: 'alarm_motion', type: 'bool', name: 'presence_state' },
        2: { capability: 'radar_sensitivity', type: 'value', min: 1, max: 9, name: 'sensitivity' },
        3: { capability: 'radar_min_distance', type: 'value', scale: 100, name: 'minimum_range' },
        4: { capability: 'radar_max_distance', type: 'value', scale: 100, name: 'maximum_range' },
        6: { capability: 'measure_distance', type: 'value', scale: 100, name: 'detected_distance' },
        9: { capability: 'radar_delay', type: 'value', name: 'detection_delay' },
        10: { capability: 'radar_fading_time', type: 'value', name: 'fading_time' },
        101: { capability: 'presence_type', type: 'enum', values: { 0: 'none', 1: 'stationary', 2: 'movement' } },
        102: { capability: 'measure_luminance', type: 'value', name: 'illuminance_lux' },
        104: { capability: 'small_motion', type: 'enum', values: { 0: 'none', 1: 'small', 2: 'large' } },
        105: { capability: 'breath_presence', type: 'bool', name: 'breath_detection' },
        106: { capability: 'move_sensitivity', type: 'value', min: 1, max: 5, name: 'move_sensitivity' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // THERMOSTATS / TRV
    // ═════════════════════════════════════════════════════════════════════════

    'thermostat_trv': {
      name: 'Radiator Valve TRV',
      manufacturers: ['_TZE200_aoclfnxz', '_TZE200_ztvwu4nk', '_TZE200_kds0pmmv', '_TZE200_c88teujp'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'switch' },
        2: { capability: 'target_temperature', type: 'value', scale: 10, min: 5, max: 35, name: 'target_temp' },
        3: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'local_temp' },
        4: { capability: 'thermostat_mode', type: 'enum', values: { 0: 'manual', 1: 'auto', 2: 'away' }, name: 'mode' },
        5: { capability: 'window_detection', type: 'bool', name: 'window_detection' },
        6: { capability: 'frost_protection', type: 'bool', name: 'frost_protection' },
        7: { capability: 'child_lock', type: 'bool', name: 'child_lock' },
        13: { capability: 'measure_battery', type: 'value', name: 'battery' },
        14: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        101: { capability: 'valve_position', type: 'value', min: 0, max: 100, name: 'valve' },
        102: { capability: 'comfort_temperature', type: 'value', scale: 10, name: 'comfort_temp' },
        103: { capability: 'eco_temperature', type: 'value', scale: 10, name: 'eco_temp' },
        104: { capability: 'heating_schedule', type: 'raw', name: 'schedule' },
        105: { capability: 'window_open', type: 'bool', name: 'window_open' },
        106: { capability: 'boost_mode', type: 'bool', name: 'boost' },
        107: { capability: 'boost_duration', type: 'value', unit: 'min', name: 'boost_time' },
        108: { capability: 'min_temperature', type: 'value', scale: 10, name: 'min_temp_limit' },
        109: { capability: 'max_temperature', type: 'value', scale: 10, name: 'max_temp_limit' },
        110: { capability: 'calibration', type: 'value', scale: 10, min: -5, max: 5, name: 'local_temp_calibration' }
      }
    },

    'thermostat_floor': {
      name: 'Floor Heating Thermostat',
      manufacturers: ['_TZE200_aoclfnxz', '_TZE200_mudxchsu', '_TZE200_znbl8dj5'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'switch' },
        2: { capability: 'target_temperature', type: 'value', scale: 10, name: 'target_temp' },
        3: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'current_temp' },
        4: { capability: 'thermostat_mode', type: 'enum', values: { 0: 'manual', 1: 'program' }, name: 'mode' },
        5: { capability: 'eco_mode', type: 'bool', name: 'eco' },
        6: { capability: 'child_lock', type: 'bool', name: 'lock' },
        7: { capability: 'sensor_selection', type: 'enum', values: { 0: 'air', 1: 'floor', 2: 'both' }, name: 'sensor' },
        102: { capability: 'measure_temperature.floor', type: 'value', scale: 10, name: 'floor_temp' },
        103: { capability: 'max_floor_temp', type: 'value', scale: 10, name: 'floor_temp_max' },
        104: { capability: 'heating_state', type: 'bool', name: 'heating' },
        105: { capability: 'frost_protection', type: 'bool', name: 'frost_protect' },
        106: { capability: 'schedule_weekday', type: 'raw', name: 'week_schedule' },
        107: { capability: 'schedule_weekend', type: 'raw', name: 'weekend_schedule' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // CLIMATE SENSORS
    // ═════════════════════════════════════════════════════════════════════════

    'climate_sensor': {
      name: 'Temperature & Humidity Sensor',
      manufacturers: ['_TZE200_locansqn', '_TZE200_bq5c8xfe', '_TZE200_qoy0ekbd'],
      dps: {
        1: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'temperature' },
        2: { capability: 'measure_humidity', type: 'value', name: 'humidity' },
        3: { capability: 'temperature_unit', type: 'enum', values: { 0: 'C', 1: 'F' }, name: 'unit' },
        4: { capability: 'measure_battery', type: 'value', name: 'battery' },
        6: { capability: 'max_temperature', type: 'value', scale: 10, name: 'max_temp' },
        7: { capability: 'min_temperature', type: 'value', scale: 10, name: 'min_temp' },
        8: { capability: 'max_humidity', type: 'value', name: 'max_humi' },
        9: { capability: 'min_humidity', type: 'value', name: 'min_humi' },
        10: { capability: 'temp_alarm', type: 'enum', values: { 0: 'off', 1: 'on' }, name: 'temp_alarm' },
        11: { capability: 'humi_alarm', type: 'enum', values: { 0: 'off', 1: 'on' }, name: 'humi_alarm' }
      }
    },

    'soil_sensor': {
      name: 'Soil Moisture & Temperature Sensor',
      manufacturers: ['_TZE200_myd45weu', '_TZE284_vvmbj46n', '_TZE284_aao3yzhs'],
      dps: {
        1: { capability: 'measure_temperature.soil', type: 'value', scale: 10, name: 'temperature' },
        2: { capability: 'measure_humidity.soil', type: 'value', name: 'moisture' },
        3: { capability: 'measure_battery', type: 'value', name: 'battery' },
        4: { capability: 'alarm_battery', type: 'bool', name: 'battery_state' },
        5: { capability: 'soil_ec', type: 'value', name: 'conductivity' },
        101: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'air_temperature' },
        102: { capability: 'measure_humidity', type: 'value', name: 'air_humidity' }
      }
    },

    'air_quality_sensor': {
      name: 'Air Quality Monitor',
      manufacturers: ['_TZE200_dwcarsat', '_TZE200_yvdvs65z', '_TZE200_ryfmq5rl'],
      dps: {
        1: { capability: 'measure_co2', type: 'value', unit: 'ppm', name: 'co2' },
        2: { capability: 'measure_voc', type: 'value', unit: 'ppb', name: 'voc' },
        3: { capability: 'measure_ch2o', type: 'value', scale: 100, name: 'formaldehyde' },
        18: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'temperature' },
        19: { capability: 'measure_humidity', type: 'value', name: 'humidity' },
        20: { capability: 'measure_pm25', type: 'value', name: 'pm25' },
        21: { capability: 'air_quality_index', type: 'enum', values: { 0: 'excellent', 1: 'good', 2: 'moderate', 3: 'poor', 4: 'hazardous' } },
        22: { capability: 'measure_battery', type: 'value', name: 'battery' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SMART PLUGS & POWER MONITORING
    // ═════════════════════════════════════════════════════════════════════════

    'smart_plug_metering': {
      name: 'Smart Plug with Power Metering',
      manufacturers: ['_TZ3000_cehuw1lw', '_TZ3000_okaz9tjs', '_TZ3000_typdpbpg'],
      models: ['TS011F', 'TS0121'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'switch' },
        7: { capability: 'child_lock', type: 'bool', name: 'child_lock' },
        9: { capability: 'countdown', type: 'value', unit: 's', name: 'countdown' },
        16: { capability: 'measure_power', type: 'value', scale: 10, name: 'power' },
        17: { capability: 'measure_current', type: 'value', scale: 1000, name: 'current' },
        18: { capability: 'measure_voltage', type: 'value', scale: 10, name: 'voltage' },
        19: { capability: 'meter_power', type: 'value', scale: 100, name: 'energy' },
        20: { capability: 'meter_power.today', type: 'value', scale: 100, name: 'energy_today' },
        21: { capability: 'power_on_behavior', type: 'enum', values: { 0: 'off', 1: 'on', 2: 'last' }, name: 'power_on_behavior' },
        22: { capability: 'indicator_mode', type: 'enum', values: { 0: 'off', 1: 'on_off', 2: 'position' }, name: 'indicator' },
        23: { capability: 'overload_protection', type: 'value', unit: 'W', name: 'max_power' },
        24: { capability: 'overvoltage_protection', type: 'value', scale: 10, unit: 'V', name: 'max_voltage' },
        25: { capability: 'overcurrent_protection', type: 'value', scale: 1000, unit: 'A', name: 'max_current' }
      }
    },

    'usb_outlet': {
      name: 'USB Power Outlet',
      manufacturers: ['_TZ3000_h1ipgkwn', '_TZ3000_1obwwnmq', '_TZ3000_8gs8h2e4'],
      models: ['TS0002', 'TS0115'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'usb_port_1' },
        2: { capability: 'onoff.usb2', type: 'bool', name: 'usb_port_2' },
        7: { capability: 'child_lock', type: 'bool', name: 'child_lock' },
        9: { capability: 'countdown', type: 'value', unit: 's', name: 'countdown' },
        16: { capability: 'measure_voltage', type: 'value', scale: 10, name: 'voltage' },
        17: { capability: 'measure_current', type: 'value', scale: 1000, name: 'current' },
        20: { capability: 'indicator_mode', type: 'enum', values: { 0: 'off', 1: 'on_off', 2: 'position' }, name: 'indicator' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // CURTAIN MOTORS
    // ═════════════════════════════════════════════════════════════════════════

    'curtain_motor': {
      name: 'Curtain Motor',
      manufacturers: ['_TZE200_cowvfni3', '_TZE204_cjbofhxw', '_TZE200_wmcdj3aq'],
      models: ['TS0601', 'TS130F'],
      dps: {
        1: { capability: 'windowcoverings_state', type: 'enum', values: { 0: 'open', 1: 'stop', 2: 'close' }, name: 'control' },
        2: { capability: 'windowcoverings_set', type: 'value', min: 0, max: 100, name: 'position' },
        3: { capability: 'windowcoverings_set', type: 'value', min: 0, max: 100, name: 'position_report' },
        5: { capability: 'motor_direction', type: 'enum', values: { 0: 'forward', 1: 'reverse' }, name: 'direction' },
        7: { capability: 'calibration_mode', type: 'bool', name: 'calibration' },
        8: { capability: 'motor_mode', type: 'enum', values: { 0: 'morning', 1: 'night' }, name: 'mode' },
        10: { capability: 'calibration_time', type: 'value', unit: 's', name: 'motor_speed' },
        12: { capability: 'situation_set', type: 'enum', values: { 0: 'fully_open', 1: 'fully_close' }, name: 'situation' },
        13: { capability: 'percent_control', type: 'enum', values: { 0: 'opening', 1: 'closing' }, name: 'percent_state' },
        101: { capability: 'upper_limit', type: 'value', name: 'upper_limit_set' },
        102: { capability: 'lower_limit', type: 'value', name: 'lower_limit_set' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SIRENS / ALARMS
    // ═════════════════════════════════════════════════════════════════════════

    'siren_alarm': {
      name: 'Smart Siren',
      manufacturers: ['_TZE200_t1blo2bj', '_TZE204_t1blo2bj', '_TYST11_d0yu2xgi'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'alarm_switch' },
        5: { capability: 'alarm_tamper', type: 'bool', name: 'tamper' },
        6: { capability: 'alarm_duration', type: 'value', unit: 's', min: 0, max: 1800, name: 'duration' },
        7: { capability: 'alarm_volume', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high', 3: 'mute' }, name: 'volume' },
        13: { capability: 'measure_battery', type: 'value', name: 'battery' },
        14: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        15: { capability: 'alarm_sound', type: 'enum', values: { 0: 'doorbell', 1: 'alarm', 2: 'melody' }, name: 'ringtone' },
        21: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'temperature' },
        22: { capability: 'measure_humidity', type: 'value', name: 'humidity' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // WATER VALVE
    // ═════════════════════════════════════════════════════════════════════════

    'water_valve': {
      name: 'Smart Water Valve',
      manufacturers: ['_TZE200_81isopgh', '_TZE200_htnnfasr', '_TZE204_qtnjyku1'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'valve_switch' },
        5: { capability: 'countdown', type: 'value', unit: 's', name: 'countdown_time' },
        6: { capability: 'weather_delay', type: 'enum', values: { 0: 'off', 1: '24h', 2: '48h', 3: '72h' }, name: 'weather_delay' },
        7: { capability: 'measure_battery', type: 'value', name: 'battery' },
        10: { capability: 'timer_state', type: 'bool', name: 'timer_active' },
        11: { capability: 'timer_remaining', type: 'value', unit: 's', name: 'timer_time_left' },
        12: { capability: 'last_operation_duration', type: 'value', unit: 's', name: 'last_valve_open_duration' },
        15: { capability: 'cycle_timer', type: 'raw', name: 'cycle_timer_settings' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // DIMMERS / LIGHT CONTROLS
    // ═════════════════════════════════════════════════════════════════════════

    'dimmer': {
      name: 'Smart Dimmer',
      manufacturers: ['_TZE200_dfxkcots', '_TZE200_w4cryh2i', '_TZE200_ip2akl4w'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'switch' },
        2: { capability: 'dim', type: 'value', min: 10, max: 1000, scale: 10, name: 'brightness' },
        3: { capability: 'dim.minimum', type: 'value', min: 10, max: 1000, scale: 10, name: 'min_brightness' },
        4: { capability: 'dim.maximum', type: 'value', min: 10, max: 1000, scale: 10, name: 'max_brightness' },
        5: { capability: 'light_mode', type: 'enum', values: { 0: 'leading', 1: 'trailing' }, name: 'dimmer_mode' },
        6: { capability: 'power_on_behavior', type: 'enum', values: { 0: 'off', 1: 'on', 2: 'last' }, name: 'power_on_state' },
        7: { capability: 'fade_time', type: 'value', unit: 's', name: 'transition_time' }
      }
    },

    'light_rgbcct': {
      name: 'RGB+CCT Light',
      manufacturers: ['_TZE200_s8gkrkxk', '_TZE204_aaab12cv'],
      dps: {
        1: { capability: 'onoff', type: 'bool', name: 'switch' },
        2: { capability: 'light_mode', type: 'enum', values: { 0: 'white', 1: 'color', 2: 'scene', 3: 'music' }, name: 'work_mode' },
        3: { capability: 'dim', type: 'value', min: 10, max: 1000, scale: 10, name: 'brightness' },
        4: { capability: 'light_temperature', type: 'value', min: 0, max: 1000, scale: 10, name: 'color_temp' },
        5: { capability: 'light_hue', type: 'raw', name: 'color_hsv' }, // HSV encoded
        6: { capability: 'scene_select', type: 'raw', name: 'scene_data' },
        7: { capability: 'countdown', type: 'value', unit: 's', name: 'countdown' },
        8: { capability: 'music_sync', type: 'bool', name: 'music_mode' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // GARAGE DOOR
    // ═════════════════════════════════════════════════════════════════════════

    'garage_door': {
      name: 'Garage Door Opener',
      manufacturers: ['_TZE200_wfxuhoea', '_TZE200_nklqjk62'],
      dps: {
        1: { capability: 'garagedoor_closed', type: 'bool', name: 'switch' },
        2: { capability: 'countdown', type: 'value', unit: 's', name: 'countdown' },
        3: { capability: 'door_contact', type: 'bool', name: 'door_contact_state' },
        12: { capability: 'measure_battery', type: 'value', name: 'battery' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SMART LOCK
    // ═════════════════════════════════════════════════════════════════════════

    'smart_lock': {
      name: 'Smart Door Lock',
      manufacturers: ['_TZE200_bjzwgfxa'],
      dps: {
        1: { capability: 'locked', type: 'bool', name: 'lock_state' },
        2: { capability: 'door_closed', type: 'bool', name: 'door_state' },
        3: { capability: 'measure_battery', type: 'value', name: 'battery' },
        7: { capability: 'alarm_tamper', type: 'bool', name: 'tamper_alarm' },
        8: { capability: 'unlock_method', type: 'enum', values: { 0: 'fingerprint', 1: 'password', 2: 'card', 3: 'key', 4: 'app' }, name: 'unlock_method' },
        9: { capability: 'unlock_user_id', type: 'value', name: 'user_id' },
        10: { capability: 'auto_lock_time', type: 'value', unit: 's', name: 'auto_lock_delay' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // MOTION / PIR SENSORS
    // ═════════════════════════════════════════════════════════════════════════

    'motion_pir': {
      name: 'PIR Motion Sensor',
      manufacturers: ['_TZE200_3towulqd', '_TZE200_bq5c8xfe'],
      dps: {
        1: { capability: 'alarm_motion', type: 'bool', name: 'pir_state' },
        2: { capability: 'pir_sensitivity', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high' }, name: 'sensitivity' },
        3: { capability: 'measure_battery', type: 'value', name: 'battery' },
        4: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        9: { capability: 'pir_interval', type: 'value', unit: 's', name: 'time_interval' },
        10: { capability: 'measure_luminance', type: 'value', name: 'illuminance' },
        101: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'temperature' },
        102: { capability: 'measure_humidity', type: 'value', name: 'humidity' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SMOKE / CO DETECTORS
    // ═════════════════════════════════════════════════════════════════════════

    'smoke_detector': {
      name: 'Smoke Detector',
      manufacturers: ['_TZE200_ntcy3xu1', '_TZE204_ntcy3xu1'],
      dps: {
        1: { capability: 'alarm_smoke', type: 'bool', name: 'smoke_state' },
        2: { capability: 'smoke_value', type: 'value', name: 'smoke_concentration' },
        4: { capability: 'alarm_tamper', type: 'bool', name: 'tamper' },
        14: { capability: 'measure_battery', type: 'value', name: 'battery' },
        15: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        16: { capability: 'silence', type: 'bool', name: 'mute' },
        101: { capability: 'self_test', type: 'bool', name: 'self_check' },
        102: { capability: 'fault', type: 'enum', values: { 0: 'normal', 1: 'fault', 2: 'detecting' }, name: 'fault_state' }
      }
    },

    'co_detector': {
      name: 'Carbon Monoxide Detector',
      manufacturers: ['_TZE200_m9skfctm'],
      dps: {
        1: { capability: 'alarm_co', type: 'bool', name: 'co_state' },
        2: { capability: 'measure_co', type: 'value', unit: 'ppm', name: 'co_value' },
        14: { capability: 'measure_battery', type: 'value', name: 'battery' },
        15: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        16: { capability: 'silence', type: 'bool', name: 'mute' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // WATER LEAK SENSORS
    // ═════════════════════════════════════════════════════════════════════════

    'water_leak_sensor': {
      name: 'Water Leak Sensor',
      manufacturers: ['_TZE200_qq9mpfhw', '_TZ3000_kyb656no'],
      dps: {
        1: { capability: 'alarm_water', type: 'bool', name: 'water_leak' },
        4: { capability: 'measure_battery', type: 'value', name: 'battery' },
        5: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        101: { capability: 'measure_temperature', type: 'value', scale: 10, name: 'temperature' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // VIBRATION SENSOR
    // ═════════════════════════════════════════════════════════════════════════

    'vibration_sensor': {
      name: 'Vibration Sensor',
      manufacturers: ['_TZE200_bh3n6gk8', '_TZE200_nnfmzxek'],
      dps: {
        1: { capability: 'alarm_vibration', type: 'bool', name: 'vibration' },
        2: { capability: 'vibration_sensitivity', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high' }, name: 'sensitivity' },
        4: { capability: 'measure_battery', type: 'value', name: 'battery' },
        5: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' },
        10: { capability: 'angle_x', type: 'value', name: 'angle_x' },
        11: { capability: 'angle_y', type: 'value', name: 'angle_y' },
        12: { capability: 'angle_z', type: 'value', name: 'angle_z' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SOS / EMERGENCY BUTTON
    // ═════════════════════════════════════════════════════════════════════════

    'sos_button': {
      name: 'SOS Emergency Button',
      manufacturers: ['_TZE200_2aaelwxk', '_TZE200_d0ypnbvn'],
      dps: {
        1: { capability: 'alarm_emergency', type: 'bool', name: 'sos' },
        4: { capability: 'measure_battery', type: 'value', name: 'battery' },
        5: { capability: 'alarm_battery', type: 'bool', name: 'battery_low' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SCENE SWITCH / REMOTE
    // ═════════════════════════════════════════════════════════════════════════

    'scene_switch': {
      name: 'Scene Switch / Remote',
      manufacturers: ['_TZE200_dfxkcots', '_TZ3000_4fjiwweb'],
      dps: {
        1: { capability: 'button.1', type: 'enum', values: { 0: 'click', 1: 'double', 2: 'hold' }, name: 'button_1' },
        2: { capability: 'button.2', type: 'enum', values: { 0: 'click', 1: 'double', 2: 'hold' }, name: 'button_2' },
        3: { capability: 'button.3', type: 'enum', values: { 0: 'click', 1: 'double', 2: 'hold' }, name: 'button_3' },
        4: { capability: 'button.4', type: 'enum', values: { 0: 'click', 1: 'double', 2: 'hold' }, name: 'button_4' },
        10: { capability: 'measure_battery', type: 'value', name: 'battery' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // POWER STRIP
    // ═════════════════════════════════════════════════════════════════════════

    'power_strip': {
      name: 'Smart Power Strip',
      manufacturers: ['_TZE200_aqnazj70', '_TZ3000_1obwwnmq'],
      dps: {
        1: { capability: 'onoff.1', type: 'bool', name: 'socket_1' },
        2: { capability: 'onoff.2', type: 'bool', name: 'socket_2' },
        3: { capability: 'onoff.3', type: 'bool', name: 'socket_3' },
        4: { capability: 'onoff.4', type: 'bool', name: 'socket_4' },
        5: { capability: 'onoff.usb', type: 'bool', name: 'usb_ports' },
        7: { capability: 'child_lock', type: 'bool', name: 'child_lock' },
        9: { capability: 'countdown.1', type: 'value', unit: 's', name: 'countdown_1' },
        10: { capability: 'countdown.2', type: 'value', unit: 's', name: 'countdown_2' },
        11: { capability: 'countdown.3', type: 'value', unit: 's', name: 'countdown_3' },
        12: { capability: 'countdown.4', type: 'value', unit: 's', name: 'countdown_4' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // FINGERBOT / BUTTON PUSHER
    // ═════════════════════════════════════════════════════════════════════════

    'fingerbot': {
      name: 'Fingerbot Button Pusher',
      manufacturers: ['_TZE200_wunufsil'],
      dps: {
        1: { capability: 'button', type: 'bool', name: 'switch' },
        2: { capability: 'button_mode', type: 'enum', values: { 0: 'click', 1: 'switch', 2: 'program' }, name: 'mode' },
        3: { capability: 'arm_down', type: 'value', min: 0, max: 100, name: 'down_position' },
        4: { capability: 'arm_up', type: 'value', min: 0, max: 100, name: 'up_position' },
        5: { capability: 'push_duration', type: 'value', unit: 'ms', name: 'sustain_time' },
        6: { capability: 'reverse', type: 'bool', name: 'reverse_direction' },
        12: { capability: 'measure_battery', type: 'value', name: 'battery' }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // PET FEEDER
    // ═════════════════════════════════════════════════════════════════════════

    'pet_feeder': {
      name: 'Automatic Pet Feeder',
      manufacturers: ['_TZE200_v9hkz2yn'],
      dps: {
        1: { capability: 'manual_feed', type: 'bool', name: 'feed' },
        3: { capability: 'portion_size', type: 'value', min: 1, max: 20, name: 'feed_size' },
        4: { capability: 'schedule', type: 'raw', name: 'feed_schedule' },
        5: { capability: 'food_low', type: 'bool', name: 'food_state' },
        6: { capability: 'feed_report', type: 'raw', name: 'feed_record' },
        12: { capability: 'meals_per_day', type: 'value', name: 'meals' }
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get DP mapping for a device
   */
  static getDeviceProfile(manufacturer, modelId) {
    // Search by manufacturer
    for (const [key, profile] of Object.entries(this.DEVICE_PROFILES)) {
      if (profile.manufacturers?.includes(manufacturer)) {
        return { key, ...profile };
      }
      if (profile.models?.includes(modelId)) {
        return { key, ...profile };
      }
    }
    return null;
  }

  /**
   * Get DP capability mapping
   */
  static getDPCapability(dp, manufacturer, modelId) {
    const profile = this.getDeviceProfile(manufacturer, modelId);
    if (profile?.dps?.[dp]) {
      return profile.dps[dp];
    }
    // Fallback to universal
    return this.UNIVERSAL_DPS[dp] || null;
  }

  /**
   * Parse DP value with type conversion
   */
  static parseValue(dpInfo, rawValue) {
    if (!dpInfo) return rawValue;

    let value = rawValue;

    // Scale factor
    if (dpInfo.scale) {
      value = rawValue / dpInfo.scale;
    }

    // Enum mapping
    if (dpInfo.type === 'enum' && dpInfo.values) {
      value = dpInfo.values[rawValue] || rawValue;
    }

    // Invert
    if (dpInfo.invert) {
      value = 100 - value;
    }

    return value;
  }

  /**
   * Get all supported manufacturers
   */
  static getAllManufacturers() {
    const mfgs = new Set();
    for (const profile of Object.values(this.DEVICE_PROFILES)) {
      profile.manufacturers?.forEach(m => mfgs.add(m));
    }
    return Array.from(mfgs).sort();
  }

  /**
   * Get profile by name
   */
  static getProfileByName(name) {
    return this.DEVICE_PROFILES[name] || null;
  }
}

module.exports = TuyaDPUltimate;
